import { app, errorHandler } from "mu";
import {
  getContainedLocations,
  getLocationDetails,
  getLocationUrisForUuids,
  getMatchingLocation,
  insertLocationResource,
  linkContainedLocations,
} from "./lib/queries";
import {
  getSortedLabels,
  LOCATION_LEVELS,
  requiresAggregateLabel,
} from "./lib/util";

app.get("/", function (_req, res) {
  res.send("Hello from scope-of-operation-service!");
});

app.get("/label-for-scope/:locationUuid", async function (req, res) {
  try {
    const locationUuid = req.params.locationUuid;
    const location = await getLocationForUuid(locationUuid);

    if (!location) {
      return res.status(404).send();
    }

    let labelForScope;
    if (requiresAggregateLabel(location)) {
      const containedlocations = await getContainedLocations(location.uri);

      labelForScope =
        containedlocations.length > 0
          ? getSortedLabels(...containedlocations)
          : location.label;
    } else {
      labelForScope = location.label;
    }

    const statusCode = labelForScope ? 200 : 404;
    return res.status(statusCode).json(labelForScope);
  } catch (e) {
    console.log("Something went wrong while retrieving the display label", e);
    return res.status(500).send();
  }
});

app.get("/locations-in-scope/:locationUuid", async function (req, res) {
  try {
    const locationUuid = req.params.locationUuid;
    const location = await getLocationForUuid(locationUuid);

    if (!location) {
      return res.status(404).send();
    }

    let locations = [];
    // TODO: Should also consider districts, but they are ignored in the MVP
    if (location.level === LOCATION_LEVELS.municipality) {
      locations.push(location.uuid);
    } else {
      const containedLocations = await getContainedLocations(location.uri);
      const containedLocationUuids = containedLocations?.flatMap(
        (location) => location.uuid,
      );
      locations.push(...containedLocationUuids);
    }

    const statusCode = locations.length > 0 ? 200 : 404;
    return res.status(statusCode).json(locations);
  } catch (e) {
    console.log("Something went wrong while retrieving the locations", e);
    return res.status(500).send();
  }
});

app.post("/scope-for-locations", async function (req, res) {
  try {
    const locationUuids = req.body?.data?.locations;
    if (!locationUuids?.length || locationUuids.length === 0) {
      throw new Error("No UUIDs provided in the request body.");
    }

    const locationDetails = await transformUuidsToLocationDetails(
      ...locationUuids,
    );
    if (locationDetails.length != locationUuids.length) {
      throw new Error("Not all provided UUIDs identify a known location.");
    }

    const scope = await getContainingLocation(...locationDetails);

    return res.status(201).json(scope.uuid);
  } catch (e) {
    console.log("Something went wrong while retrieving the scope", e);
    return res.status(500).send();
  }
});

async function getLocationForUuid(uuid) {
  const location = await transformUuidsToLocationDetails(uuid);

  return location && location.length > 0 ? location[0] : null;
}

/**
 * Retrieve the details for a the location resources with the given uuids.
 * @param {...string} uuids - The UUIDs for which to retrieve the location
 *    details.
 * @returns {Promise<import("./lib/queries").LocationDetails[] | null>} The
 *    details for each location resource for a UUID was provided. Null if none
 *    of the provided UUIDs identify a location resource or no UUID was
 *    provided.
 */
async function transformUuidsToLocationDetails(...uuids) {
  if (uuids.length) {
    // NOTE (03/06/2025): In the data different formats of URIs are use for
    // location resources. Some location have a URI of the form
    // `http://data.lblod.info/id/bestuurseenheden/UUID` instead of
    // `http://data.lblod.info/id/werkingsgebieden/UUID`. Therefore, we cannot
    // simply concatenate a prefix to the UUID to obtain the URI.
    const uris = await getLocationUrisForUuids(...uuids);
    return await getLocationDetails(...uris);
  } else {
    return null;
  }
}

/**
 * Retrieve the UUID of the location that exactly matches the provided contained
 * locations.  If necessary, a new location resource will be created.
 * @param {...import("./lib/queries").LocationDetails} containedLocations - The
 *     UUIDs of the locations that should be contained.
 * @returns {Promise<import("./lib/queries").LocationDetails>} The details of
 *     the location that exactly matches the specified locations.
 */
async function getContainingLocation(...containedLocations) {
  const containingLocation =
    containedLocations.length === 1
      ? containedLocations[0]
      : await getMatchingLocation(...containedLocations);

  if (containingLocation) {
    return containingLocation;
  } else {
    return await createNewLocation(...containedLocations);
  }
}

/**
 * Create a new location resource that contains the provided locations.
 * @param {...import("./lib/queries").LocationDetails} containedLocations - The
 *     locations that should be contained within the newly created location.
 * @returns {Promise<import("./lib/queries").LocationDetails>} The details of
 *     the newly created location resource.
 */
async function createNewLocation(...containedLocations) {
  const label = getSortedLabels(...containedLocations);

  // TODO: determine level, requires input from business
  const level = "TODO";

  const newLocation = await insertLocationResource(label, level);

  await linkContainedLocations(
    newLocation.uri,
    ...containedLocations.flatMap((location) => location.uri),
  );

  return newLocation;
}

app.use(errorHandler);

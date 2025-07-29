import { app, errorHandler } from "mu";
import {
  getContainedLocations,
  getLocationDetails,
  getLocationUrisForUuids,
  getMatchingLocationCandidates,
  insertLocationResource,
  linkContainedLocations,
  listContainedLocations,
} from "./lib/queries";
import {
  containSameElements,
  getSortedLabels,
  isUndividableLocation,
  LOCATION_LEVELS,
  requiresAggregateLabel,
} from "./lib/util";

/** @import { LocationDetails } from "./lib/queries"; */

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
    if (isUndividableLocation(location)) {
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

    let scope = await getContainingLocation(...locationDetails);

    if (scope) {
      return res.status(200).json(scope.uuid);
    } else {
      scope = await createNewLocation(...locationDetails);
      return res.status(201).json(scope.uuid);
    }
  } catch (e) {
    console.log("Something went wrong while retrieving the scope", e);
    return res.status(500).send();
  }
});

/**
 * Get the location details for the location resource with the given UUID.
 * @param {string} uuid - The UUID to search for.
 * @returns {Promise<LocationDetails | undefined>} The details for the
 *     identified location resource, undefined if the provided UUID does not
 *     identify a location resource.
 */
async function getLocationForUuid(uuid) {
  const location = await transformUuidsToLocationDetails(uuid);

  return location && location.length > 0 ? location[0] : undefined;
}

/**
 * Retrieve the details for a the location resources with the given uuids.
 * @param {...string} uuids - The UUIDs for which to retrieve the location
 *    details.
 * @returns {Promise<LocationDetails[] | undefined>} The details for each
 *    location resource for a UUID was provided. Undefined if no UUID was
 *    provided or none of the provided ones identify a location resource.
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
 * @param {...LocationDetails} containedLocations - The UUIDs of the locations
 *     that should be contained.
 * @returns {Promise<LocationDetails | null>} The details of the location that
 *     exactly matches the specified locations.
 */
async function getContainingLocation(...containedLocations) {
  if (containedLocations.length === 1) {
    return containedLocations[0];
  }

  const locationCandidates = await getMatchingLocationCandidates(
    containedLocations.length,
  );

  if (locationCandidates) {
    const containedLocationUris = containedLocations.flatMap((loc) => loc.uri);

    for (const candidate of locationCandidates) {
      const actuallyContainedLocations =
        await listContainedLocations(candidate);

      if (
        containSameElements(containedLocationUris, actuallyContainedLocations)
      ) {
        return (await getLocationDetails(candidate))[0];
      }
    }
  }
}

/**
 * Create a new location resource that contains the provided locations.
 * @param {...LocationDetails} containedLocations - The locations that should be
 *     contained within the newly created location.
 * @returns {Promise<LocationDetails>} The details of the newly created location
 *     resource.
 */
async function createNewLocation(...containedLocations) {
  const label = getSortedLabels(...containedLocations);

  const newLocation = await insertLocationResource(
    label,
    LOCATION_LEVELS.composedScope,
  );

  await linkContainedLocations(
    newLocation.uri,
    ...containedLocations.flatMap((location) => location.uri),
  );

  return newLocation;
}

app.use(errorHandler);

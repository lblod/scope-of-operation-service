import { app, errorHandler } from "mu";
import {
  getContainedLocations,
  getLocationDetails,
  getLocationUrisForUuids,
  getMatchingLocation,
  getOrganizationDetails,
  insertLocationResource,
  linkContainedLocations,
  linkOrganizationToLocation,
} from "./lib/queries";
import {
  getSortedLabels,
  LOCATION_LEVELS,
  requiresAggregateLabel,
} from "./lib/util";

app.get("/", function (req, res) {
  res.send("Hello from scope-of-operation-service!");
});

app.get("/label-for-scope/:organizationUuid", async function (req, res) {
  try {
    const organizationUuid = req.params.organizationUuid;
    const organization = await getOrganizationDetails(organizationUuid);

    let scopeLabel;
    if (organization && organization.location) {
      const location = (await getLocationDetails(organization.location))[0];

      if (requiresAggregateLabel(location)) {
        const containedlocations = await getContainedLocations(location.uri);

        scopeLabel =
          containedlocations.length > 0
            ? getSortedLabels(...containedlocations)
            : location.label;
      } else {
        scopeLabel = location.label;
      }
    }

    const statusCode = scopeLabel ? 200 : 404;
    return res.status(statusCode).json(scopeLabel);
  } catch (e) {
    console.log("Something went wrong while retrieving the display label", e);
    return res.status(500).send();
  }
});

app.get("/locations-in-scope/:organizationUuid", async function (req, res) {
  try {
    const organizationUuid = req.params.organizationUuid;
    const organization = await getOrganizationDetails(organizationUuid);

    let locations = [];
    if (organization && organization.location) {
      const location = (await getLocationDetails(organization.location))[0];

      // TODO: Should also consider districts, but they are ignored in the MVP
      if (location.level === LOCATION_LEVELS.municipality) {
        locations.push(location.uuid);
      } else {
        const containedLocations = await getContainedLocations(
          organization.location,
        );
        const containedLocationUuids = containedLocations?.flatMap(
          (location) => location.uuid,
        );
        locations.push(...containedLocationUuids);
      }
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

app.post(
  "/set-locations-as-scope/:organizationUuid",
  async function (req, res) {
    try {
      const organizationUuid = req.params.organizationUuid;
      const organization = await getOrganizationDetails(organizationUuid);

      // NOTE (09/05/2025): Assume locations is a list of UUIDS in the body
      // {data: {locations: ["UUID1", "UUID2", ...]}}
      const locationUuids = req.body.data.locations;
      if (!locationUuids.length) {
        throw new Error("No UUIDs provided in the request body.");
      }

      const locationDetails = await transformUuidsToLocationDetails(
        ...locationUuids,
      );
      if (locationDetails.length != locationUuids.length) {
        throw new Error("Not all provided UUIDs identify a known location.");
      }

      if (organization) {
        const newLocation = await getContainingLocation(...locationDetails);

        await linkOrganizationToLocation(
          organization.uri,
          newLocation.uri,
          organization.location,
        );

        return res.status(201).json(newLocation.uuid);
      }
    } catch (e) {
      console.log("Something went wrong while calling /create-location", e);
      return res.status(500).send();
    }
  },
);

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

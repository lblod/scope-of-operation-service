import { app, errorHandler } from "mu";
import {
  getContainedLocations,
  getLocationDetails,
  getLocationUrisForUuids,
} from "./lib/queries";
import {
  getSortedLabels,
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
  }
}

app.use(errorHandler);

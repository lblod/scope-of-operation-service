import { sparqlEscapeString, sparqlEscapeUri, uuid, update, query } from "mu";
import { updateSudo } from "@lblod/mu-auth-sudo";
import { locationGraph, PREFIX } from "../config";

/**
 * @typedef {object} OrganizationDetails
 * @property {string} uri - The URI of the organization resource.
 * @property {string} uuid - The UUID of the organization resource.
 * @property {string} location - The URI of the organization's current location,
 *     if any.
 */

/**
 * @typedef {object} LocationDetails
 * @property {string} uri - The URI of the location resource.
 * @property {string} uuid - The UUID of the location resource.
 * @property {string} label - The label of the location resource.
 * @property {string} level - The level of the location resource.
 */

/**
 * Retrieve the details for the organization with the given UUID.
 * @param {string} organizationUuid - The UUID of the resource to query for.
 * @returns {Promise<OrganizationDetails | null>} The details for the
 *     organization retrieved from the triplestore, null if no resource was
 *     found with the provided UUID.
 */
export async function getOrganizationDetails(organizationUuid) {
  const select = `
    ${PREFIX.mu}
    ${PREFIX.besluit}

    SELECT DISTINCT ?organization ?location
    WHERE {
      ?organization mu:uuid ${sparqlEscapeString(organizationUuid)} .
      OPTIONAL {
        ?organization besluit:werkingsgebied ?location .
      }
    } LIMIT 1
  `;

  const result = await query(select);

  if (result.results.bindings.length) {
    return {
      uri: result.results.bindings[0].organization.value,
      uuid: organizationUuid,
      location: result.results.bindings[0].location?.value,
    };
  } else {
    console.log(
      `Details not found for organization with UUID ${organizationUuid}.`,
    );
    return null;
  }
}

/**
 * Retrieve the locations that are within the provided location.
 * @param {string} location - The URI of the containing location.
 * @returns {Promise<LocationDetails[] | null>} The details of all locations
 *     that are within the provided one.
 */
export async function getContainedLocations(location) {
  const select = `
    ${PREFIX.prov}
    ${PREFIX.mu}
    ${PREFIX.geo}
    ${PREFIX.rdfs}
    ${PREFIX.ext}

    SELECT DISTINCT ?uri ?uuid ?label ?level
    WHERE {
    GRAPH ${sparqlEscapeUri(locationGraph)} {
        ?uri a prov:Location ;
             geo:sfWithin ${sparqlEscapeUri(location)} ;
             mu:uuid ?uuid ;
             rdfs:label ?label ;
             ext:werkingsgebiedNiveau ?level .
      }
    }
  `;

  const result = await query(select);

  if (result.results.bindings.length) {
    return result.results.bindings.flatMap((binding) =>
      bindingToLocationObject(binding),
    );
  } else {
    console.log(`No locations found within ${location}`);
    return null;
  }
}

/**
 * Retrieve the details for the provided location resources.
 * @param {string[]} locations - The URIs of the required resources.
 * @returns {Promise<LocationDetails[] | null>} The details for each found
 *    location resource. Null if no URIs were provided or none of the provided
 *    URIs identify a location resource.
 */
export async function getLocationDetails(...locations) {
  const uriValues = locations.flatMap((uri) => sparqlEscapeUri(uri)).join("\n");

  const select = `
      ${PREFIX.prov}
      ${PREFIX.mu}
      ${PREFIX.ext}
      ${PREFIX.rdfs}

      SELECT DISTINCT ?uri ?uuid ?label ?level
      WHERE {
        GRAPH ${sparqlEscapeUri(locationGraph)} {
          ?uri a prov:Location ;
               mu:uuid ?uuid ;
               rdfs:label ?label ;
               ext:werkingsgebiedNiveau ?level .

          VALUES ?uri {
            ${uriValues}
          }
        }
      }
    `;

  const result = await query(select);

  if (result.results.bindings.length) {
    return result.results.bindings.flatMap((binding) =>
      bindingToLocationObject(binding),
    );
  } else {
    console.log("No location resources found with the provided UUIDs");
    return null;
  }
}

function bindingToLocationObject(binding) {
  return {
    uri: binding.uri.value,
    uuid: binding.uuid.value,
    label: binding.label.value,
    level: binding.level.value,
  };
}

/**
 * Find the URIs for the locations resources with the given UUIDs. Any UUID for
 * which no corresponding location resource is found are ignored.
 * @param {string[]} - The UUIDs to transform to URIs.
 * @returns {Promise<string[] | null>} An array containing the URIs that
 *     correspond to the provided UUIDs.
 */
export async function getLocationUrisForUuids(...locations) {
  const uuidValues = locations
    .flatMap((uuid) => sparqlEscapeString(uuid))
    .join("\n");

  const select = `
      ${PREFIX.prov}
      ${PREFIX.mu}

      SELECT DISTINCT ?location
      WHERE {
        GRAPH ${sparqlEscapeUri(locationGraph)} {
          ?location a prov:Location ;
                    mu:uuid ?uuid .
          VALUES ?uuid {
            ${uuidValues}
          }
        }
      }
    `;

  const result = await query(select);

  if (result.results.bindings.length) {
    return result.results.bindings.flatMap((binding) => binding.location.value);
  } else {
    console.log("No location resources found for the provided UUIDs.");
    return null;
  }
}

/**
 * Retrieve the location matching containing the specified locations.
 * @param {...LocationDetails} locations - The locations to contain.
 * @returns {Promise<LocationDetails | null>} The details of the location
 *     containing the specified locations, null if none is found.
 */
export async function getMatchingLocation(...locations) {
  const locationVariable = "?location";

  const sfWithinTriples = locations
    .flatMap(
      (location) =>
        `${sparqlEscapeUri(location.uri)} geo:sfWithin ${locationVariable} .`,
    )
    .join("\n");

  const select = `
    ${PREFIX.prov}
    ${PREFIX.rdfs}
    ${PREFIX.ext}
    ${PREFIX.geo}
    ${PREFIX.mu}

    SELECT DISTINCT ${locationVariable} ?uuid ?label ?level
    WHERE {
      GRAPH ${sparqlEscapeUri(locationGraph)} {
        ${locationVariable} a prov:Location ;
                  mu:uuid ?uuid ;
                  rdfs:label ?label ;
                  ext:werkingsgebiedNiveau ?level .

        ${sfWithinTriples}

        {
          SELECT ${locationVariable} (COUNT(DISTINCT ?contained) AS ?noOfContained)
          WHERE {
            GRAPH ${sparqlEscapeUri(locationGraph)} {
              ?contained geo:sfWithin ${locationVariable} .
            }
          }
        }
        FILTER (?noOfContained = ${locations.length})
      }
    }
  `;

  const result = await query(select);

  if (result.results.bindings.length) {
    return bindingToLocationObject(result.results.bindings[0]);
  } else {
    console.log("No location found that contains the specified locations.");
    return null;
  }
}

/**
 * Insert a new location resource with the given label and level into the
 * specified graph.
 * @param {string} label - The value that should be inserted as label for the
 *   new location.
 * @param {string} level - The label for the level of the new location.
 * @returns {Promise<LocationDetails>} The details of the new location resource.
 */
export async function insertLocationResource(label, level) {
  const locationUuid = uuid();
  const locationUri = `http://data.lblod.info/id/werkingsgebieden/${locationUuid}`;

  const insert = `
    ${PREFIX.prov}
    ${PREFIX.mu}
    ${PREFIX.ext}
    ${PREFIX.rdfs}

    INSERT DATA {
      GRAPH ${sparqlEscapeUri(locationGraph)} {
        ${sparqlEscapeUri(locationUri)} a prov:Location ;
          mu:uuid ${sparqlEscapeString(locationUuid)} ;
          rdfs:label ${sparqlEscapeString(label)} ;
          ext:werkingsgebiedNiveau ${sparqlEscapeString(level)} .
      }
    }
  `;

  await updateSudo(insert);

  return { uri: locationUri, uuid: locationUuid, label: label, level: level };
}

/**
 * Link a given location to the locations it contains.
 * @param {string} location - The URI of the containing location.
 * @param {...string} containedLocations - The URIs of the contained locations.
 */
export async function linkContainedLocations(location, ...containedLocations) {
  const sfWithinTriples = containedLocations
    .flatMap((loc) => createSfWithinTriple(loc, location))
    .join("\n");

  const insert = `
    ${PREFIX.geo}

    INSERT DATA {
      GRAPH ${sparqlEscapeUri(locationGraph)} {
        ${sfWithinTriples}
      }
    }
  `;

  await updateSudo(insert);
}

function createSfWithinTriple(subject, object) {
  return `${sparqlEscapeUri(subject)} geo:sfWithin ${sparqlEscapeUri(object)} .`;
}

/**
 * Set the given location as the given organization's scope of operation
 * (nl. werkingsgebied). If provided, the currently set location will be removed
 * first.
 * @param {string} organization - The URI of the organization to link.
 * @param {string} newLocation - The URI of the location to set as scope.
 * @param {string} currentLocation - The URI of the current location.
 */
export async function linkOrganizationToLocation(
  organization,
  newLocation,
  currentLocation,
) {
  const deleteQuery = currentLocation
    ? `DELETE DATA {
        ${sparqlEscapeUri(organization)} besluit:werkingsgebied ${sparqlEscapeUri(currentLocation)}.
      }
      ;`
    : undefined;

  const query = `
    ${PREFIX.besluit}

    ${deleteQuery ? deleteQuery : ""}

    INSERT DATA {
      ${sparqlEscapeUri(organization)} besluit:werkingsgebied ${sparqlEscapeUri(newLocation)} .
    }
  `;

  await update(query);
}

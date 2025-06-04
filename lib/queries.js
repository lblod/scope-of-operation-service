import { sparqlEscapeString, sparqlEscapeUri, query } from "mu";
import { locationGraph, PREFIX } from "../config";

/**
 * @typedef {object} LocationDetails
 * @property {string} uri - The URI of the location resource.
 * @property {string} uuid - The UUID of the location resource.
 * @property {string} label - The label of the location resource.
 * @property {string} level - The level of the location resource.
 */

/**
 * Retrieve the locations that are within the provided location.
 * @param {string} location - The URI of the containing location.
 * @returns {Promise<LocationDetails[] | undefined>} The details of all
 *     locations that are within the provided one.
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
  }
}

/**
 * Retrieve the details for the provided location resources.
 * @param {string[]} locations - The URIs of the required resources.
 * @returns {Promise<LocationDetails[] | undefined>} The details for each found
 *    location resource. Undefined if no URIs were provided or none of the
 *    provided URIs identify a location resource.
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
  }
}

/**
 * Convert a binding resulting from a select query to a location details object.
 * This requires that the provided binding has the necessary properties,
 * otherwise an error will be thrown.
 * @param {object} binding - An object that should contain the correct
 *     properties.
 * @returns {LocationDetails} A location details object containing the
 *     corresponding values of the provided binding.
 */
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
 * @returns {Promise<string[] | undefined>} An array containing the URIs that
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
  }
}

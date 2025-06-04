import { sparqlEscapeString, sparqlEscapeUri, query } from "mu";
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

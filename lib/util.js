/** @import { LocationDetails } from "./lib/queries"; */

export const LOCATION_LEVELS = {
  district: "District",
  municipality: "Gemeente",
  referenceRegion: "Referentieregio",
  province: "Provincie",
  composedScope: "Samengesteld werkingsgebied",
};

/**
 * Check whether a location can be divided into contained lower-level locations.
 * @param {LocationDetails} location - The location that needs to be checked.
 * @returns {boolean} True if the provided location is a municipality or
 *    district that cannot be further divided, false otherwise.
 */
export function isUndividableLocation(location) {
  // NOTE (29/07/2025): In the MVP for the scope of operation functionality we
  // opted to mostly ignore district-level locations, allowing users only to
  // select municipality-level locations.  But we do include the district-level
  // locations here so that such they can be correctly displayed as scopes of
  // operation for the actual district organisations.
  return (
    location.level === LOCATION_LEVELS.municipality ||
    location.level === LOCATION_LEVELS.district
  );
}

/**
 * Check whether a location's label needs to be the aggregation of the its
 * contained locations.
 * Note, the label of a location that is created by this service is already set
 * to the aggregate of the labels of its contained locations. This label can
 * used as is, and thus for such locations it is not necessary to aggregate the
 * labels on the fly.
 * @param {LocationDetails} location - The location that needs to be checked.
 * @returns {boolean} True if the location is a province or reference region.
 */
export function requiresAggregateLabel(location) {
  return (
    location.level === LOCATION_LEVELS.referenceRegion ||
    location.level === LOCATION_LEVELS.province
  );
}

/**
 * Construct a string containing labels of the provided locations in
 * alphabetical order.
 * @param {...LocationDetails} locations - The details for at least one
 *     location.
 * @returns {string} The concatenation of all labels of the provided locations.
 */
export function getSortedLabels(...locations) {
  return locations.length
    ? locations
        .flatMap((location) => location.label)
        .sort((a, b) => a.localeCompare(b, "nl"))
        .join(", ")
    : null;
}

/**
 * Check whether two arrays contain the same elements, ignoring any difference
 * in order. This uses same-value-zero equality to compare the elements of the
 * arrays.
 * @param {any[]} left - an array
 * @param {any[]} right - another array
 * @returns {boolean} True if the provided arrays contain the same elements,
 *     false otherwise.
 */
export function containSameElements(left, right) {
  const a = left.every((e) => right.includes(e));
  const b = right.every((e) => left.includes(e));
  return a && b;
}

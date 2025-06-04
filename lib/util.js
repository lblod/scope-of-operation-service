/** @import { LocationDetails } from "./lib/queries"; */

export const LOCATION_LEVELS = {
  district: "District",
  municipality: "Gemeente",
  referenceRegion: "Referentieregio",
  province: "Provincie",
};

/**
 * Check whether a location's label needs to be the aggregation of the its
 * contained locations.
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

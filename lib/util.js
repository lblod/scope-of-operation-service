export const LOCATION_LEVELS = {
  district: "District",
  municipality: "Gemeente",
  referenceRegion: "Referentieregio",
  province: "Provincie",
};

/**
 * Check whether a location's label needs to be the aggregation of the its
 * contained locations.
 * @param {...import("./lib/queries").LocationDetails} location - The location
 *     that needs to be checked.
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

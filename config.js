export const PREFIX = {
  besluit: "PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>",
  ext: "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>",
  geo: "PREFIX geo: <http://www.opengis.net/ont/geosparql#>",
  mu: "PREFIX mu: <http://mu.semte.ch/vocabularies/core/>",
  prov: "PREFIX prov: <http://www.w3.org/ns/prov#>",
  rdfs: "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
};

// NOTE (16/06/2025): We insert new location resources to the public graph as
// this allows to keep all such resources to in a single graph. This simplifies
// the configuration of other services using this data, such as the producers,
// allows sharing location resources between modules.
export const locationGraph = "http://mu.semte.ch/graphs/public";

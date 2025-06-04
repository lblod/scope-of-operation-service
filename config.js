export const PREFIX = {
  besluit: "PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>",
  ext: "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>",
  geo: "PREFIX geo: <http://www.opengis.net/ont/geosparql#>",
  mu: "PREFIX mu: <http://mu.semte.ch/vocabularies/core/>",
  prov: "PREFIX prov: <http://www.w3.org/ns/prov#>",
  rdfs: "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
};

// TODO: Should we write these to public? The advantage is that they than all
// locations are in the same graph, and can be used be used in both worship and
// non-worship module. It does seem weird to systematically write new data to
// the public graph.
export const locationGraph = "http://mu.semte.ch/graphs/public";

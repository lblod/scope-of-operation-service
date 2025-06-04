import { app, errorHandler } from "mu";
import {
  getContainedLocations,
  getLocationDetails,
  getOrganizationDetails,
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
app.use(errorHandler);

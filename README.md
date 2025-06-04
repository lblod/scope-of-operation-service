# Manage an organization's scope of operation

This service allows to manage the scope of operation (*nl. werkingsgebied*) for organizations.

Note, this service is primarily developed to be used in the context of the [OrganizationPortal](https://github.com/lblod/app-organization-portal) application.

## Installation
Add the service in your project's `docker-compose.yml`:

```yaml
scope-of-operation:
  image: lblod/scope-of-operation-service
```

## API
### `GET /label-for-scope/:organizationUuid`
Get the label that should be displayed for the scope of operation for an organisation with the provided UUID.

#### Response
- `200 OK` The response body contains the requested label.
- `404 Not Found` No label was found.
- `500 Internal Server Error` Something went wrong, check the service logs for more details.

### `GET locations-in-scope/:organizationUuid`
Get the UUIDs of all location resources in the scope of operation for the organisation with the provided UUID.

#### Response
- `200 OK` The response body contains a list of UUIDs identifying the contained locations.
- `404 No Content` No appropriate location resources were found.
- `500 Internal Server Error` Something went wrong, check the service logs for more details.

### `POST set-locations-as-scope/:organizationUuid`
Set the scope of operation for the organization to a location resource that exactly contains the locations specified in the request body. If necessary, a new location resource will be created.

#### Body
The body of the request should contain a list of the UUIDs for the location resources to be contained.

```json
{
    data: {
        locations: ["UUID1", "UUID2", ...]
    }
}
```

#### Response
- `201 Created` The necessary links and resources were created in the triplestore. The response body contains the UUID of the location resource linked as (new) scope of operation to the organization.
- `500 Internal Server Error` Something went wrong, check the service logs for more details.

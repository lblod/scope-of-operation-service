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

### `POST scope-for-locations`
Create a location resource that contains exactly the locations specified in the body. If a suitable location resource already exists that will be reused.
-
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
- `201 Created` An appropriate resource location was created and its UUID is in the body of the response.
- `500 Internal Server Error` Something went wrong, check the service logs for more details.

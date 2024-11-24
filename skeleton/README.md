# ${{ values.system_name }} / ${{ values.component_name }}

${{ values.description }}

The full API can be found in the [OpenAPI document](./openapi.yaml).

### Examples

## Architecture
This is an AWS serverless service. It is built on top of the following AWS services:
* API Gateway
* Lambda
* DynamoDB
* Cognito (See Authentication and Authorization for more)

## Authentication and Authorization
This service is configured to use a pre-existing Cognito User Pool. Clients should obtain a JWT from the Cognito token endpoint using the client's clientId and clientSecret. Each endpoint's scope requirements are defined in the [OpenAPI document](./openapi.yaml).
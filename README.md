# Backstage AWS SAM NodeJS Template

This repository is a Backstage scaffolder template for creating a new AWS Serverless Application Model (SAM) project in Node.js and TypeScript.

It is designed to help teams generate a production-ready serverless API repository from Backstage, publish it to GitHub, and register it back into the catalog with a consistent AWS deployment structure.

## What this template creates

When used from Backstage, the template generates a new repository that includes:

- An AWS SAM project configured for Node.js and TypeScript
- An API Gateway-backed serverless CRUD API
- Lambda functions for create, read, update, and delete operations
- A DynamoDB table with a composite key design for generic item storage
- OpenAPI documentation for the generated API
- GitHub Actions workflows for validation and deployment
- Backstage catalog metadata and repository registration

## Repository layout

- `template.yaml` — the Backstage scaffolder definition
- `skeleton/` — project files copied into the generated repository
- `skeleton/base/` — base Node.js/SAM project configuration and tooling
- `skeleton/crud/` — CRUD API resource definitions and starter API docs
- `functions/` — generated Lambda function templates and starter application logic
- `pipeline/` — GitHub Actions pipeline templates for CI/CD

## Included technology

The generated project is built around standard AWS serverless and developer tooling:

- AWS SAM for infrastructure and deployment
- API Gateway for HTTP endpoints
- Lambda functions written in Node.js/TypeScript
- DynamoDB for persistence
- OpenAPI for API contract definition
- Jest, ESLint, and TypeScript for validation and development
- Yarn 4 and Node.js 24 for the project toolchain

## Typical use in Backstage

The scaffold collects metadata such as:

- component name and description
- owning group
- domain and system
- deployment environment
- target AWS account
- API hostname, path prefix, and collection name

It then:

1. fetches related catalog entities,
2. copies the base project skeleton,
3. adds the CRUD API skeleton and function templates,
4. creates the deployment pipeline files,
5. publishes the repository to GitHub, and
6. registers the generated component in Backstage.

## Generated project structure

The generated project is intentionally opinionated and provides a working starter backend with a consistent code layout. It includes:

- type-safe Lambda handlers with AWS event input parsing
- a DynamoDB item model and key helper utilities
- a sample OpenAPI definition for CRUD endpoints
- CI and deployment workflows for AWS SAM
- project metadata for Backstage service registration

This makes it a useful starting point for internal platform teams creating serverless APIs with a standard naming, deployment, and observability pattern.

## Next steps

After generating a project from this template:

- update the item schema in the generated model layer to match your business domain
- adapt the Lambda handlers for your real API behavior and validation rules
- customize the OpenAPI spec and route structure to fit your service contract
- adjust GitHub Actions and deployment parameters for your AWS environment

This template is intended as a strong starting point for serverless Node.js services that need a repeatable Backstage-driven workflow and a familiar AWS SAM structure.

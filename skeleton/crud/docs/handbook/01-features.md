# Features

## OpenAPI and API Gateway

`openapi.yaml` defines the API contract and its API Gateway integrations.
`template.yaml` includes it through `AWS::Include` in `RestApi.DefinitionBody`,
so editing it changes both the published API definition and deployed routes.
The Backstage API entity also references this file.

| Method and path | Implementation |
| --- | --- |
| `GET /health` | API Gateway mock integration; no Lambda |
| `POST ${{ values.url_path_prefix }}/${{ values.collection_name }}` | `Create${{ values.collection_name_cap }}ItemFunction` |
| `GET ${{ values.url_path_prefix }}/${{ values.collection_name }}/{id}` | `Get${{ values.collection_name_cap }}ItemFunction` |
| `PUT ${{ values.url_path_prefix }}/${{ values.collection_name }}/{id}` | `Upsert${{ values.collection_name_cap }}ItemFunction` |
| `DELETE ${{ values.url_path_prefix }}/${{ values.collection_name }}/{id}` | `Delete${{ values.collection_name_cap }}ItemFunction` |

Lambda routes use proxy integrations. The API Gateway integration method is
`POST` even for client-facing `GET`, `PUT`, and `DELETE` operations because it
invokes Lambda. A request validator enables body and parameter validation.
Response declarations describe the contract; they do not validate Lambda outputs.
The file includes CloudFormation `Ref` and `Fn::Sub` expressions, so it is a
deployment-aware definition rather than a fully resolved standalone OpenAPI file.

## Starter code and tests

Each CRUD operation has a TypeScript handler and a colocated Jest unit test in
`src/handlers/<FunctionName>/`. Shared interfaces and key helpers live in
`src/lib/${{ values.collection_name_cap }}Item.ts`, and response-body interfaces
live alongside it in `src/lib/`.

The starter model has an optional `id` and an index signature that accepts any
other field; it has no domain-specific fields. TypeScript interfaces are
compile-time types only, so the handlers do not validate request bodies at run
time beyond API Gateway's request validator. Adapt the model, OpenAPI schemas,
and tests together before exposing a real contract.

Create generates a UUID and overwrites any `id` in the request body; read
retrieves an item; delete removes an existing item. Despite its name, the upsert
handler's conditional write requires an existing item, and it rejects requests
whose body `id` differs from the path `id`.

The starter contract needs review:

- POST's request schema requires `id` even though create generates it.
- POST's response schema describes `request_id` but requires `id`; the handler
  returns `id`.
- The `ErrorResponse` schema declares `name` and `message`; handlers return
  `error` and `message`.
- GET for a missing item returns `500`, because the handler raises a plain
  `Error` rather than a client fault. PUT and DELETE for a missing item return
  `400` from the failed conditional write. No `404` is declared or returned.

Resolve these differences when adapting the API. There are no separate JSON
fixture or JSON Schema files: tests construct their events inline, and
`openapi.yaml` is the only schema. See [Architecture](04-architecture.md) for
code and test anatomy and [Common tasks](07-common-tasks.md) for customization
steps.

## Yarn and TypeScript tooling

The project is a single Node.js package (`"type": "module"`) managed with
Yarn 4. `package.json` pins Yarn through `packageManager`, so enabling Corepack
selects the right version automatically. `.yarnrc.yml` uses the `node-modules`
linker, so dependencies install into a conventional `node_modules/` directory
that TypeScript, Jest, and SAM's esbuild builder can all resolve.

From the generated repository root, run `corepack enable` and then
`yarn install` to install runtime and development dependencies. Run the named
scripts with `yarn run <script>`, such as `yarn run test:unit`. Install the
selected Node.js version first.

Yarn records resolved dependency versions in `yarn.lock`. **The scaffolder does
not generate a lockfile**, and Yarn refuses to create one in CI, so commit
`yarn.lock` after your first local install; see
[CI/CD pipeline](05-ci-cd.md#build-job). Deployment packaging is separate from
the installed tree: SAM uses esbuild to bundle each function from its entry
point, so only code that a handler imports is deployed.
See [Common tasks](07-common-tasks.md#dependencies) for dependency management.

## CI/CD and feature branches

GitHub Actions supplies separate main and non-main branch workflows. Both
compile TypeScript, run unit tests, validate and build with SAM, and deploy
after a successful build. Branch deployments need deliberate stack and hostname
isolation; both workflows currently select the `production` GitHub environment.
See [CI/CD pipeline](05-ci-cd.md) before pushing a feature branch.

## DNS and TLS

The stack creates a DNS-validated ACM certificate, a regional API Gateway
custom domain, and a Route 53 record for the configured hostname. It obtains
the hosted zone ID through an existing SSM parameter. The hosted zone and SSM
parameter are prerequisites, not resources created by this service.
See [Configuration](03-configuration.md).

## Cognito authentication and authorization

The API uses an existing Cognito User Pool through `CognitoUserPoolArn`; it does
not create a pool, resource server, app client, or users.
The `serverlessOpsCognitoPool` OpenAPI security scheme reads the `Authorization`
header. Every starter operation, including `/health`, has a scope requirement:

| Operation | Required scope |
| --- | --- |
| Health | `https://<hostname>/health.read` |
| Read item | `https://<hostname>/${{ values.collection_name }}.read` |
| Create, update, delete | `https://<hostname>/${{ values.collection_name }}.write` |

The hostname here is the deployed `Hostname` parameter. Configure matching
resource-server scopes and allow them on the Cognito app client. Obtain an
**access token** containing the required scope using the client's configured
OAuth flow, then send it in the `Authorization` header. Machine clients may use
client credentials if enabled; browser clients should use authorization code
with PKCE and must not embed a client secret.

API Gateway verifies the token and operation scope. This does not provide
per-item ownership or tenant authorization: add those checks in application
logic if needed. Do not commit tokens or app-client secrets.

# Common changes and tasks

## Set up a development environment

Install the project's selected Node.js version and the AWS SAM CLI.
From the **generated repository root**, run:

```sh
corepack enable
yarn install
yarn run compile
yarn run test:unit
sam validate --lint
yarn run sam:build
```

Commit the `yarn.lock` created by the first `yarn install`; CI cannot install
dependencies without it. `test:unit` reports coverage but enforces no minimum.
SAM validation/build require the deployment tooling; run the SAM build through
`yarn run` so SAM finds the project's `esbuild`. Unit tests mock the DynamoDB
client and do not need a deployed table or AWS credentials.
Use synthetic data in tests.

## Adapt the data model

1. Replace the index signature in `${{ values.collection_name_cap }}Data` in
   `src/lib/${{ values.collection_name_cap }}Item.ts` with your business fields.
   Keep `id` optional there and required on `${{ values.collection_name_cap }}Item`.
2. Add run-time validation where the handler parses the request body.
   TypeScript interfaces are erased at compile time, and `JSON.parse(...)`
   with a type annotation does not check the shape of client input.
3. Update handler parsing, persistence, and returned fields. Get currently
   returns every stored attribute except `pk` and `sk`.
4. Update OpenAPI request/response schemas, including required fields and
   status codes. Address the starter contract differences listed in
   [Features](01-features.md).
5. Update the tests' inline bodies and stored items.
6. If you change key format, update `createKeys()`, `getKeysFromId()`, and
   `getIdFromKeys()` together and plan migration of existing records.

## Add an endpoint

1. Decide the client method, path, inputs, outputs, and required OAuth scope.
   Use a new function if the operation needs its own implementation; follow
   the next section first.
2. Add the path/operation in `openapi.yaml`. Define path/header parameters,
   request-body schema, documented success/error responses, and a
   `serverlessOpsCognitoPool` security requirement. Do not omit authentication
   accidentally.
3. For a Lambda route, copy an existing `x-amazon-apigateway-integration`:
   retain `type: AWS_PROXY` and integration `httpMethod: POST`, and change the
   `Fn::Sub` invocation URI to reference the intended SAM function's ARN.
   The client method remains the operation key (`get`, `post`, and so on).
4. Ensure `template.yaml` defines that function and a corresponding
   `AWS::Lambda::Permission` allowing `apigateway.amazonaws.com` to invoke it.
   Do not add a duplicate SAM `Events` route: this API is defined by OpenAPI.
5. If introducing a scope, configure it on the existing Cognito resource server
   and app client. Add application-level ownership/tenant checks where required.
6. Add handler tests with events for the new method, path, parameters, and body,
   covering success, invalid input, missing items, and authorization logic.
7. Run local checks below; after a safely isolated deployment, call the endpoint
   with valid and invalid tokens and verify the documented status/body.

The existing `/health` mock is not a substitute for exercising a new Lambda route.

## Add a function

### Function code and infrastructure

1. Create `src/handlers/<FunctionName>/` using the closest starter handler as a
   pattern, with `function.ts` and `function.unit.test.ts`. Use a PascalCase
   name that is also valid as part of a CloudFormation logical ID.
2. Export `handler(event, context)` as the entry point and keep AWS calls in
   separate exported functions or shared modules under `src/lib/` so they can be
   tested directly. For API handlers, follow the existing logger, error-mapping,
   and `APIGatewayProxyResult` pattern described in
   [Architecture](04-architecture.md). Use `.js` specifiers in relative imports.
3. Add an `AWS::Serverless::Function` to `template.yaml` with its `CodeUri` and
   `Handler: function.handler`, and copy an existing function's `Metadata`
   block (`BuildMethod: esbuild` and its `BuildProperties`). Without it, SAM does
   not compile and bundle the TypeScript entry point. The function inherits the
   runtime, timeout, memory, and table environment variable from Globals unless
   overridden.
4. Grant only the permissions the function needs. Existing CRUD functions use
   `DynamoDBCrudPolicy`; a read-only operation should use a narrower policy
   such as `DynamoDBReadPolicy`.
5. For API invocation, add a Lambda invoke permission and the OpenAPI route.
   For other triggers, define the appropriate event-source resources and
   permissions instead, and use the matching `aws-lambda` event type.

### Dependencies

- All dependencies live in the root `package.json`. Use
  `yarn add <package>@<version>` for runtime dependencies or
  `yarn add --dev <package>@<version>` for build, test, and type packages.
  Review advisories and choose a supported version before adding a package,
  and commit the updated `yarn.lock` with `package.json`.
- SAM bundles each function with esbuild, so a runtime dependency is deployed
  only in functions that import it, and type-only or development packages are
  not deployed. A package that cannot be bundled (for example, one with native
  binaries) needs esbuild `External` configuration and another way to supply it
  at run time, such as a layer.
- `.yarnrc.yml` sets `npmMinimalAgeGate: 0`, so newly published versions install
  immediately. Keep or change that setting according to your supply-chain policy.
- Run `yarn run sam:build` and check the built `.aws-sam/build/<Function>/`
  artifacts after dependency changes; passing local tests does not prove that a
  bundle is complete or that it runs on the Lambda runtime.

### Test events and fixtures

The starter defines test events inline in each test file. When several tests or
functions need the same events, move them into a shared, typed helper or into
JSON fixture files that tests read, and keep them consistent with
`openapi.yaml`. Use fake identifiers and no real user records or tokens.
If you add JSON Schemas, validate fixture instances against them explicitly in
tests; a schema file alone does not enforce anything.

### Tests

Create `src/handlers/<FunctionName>/function.unit.test.ts`, following the
nearest existing test:

1. Create a mock with `mockClient(<AwsClient>)` for every AWS SDK client the
   function uses and reset it in `beforeEach`. Do not let tests contact a real
   AWS account.
2. Make generated IDs deterministic by mocking `uuid` or the key helpers with
   `jest.mock`.
3. Build typed `APIGatewayProxyEvent` (or other event) objects and a minimal
   `Context`.
4. Assert the commands sent with `toHaveReceivedCommandWith`, plus status codes
   and decoded response bodies.
5. Cover malformed input, conditional-write failures, missing records, client
   and server faults, and relevant application authorization checks. Make
   mocked failures match what the AWS API actually returns; for example,
   `GetItem` returns no `Item` for a missing record rather than raising a
   conditional-check failure.
6. Name the file `*.unit.test.ts` so `yarn run test:unit` and CI pick it up.
   Other `*.test.ts` files run only under `yarn run test:all`.

## Validate and deploy changes

Run a focused test first, substituting your new function's name:

```sh
yarn jest src/handlers/<FunctionName>
```

Then run `yarn run compile`, `yarn run test:unit`, `sam validate --lint`, and
`yarn run sam:build`.

The `lint` script and `eslint.config.ts` are present but do not run
successfully as generated: the script quotes its `--flag` option and file
pattern as a single argument, which ESLint rejects, and ESLint needs the `jiti`
package, which is not a dependency, to load a TypeScript configuration file.
ESLint also no longer reads `.eslintignore`. CI does not run ESLint. Fix the
script and configuration before adding linting to your workflow.

Review the API contract and bundled dependencies, commit the related code,
tests, `yarn.lock`, and handbook updates, and open a PR under your review policy.
Remember that **pushing a feature branch starts deployment**: complete the
[branch-isolation setup](05-ci-cd.md) before pushing.

After deployment, smoke-test authentication and behavior with disposable data,
inspect logs/metrics, and obtain human review. Unit tests cannot prove that DNS,
API Gateway authorization, IAM, or the deployed bundle works.

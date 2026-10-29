# CI/CD pipeline

## Workflow triggers

| Workflow | Automatic trigger | Manual trigger |
| --- | --- | --- |
| `.github/workflows/main.yml` (`Main`) | Push to `main` | `workflow_dispatch` |
| `.github/workflows/branch.yml` (`Branch`) | Push to any branch except `main` | `workflow_dispatch` |

There is no `pull_request` trigger. A push to a feature branch starts its
workflow without needing a PR. Manual dispatch is also supported; select the
intended workflow and ref carefully.

Both workflows run on `ubuntu-latest` and grant jobs `contents: read` and
`id-token: write`. The latter allows OIDC-based AWS role assumption rather
than committing long-lived AWS credentials.

## Build job

The build job executes these steps in order:

1. `ServerlessOpsIO/gha-setup-workspace@v2` sets up the checked-out workspace.
2. `actions/setup-node@v6` installs the selected Node.js version.
3. `corepack enable` makes the Yarn version pinned in `package.json` available.
4. `yarn install` installs dependencies.
5. `yarn run compile` type-checks the TypeScript sources. Its `dist/` output is
   not deployed.
6. `yarn run test:unit` runs the unit tests. Coverage is reported but no
   minimum is enforced.
7. `ServerlessOpsIO/gha-assume-aws-credentials@v1` obtains credentials using
   `AWS_CICD_ACCOUNT_ID`.
8. `aws-actions/setup-sam@v3` installs SAM.
9. `sam validate --lint` validates infrastructure with CloudFormation linting.
10. `yarn run sam:build` runs `sam build --parallel`, bundling each function
    with esbuild from `node_modules`.
11. `ServerlessOpsIO/gha-store-artifacts@v2`, with `use_aws_sam: true`, stores
    the build output for the deploy job.

**Commit `yarn.lock`.** Yarn runs installs in immutable mode on CI, so
`yarn install` fails with "The lockfile would have been created by this install,
which is explicitly forbidden" when no lockfile is committed, and it fails
likewise if `package.json` changes without a matching lockfile update. The
scaffolder's initial commit has no `yarn.lock`, so the first `Main` run fails at
this step until you run `yarn install` locally and commit the lockfile.

Dependency caching, ESLint, integration/end-to-end tests, and TechDocs
generation are not steps in these workflows. Add them explicitly if your
project requires them; do not assume the build exercises the live API.

## Deploy job

`deploy` depends on `build` and only proceeds after it succeeds. It uses the
GitHub environment named **`production`** in both workflows.

1. The workspace action runs with `checkout_artifact: true` to retrieve the
   build artifact.
2. The credential action receives both `AWS_CICD_ACCOUNT_ID` and
   `DEPLOYMENT_ACCOUNT_ID` for build/deployment account access.
3. `ServerlessOpsIO/gha-deploy-aws-sam@v1` deploys with the target account ID
   and serialized workflow environment, variables, and secrets.

The shared actions implement artifact handling, credential assumptions, and
parameter/tag expression resolution. Their internals are external to this
repository. Confirm the expected IAM roles, region, artifact storage, and
stack-name behavior against the shared actions' configuration.

See [Configuration](03-configuration.md) for parameter files, tags, secrets,
DNS/Cognito prerequisites, and SAM defaults. GitHub environment protection
rules can require deployment approval or restrict which branches deploy.

## Feature branch builds and deployments

Branch support means a non-main push executes **both build and deploy**, not
just CI checks. `CodeBranch` is resolved from `$env.GITHUB_REF_SLUG_CS` and names
the API Gateway stage. That alone does not isolate an entire deployment:

- `samconfig.toml` has a component-wide default stack name.
- `cfn-parameters.json` has one fixed hostname from scaffolding.
- Both workflows select the same GitHub environment, `production`.

Before enabling branch deployments, establish and verify a platform policy:

1. Give each deployed branch a distinct stack name and hostname through the
   shared deployment action's supported configuration.
2. Ensure the branch hostname belongs to the configured hosted zone and that
   matching Cognito resource-server scopes and app-client permissions exist.
   Scope identifiers depend on the hostname.
3. Use an appropriate account/environment and OIDC trust policy for branch
   workloads, with approval rules that prevent unintended production changes.
4. Confirm the branch slug, final stack name, custom domain, and table in the
   deployment output before sending test traffic.
5. Define teardown for branch stacks and any external resources when a branch
   is no longer needed. There is no branch-deletion cleanup workflow.

Without this policy, deployments may target the same stack or collide on custom
domains and DNS records. Do not assume a branch push creates a safe preview
environment out of the box.

## Reviewing a deployment

Inspect the GitHub Actions build and deploy logs, then check the deployed
CloudFormation stack's status and resources. Smoke-test `/health` with an access
token containing its scope, then test CRUD behavior against disposable data.
Health uses a mock integration and does not establish that Lambda or DynamoDB
is healthy. Use [Observability](06-observability.md) to correlate application
requests, errors, and metrics.

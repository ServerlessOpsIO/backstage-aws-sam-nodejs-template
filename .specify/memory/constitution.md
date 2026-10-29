<!--
Sync Impact Report
Version change: unratified scaffold → 1.0.0
Modified principles: scaffold placeholders → I. Every option combination renders correctly;
II. The catalog drives the inputs; III. Published repositories and entities are predictable;
IV. Steps are ordered, optional, and fail safely; V. Credentials and secrets stay out of
templates; VI. The form is honest and the templates are consistent.
Added sections: Scope and applicability; Development workflow and quality gates.
Removed sections: None.
Follow-up TODOs: The existing template passes the system name as owner_name when rendering
catalog-info.yaml, does not document the positional cloud-account lookup next to its use, and
has no output.links. Address those template gaps separately.
Omitted rules: Workflow-template branch and pull-request rules are inapplicable because this
repository has no workflow template. Copilot, Spec Kit, Datadog, and other optional integrations
are not present. Generated application and infrastructure design is outside this constitution.
-->

# Backstage AWS SAM NodeJS Template Constitution

## Core Principles

### I. Every option combination renders correctly

- Every supported combination of template inputs MUST render a complete, valid project.
  A form choice MUST NOT produce a broken file.
- Content declared inside a template conditional MUST NOT be referenced outside that
  conditional.
- Every variable used by a rendered skeleton, including in file and directory names, MUST
  be supplied in the `fetch:template` `values` for every step that renders that skeleton.
- Rendered JSON and YAML MUST remain valid for every supported input combination,
  including conditional commas and indentation.
- In GitHub Actions skeletons, Actions expressions `${{ ... }}` MUST be enclosed in
  `{% raw %}...{% endraw %}` so Nunjucks does not consume them.
- Generated projects MUST pass their pipeline's compile, unit-test, SAM validation, and
  SAM build steps without hand edits.
- A change to a skeleton or an input option MUST be verified by rendering every affected
  supported combination, not only the default path.

### II. The catalog drives the inputs

- Ownership and placement MUST use catalog pickers with
  `allowArbitraryValues: false`: owner from `MyGroupsPicker`, then Domain, System,
  Environment, and cloud account. Contextual filters MUST constrain each selection by
  the preceding catalog relationship. Existing-component selection applies only to a
  template that operates on an existing component.
- Free-text fields MUST NOT replace values that exist as catalog entities.
- Values obtained from `catalog:fetch` MUST be read from the entity they belong to.
  In `template.yaml`, `entityRefs` is ordered owner, domain, system, cloud account; if
  that order or list changes, every output reference by index MUST be updated.
- The cloud-account Resource's `metadata.title` is used as the AWS deployment account ID
  passed to `publish:github` as `DEPLOYMENT_ACCOUNT_ID`. This catalog contract MUST be
  documented next to the read. Repository-name and other implicit catalog contracts
  MUST likewise be documented where they are used.

### III. Published repositories and entities are predictable

- In `template.yaml`, `component_name` is the repository name and the catalog Component
  name; it is used verbatim, with no suffix, and MUST be lowercase.
- The GitHub organization MUST come from the hidden `github_org` parameter, whose default
  is `ServerlessOpsIO`. It MUST NOT be hard-coded in steps or skeletons.
- Each generated `catalog-info.yaml` MUST set `owner`, `system`, and `lifecycle`, the
  `github.com/project-slug` annotation, and a `spec.type` appropriate to the entity. The
  current skeleton creates a Component of type `api` and an API of type `openapi`; the
  Component MUST declare its exposed API with `providesApis` and MUST declare required
  catalog dependencies where applicable.
- Project templates MUST publish with `main` as the default branch, set repository custom
  properties for domain, system, and owner from catalog selections, and register
  `/catalog-info.yaml` at the repository root.
- Repository visibility and branch-review settings MUST be consistent across project
  templates. This repository's current settings are public visibility, no default-branch
  protection, and zero required approving reviews. A difference MUST be explained in the
  template.

### IV. Steps are ordered, optional, and fail safely

- Project-template steps MUST run in this order: fetch catalog entities; render project
  skeletons and required starter code; render the pipeline; add optional starters; publish
  the repository; register the catalog entity; then run optional steps that act on the
  published repository or external services. The current template uses
  `skeleton/base`, `skeleton/crud`, `functions/crud`, and `pipeline/` in this flow and has
  no optional steps.
- Optional steps MUST be disabled unless selected by the user, guarded by `if:`, and
  their inputs MUST be shown and required only when the option is enabled.
- Steps that call external services MUST run after catalog registration, so a failure
  leaves a registered project rather than a half-created one.
- Inline shell in a template step MUST begin with `set -eu` and MUST stop on unexpected
  state.
- Comments MUST explain non-obvious behavior next to the relevant step, including
  explicitly passed values, external-resource matching, and catalog-filter dependencies.

### V. Credentials and secrets stay out of templates

- Secrets and account-specific values MUST reach generated repositories only through
  scaffolder secrets and the `secrets` input of `publish:github`. Secrets MUST NOT be
  written into skeleton files, template defaults, or this repository. Generated pipeline
  files MUST refer to secrets by name for resolution at run time.
- Actions performed on a user's behalf, including future Copilot or Spec Kit steps, MUST
  use the user's GitHub credentials requested with `SoRequestUserCredentials` into
  `USER_GITHUB_TOKEN`, limited to the required scopes.
- Tokens MUST NOT be written to files or Git remotes, or included in logs or pull-request
  text.
- Commits MUST be authored as the user running the template, using the user's catalog
  profile name and email.

### VI. The form is honest and the templates are consistent

- Parameter titles and descriptions MUST accurately describe each field, including hidden
  fields. Defaults MUST be values users can accept without modification.
- Fields that apply only to particular choices MUST be shown and required with JSON Schema
  `dependencies`, and only when those choices apply.
- An enum option MUST NOT be offered unless the template renders a working project for it.
- Step IDs and names MUST describe the work performed by each step.
- Templates in this repository MUST share the same first parameter page, metadata
  conventions (owner, tags, and description format), and `publish:github` settings. A
  change to a shared field MUST be applied to every template that has it unless the
  difference is explained in the pull request.
- Every template's `output.links` MUST link to what it created: the repository or pull
  request, the catalog entity, and any task or external resource created by an optional
  step.

## Scope and applicability

This constitution governs Backstage scaffolder templates and how they collect inputs,
render skeletons and pipelines, publish repositories, register catalog entities, and run
optional steps. It does not govern the application or infrastructure design of generated
projects; those projects' own constitutions govern that work.

This repository currently contains one project template, `template.yaml`
(`aws-sam-nodejs-crud`), which creates a GitHub repository and registers a Backstage
Component and API. Its base and CRUD skeletons are under `skeleton/base/` and
`skeleton/crud/`; required function templates are under `functions/crud/`; CI/CD workflow
templates are under `pipeline/.github/workflows/` (`branch.yml` and `main.yml`). Rules
specific to workflow templates that modify existing repositories do not apply unless this
repository adds such a template.

## Development workflow and quality gates

- Before merge, run affected templates through the Backstage template editor dry run,
  render every affected input combination, and verify Principle I.
- Changes to publishing, registration, optional external steps, or workflow-template Git
  behavior MUST be exercised by a real run against a test component or sandbox. A
  workflow-template Git-behavior check applies only if such a template is added.
- Pull requests MUST list the template runs and checks performed.
- Changes to template inputs, generated files, required catalog entities, required
  secrets, required Backstage actions, or other prerequisites MUST update `README.md` in
  the same change and update the generated-project README when affected.
- A template requiring a new or changed scaffolder action MUST name the action and the
  Backstage module that provides it in `README.md`.
- Generated, operating-system, and editor files, including `.DS_Store`, `__pycache__`,
  and `node_modules`, MUST NOT be committed.
- Work MUST use `feature/` or `bug/` branches that reference an issue number when one
  exists. Commit messages MUST use conventional-commit style, such as `feat:`, `fix:`,
  or `refactor:`. Changes MUST merge through pull requests.

## Governance

This constitution supersedes conflicting conventions in this repository. Every spec, plan,
and pull request MUST check compliance with it.

Amendments MUST be made in the same change that introduces a new rule, include a Sync
Impact Report, and update this document's version and amendment date. Versioning follows
semantic versioning: MAJOR removes or incompatibly redefines a principle; MINOR adds a
principle or section or materially expands guidance; PATCH clarifies existing guidance.
Pull-request review MUST verify that changes comply with this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-10-29 | **Last Amended**: 2026-10-29

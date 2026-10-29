# Observability

## Function logging

Handlers use Powertools for AWS Lambda (TypeScript) `Logger` for structured JSON
logs. `POWERTOOLS_SERVICE_NAME` is set to the CloudFormation stack name and
appears as each entry's `service`. The starter does not use
`injectLambdaContext`, so entries do not include Lambda context fields such as
the function name or request ID; add it (or log `context.awsRequestId`) if you
need them. CloudWatch receives Lambda logs in
`/aws/lambda/<physical-function-name>`; find the physical name in the stack
resources or Lambda console.

The logger's default level is INFO. All four handlers log the incoming event at
**DEBUG** and DynamoDB command outputs at DEBUG. Data-access functions log
DynamoDB errors at **ERROR**, and when an operation fails every handler logs
`Operation failed` **with the full incoming event at ERROR**. For temporary
debugging, set the Powertools `POWERTOOLS_LOG_LEVEL` environment variable
through SAM and redeploy, after sanitizing the logged data.
Add meaningful, sanitized business logs as the service evolves.

Full API events can contain authorization headers, personal information, and
request bodies. Redact or remove full-event logging **before production use**,
including the existing ERROR calls, and sanitize data before enabling DEBUG.
Never log tokens, credentials, or app-client secrets.
The template does not specify Lambda log-group retention; set an appropriate
retention policy for your service.

Function bundles are minified and built without source maps, so stack traces in
error logs refer to the minified `function.mjs`. If you need readable traces,
enable `Sourcemap` in the function's esbuild `BuildProperties` and set
`NODE_OPTIONS=--enable-source-maps`, accepting the larger artifact and
slower cold start.

## API Gateway logging

`RestApiLogGroup` creates `/aws/api-gateway/<stack-name>` with **seven-day**
retention. Access logs include extended request ID, source IP, caller/user,
request time, HTTP method/resource path/protocol, status, response length, and
request ID.

Method settings enable INFO execution logging for all paths and methods,
enable detailed metrics, and set `DataTraceEnabled: false` so full request and
response payload tracing is not enabled by the template. Execution logs are
separate from the configured access log group.

API Gateway needs the account/region-level CloudWatch logging role configured
for REST APIs. This template does not define `AWS::ApiGateway::Account` or that
logging role; `RestApiIamRole` grants DynamoDB query access and is **not** a
CloudWatch logging role. Confirm the platform has configured API logging.

Use access logs for route/status-level investigation and Lambda logs for handler
behavior. API Gateway request IDs and Lambda `awsRequestId` values are different
identifiers. Delete and Upsert return the Lambda `awsRequestId` as `request_id`
in successful responses, but the starter does not log it; record both
identifiers explicitly in sanitized application logs if you need
cross-service correlation.

## Metrics

AWS provides standard Lambda metrics such as Invocations, Errors, Duration,
Throttles, and ConcurrentExecutions. API Gateway metrics include Count, Latency,
IntegrationLatency, 4XXError, and 5XXError; the template enables detailed method
metrics. DynamoDB also exposes capacity, throttling, and latency metrics.

Handlers catch DynamoDB errors and return `400` or `500` responses rather than
throwing, so those failures appear in API Gateway 4XX/5XX metrics, not in the
Lambda Errors metric. Filter by the actual deployed function/table names and
API stage, especially when investigating branch deployments. Watch error rates
and throttles alongside latency, not just invocation counts.

The starter does not emit custom Powertools business metrics, configure alarms
or dashboards, or enable X-Ray tracing. Add these intentionally based on your
service's reliability targets.

## Availability in Datadog

The Datadog AWS integration and log shipping are **configured automatically in
all AWS accounts**. Developers do not need to enable the integration or configure
log forwarding for generated services. Use Datadog to inspect the service's
AWS metrics and shipped Lambda and API Gateway logs.

Baseline tagging is also automatic: `cfn-tags.json` supplies `org:domain`,
`org:system`, and `org:component`, and `ServerlessOpsIO/gha-deploy-aws-sam` adds
additional deployment tags. Use the existing tags to locate and distinguish
resources; extra tagging is only needed for service-specific requirements.

After deployment, verify that a sanitized test log and recent invocation/API
metrics appear in Datadog.

In Datadog Logs Explorer, locate the deployed service or function/log-group
identifier and narrow the time range, then search the request ID from an error.
Use Metrics Explorer to inspect the imported AWS metrics and account/region/stage
dimensions. Exact field names and tags depend on the integration's pipelines.
If data is missing, first confirm it exists in CloudWatch and check the Datadog
time range and resource/tag filters. Treat persistent missing data as a problem
with the existing collection or shipping configuration, not a requirement to
set up a new integration.

## Request investigation checklist

1. Note the timestamp, HTTP method, route, status, and any returned request ID.
2. Find the API Gateway access entry and determine whether the failure happened
   during authorization/validation or during Lambda integration.
3. Inspect the corresponding Lambda `Operation failed` entry and DynamoDB error,
   without copying sensitive payloads into tickets.
4. Compare error/latency/throttling metrics with recent deployments.
5. Check Datadog ingestion separately if CloudWatch data is present but missing
   from Datadog.

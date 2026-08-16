# No dotenv() here: the root .env is loaded by the processes that need it
# (tsx --env-file, and drizzle.config.ts resolves it relative to itself).
# Tilt's dotenv is an extension, not a builtin, and nothing here reads env vars.

docker_compose('docker-compose.yml')

local_resource(
    'migrate',
    cmd='pnpm --filter @lendit/db push',
    deps=['packages/db/src/schema.ts'],
    resource_deps=['postgres'],
    labels=['backend'],
)

local_resource(
    'api',
    serve_cmd='pnpm --filter @lendit/api dev',
    readiness_probe=probe(
        period_secs=2,
        http_get=http_get_action(port=3000, path='/api/health'),
    ),
    resource_deps=['migrate'],
    labels=['backend'],
)

local_resource(
    'web',
    serve_cmd='pnpm --filter @lendit/web dev',
    links=[link('http://localhost:5173', 'Lendit')],
    resource_deps=['api'],
    labels=['frontend'],
)

# Manual trigger: a "reset data" button in the Tilt UI.
local_resource(
    'seed',
    cmd='pnpm --filter @lendit/db seed',
    resource_deps=['migrate'],
    trigger_mode=TRIGGER_MODE_MANUAL,
    auto_init=False,
    labels=['backend'],
)

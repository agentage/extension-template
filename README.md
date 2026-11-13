# extension-template

An agentage extension with one of every part. It is for developers who write an extension. An
extension is one npm package. It adds a web page, a widget, an API, MCP tools, a job or CLI
commands to agentage.

```bash
npx @agentage/cli@latest extension create <id> [part...]   # no part = all seven
```

A **part** is one folder in `src/`: `pages`, `ui`, `api`, `mcp`, `worker`, `cli`, plus `store`
(postgres, in `migrations/` and `seeds/`). `create` keeps the parts you name, drops the rest and
writes your id into every file.

Lines below that name a part apply only when you kept it. Delete the others from your README.

## You need

Node 22 or newer, npm 10 or newer, Docker and git. Nothing needs a sign-in.

## Start

```bash
cd extension-<id>
npm ci && npm run build
npx agentage extension check          # PASS <id> <version> conforms (6 rules)
npm run verify                         # type-check, lint, format, tests, build
git init -b master && git add -A && git commit -m "feat: <id> extension"
```

Use `npx agentage` inside this folder. The global `agentage` can be older than the
version this project pins in `devDependencies`, and then it lacks `extension up`.

## Run it on your machine

```bash
npx agentage extension up      # Docker; prints "ready N parts healthy" when done
T=$(npx agentage extension token --scope <id>:read)
curl -s -H "Authorization: Bearer $T" "localhost:4280/api/v1/echo?msg=hi"
npx agentage extension down    # removes this folder's containers, network and volume
```

- `token` asks localhost:4281 only. Run `up` first. The scope is `<id>:read`, where `<id>` is
  `agentage.id` in `package.json`.
- Open `http://localhost:4280/` in a browser to see the pages part.

### Call it

`openapi.json` (api) and `<id>.mcpc.json` (mcp) are
the full lists of routes and tools. MCP tool `<id>__echo` is served at `POST /mcp` with the same
token.

### Health and logs

## What each part does here

| Part   | Folder                  | What it does                                                        |
| ------ | ----------------------- | ------------------------------------------------------------------- |
| pages  | `src/pages`             | `/` shows the id, version and commit                                |
| ui     | `src/ui`                | the widget `<{id}-echo>`, served at `/ui/{version}/{id}.js`         |
| api    | `src/api`               | `GET /api/v1/echo` (scope `{id}:read`), `GET /api/v1/ping` (public) |
| mcp    | `src/mcp`               | the tool `{id}__echo` (scope `{id}:read`)                           |
| worker | `src/worker`            | the job `tick`, every minute; it logs `tick`                        |
| store  | `migrations/`, `seeds/` | postgres; `ping` counts the rows of `pings`                         |
| cli    | `src/cli`               | `agentage ping [msg]` prints `pong`                                 |

A seed in `seeds/` runs once, on an empty store.

## Change it

[CLAUDE.md](CLAUDE.md) holds the rules for writing parts, the checks and the release steps.
After a change to a route or tool, regenerate the contract files:

```bash
npm run build && npx agentage extension check --write && npm run format
```

## Release

1. Raise the version in `package.json`.
2. Run `npx agentage extension check --write`, commit, and push the tag `v<version>` on that
   commit on master.
3. `release.yml` pushes the part images, attaches `agentage-extension.json` to the GitHub release
   and publishes the package to npm.

The first publish of a new npm name waits for the owner. A fix is a new version: never move a tag.

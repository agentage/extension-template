# extension-template

An agentage extension with one of every part. It is for developers who write an extension. An
extension is one npm package. It adds a web page, a widget, an API, MCP tools, a job or CLI
commands to agentage.

```bash
npx @agentage/cli@latest extension create <id> [part...]   # no part = all seven
```

A **part** is one folder in `src/`: `pages`, `ui`, `api`, `mcp`, `worker`, `cli`, plus `store`
(postgres, in `migrations/` and `seeds/`). `create` keeps the parts you name, drops the rest and
writes your id into every file. The id has lowercase letters, digits and `-`. It starts with a
letter and is not a part name.

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

Commit before `up`: `up` and `build` need a git commit, and stop with "is not a git checkout"
without one. Use `npx agentage` inside this folder. The global `agentage` can be older than the
version this project pins in `devDependencies`, and then it lacks `extension up`.

## Run it on your machine

```bash
npx agentage extension up      # Docker; prints "ready N parts healthy" when done
T=$(npx agentage extension token --scope <id>:read)
curl -s -H "Authorization: Bearer $T" "localhost:4280/api/v1/echo?msg=hi"
npx agentage extension down    # removes this folder's containers, network and volume
```

- `up` needs ports 4280 (gateway) and 4281 (dev token issuer) free. When another working copy
  holds them, `up` refuses and names its compose project. Run `npx agentage extension down` in
  that folder, or find the holder with `docker ps`.
- `token` asks localhost:4281 only. Run `up` first. The scope is `<id>:read`, where `<id>` is
  `agentage.id` in `package.json`.
- Open `http://localhost:4280/` in a browser to see the pages part.

### Call it

| Call                                  | Answer                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `GET /api/v1/echo?msg=hi` with token  | 200 `{"success":true,"data":{"msg":"hi","caller":...}}`                                      |
| `GET /api/v1/ping` (public, no token) | 200 `{"success":true,"data":{"msg":"pong","pings":1}}`; `pings` counts the rows in the store |
| a protected route without a token     | 401 `{"success":false,"error":{"code":"UNAUTHORIZED","message":...,"agcid":...}}`            |
| `echo` without `msg`                  | 400 `{"success":false,"error":{"code":"VALIDATION_ERROR",...}}`, with the field named        |

Every answer has an `Agcid` response header with the request id. An error body also carries it as
`error.agcid`; a success body does not. `openapi.json` (api) and `<id>.mcpc.json` (mcp) are
the full lists of routes and tools. MCP tool `<id>__echo` is served at `POST /mcp` with the same
token.

### Health and logs

- The gateway answers 404 on `/health`. Each part serves its own `/health` on container port 3000,
  which `up` does not publish. `up` has already checked each one when it prints `ready`.
- `docker ps` lists the gateway, the issuer, the store and one container per part you kept. The
  gateway and the store do not answer on port 3000, so name a part. For the api, run this inside
  this folder:
  `docker compose -f .agentage/compose.json exec api wget -qO- localhost:3000/health`.
- To read logs: `docker compose -f .agentage/compose.json logs --no-color --tail 80 api`. The api
  logs JSON lines with the request's `agcid`. Without `api` you also get the store's init text.
  The gateway logs nothing.

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

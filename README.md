# extension-template

An agentage extension with one of every part (a part is one folder in `src/`; the `store` part is
`migrations/` and `seeds/`). It is for extension developers. An extension is one npm package. It adds
a web page, a widget, an API, MCP tools, a job or CLI commands to agentage.

You need Node 22 or newer, npm 10 or newer, Docker and git. Nothing needs a sign-in.

```bash
npx @agentage/cli@latest extension create <id> [part...]   # no part = all seven
```

The parts are `pages`, `ui`, `api`, `mcp`, `worker`, `cli`, `app` and `store` (postgres). `create` keeps
the parts you name and deletes the other parts. It writes your id into every file. In your copy,
delete the README lines about parts you did not keep. See the [id rules](docs/run-locally.md#create).

## Quick start

```bash
cd extension-<id>
npm ci && npm run build
npx agentage extension check          # PASS <id> <version> conforms (6 rules)
npm run verify                         # type-check, lint, format, test, build
git init -b master && git add -A && git commit -m "feat: <id> extension"
```

Commit before `up`: it needs a git commit, or `COMMIT_SHA` set. `build` needs a clean tree.
Use `npx agentage` here. It runs the pinned version. A global `agentage` can be older and lack `extension up`.

More: [when up or build stops](docs/run-locally.md#when-up-or-build-stops).

### Run it on your machine

`npx agentage extension up` runs the folder on the daemon (127.0.0.1:4243): api, mcp (`/mcp/template`) and
worker in one sealed child, no token, and each saved change in `src/` reloads it. `extension down` removes the row.

With Docker, `up --docker` runs the release images, as a deployment does:

```bash
npx agentage extension up --docker  # Docker; prints "ready N parts healthy" when done
T=$(npx agentage extension token --scope template:read)
curl -s -H "Authorization: Bearer $T" "localhost:4280/api/template/echo?msg=hi"
npx agentage extension down    # removes this folder's containers, network and volume
```

- `up` needs ports 4280 (gateway) and 4281 (token issuer) free.
- `token` asks localhost:4281 only, so run `up` first. The scope starts with `agentage.id` of `package.json`.
- Open `http://localhost:4280/` for the pages part.

### Call it

- `GET /api/template/echo?msg=hi` with a token answers 200; without `msg`, 400.
- `GET /api/template/ping` is public and answers 200 `pong`.
- A protected route without a token answers 401.

`openapi.json` (api) and `template.mcpc.json` (mcp) list all routes and tools. The MCP tool
`template__echo` is at `POST /mcp`, with the same token.

More: [answers](docs/run-locally.md#answers).

Each part serves `/health` on port 3000 in its container. `up` does not publish it. More:
[Health and logs](docs/run-locally.md#health-and-logs).

## What it serves

| Part   | Folder                  | What it does                                                                     |
| ------ | ----------------------- | -------------------------------------------------------------------------------- |
| pages  | `src/pages`             | `/` shows the id, version and commit                                             |
| ui     | `src/ui`                | the widget `<{id}-echo>`, served at `/ui/{version}/{id}.js`                      |
| api    | `src/api`               | `GET /api/template/echo` (scope `{id}:read`), `GET /api/template/ping` (public)  |
| mcp    | `src/mcp`               | the tool `{id}__echo` (scope `{id}:read`)                                        |
| worker | `src/worker`            | the job `tick`, every minute                                                     |
| store  | `migrations/`, `seeds/` | postgres; `ping` counts the rows of `pings`                                      |
| cli    | `src/cli`               | `agentage ping [msg]` prints `pong`                                              |
| app    | `src/app`               | the shell page `/{id}`: an Echo button that calls the api through `useAppHost()` |

A seed in `seeds/` runs once, on an empty store.

## Verify

```bash
npm run verify                    # type-check, lint, format, test, build
npx agentage extension check      # the six conformance rules
```

[CLAUDE.md](CLAUDE.md) has the rules for a change. After a route or tool changes, regenerate the contracts:

```bash
npm run build && npx agentage extension check --write && npm run format
```

## Release

1. Raise the version in `package.json`.
2. Run `npx agentage extension check --write`, commit, and push the tag `v<version>` on that commit, on master.
3. `release.yml` pushes the images, attaches the records `agentage-container.json` and
   `agentage-extension.json` to the GitHub release and publishes the package to npm.

A package with `"private": true` skips npm. The owner does the first publish of a new npm name.
A fix is a new version: never move a tag.

## Deploy

A release deploys nothing. An operator adds a row with the id and the version to the
`installation.json` of an app host (repo agentage/apphosts). The app host then serves
`/api/template/...` and `/mcp/template` at its own address. More: [CLAUDE.md](CLAUDE.md#6-the-deployment-row).

## Documentation

- [docs/run-locally.md](docs/run-locally.md): id rules, start errors, answers, health and logs.
- [CLAUDE.md](CLAUDE.md): the rules for an agent that changes this repo.

## License

[MIT](LICENSE).

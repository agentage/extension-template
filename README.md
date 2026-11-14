# extension-template

An agentage extension with one of every part (a part is one folder in `src/`; the `store` part is
`migrations/` and `seeds/`). It is for extension developers. An extension is one npm package. It adds
a web page, a widget, an API, MCP tools, a job or CLI commands to agentage.

You need Node 22 or newer, npm 10 or newer, Docker and git. Nothing needs a sign-in.

```bash
npx @agentage/cli@latest extension create <id> [part...]   # no part = all seven
```

The parts are `pages`, `ui`, `api`, `mcp`, `worker`, `cli` and `store` (postgres). `create` keeps
the parts you name and deletes the other parts. It writes your id into every file. In your copy,
delete the README lines about parts you did not keep. See the [id rules](docs/run-locally.md#create).

## Start

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

## Run it on your machine

```bash
npx agentage extension up      # Docker; prints "ready N parts healthy" when done
T=$(npx agentage extension token --scope <id>:read)
curl -s -H "Authorization: Bearer $T" "localhost:4280/api/v1/echo?msg=hi"
npx agentage extension down    # removes this folder's containers, network and volume
```

- `up` needs ports 4280 (gateway) and 4281 (token issuer) free.
- `token` asks localhost:4281 only, so run `up` first. `<id>` is `agentage.id` in `package.json`.
- Open `http://localhost:4280/` for the pages part.

### Call it

- `GET /api/v1/echo?msg=hi` with a token answers 200; without `msg`, 400.
- `GET /api/v1/ping` is public and answers 200 `pong`.
- A protected route without a token answers 401.

`openapi.json` (api) and `<id>.mcpc.json` (mcp) list all routes and tools. The MCP tool
`<id>__echo` is at `POST /mcp`, with the same token.

More: [answers](docs/run-locally.md#answers).

Each part serves `/health` on port 3000 in its container. `up` does not publish it. More:
[Health and logs](docs/run-locally.md#health-and-logs).

## What each part does here

| Part   | Folder                  | What it does                                                        |
| ------ | ----------------------- | ------------------------------------------------------------------- |
| pages  | `src/pages`             | `/` shows the id, version and commit                                |
| ui     | `src/ui`                | the widget `<{id}-echo>`, served at `/ui/{version}/{id}.js`         |
| api    | `src/api`               | `GET /api/v1/echo` (scope `{id}:read`), `GET /api/v1/ping` (public) |
| mcp    | `src/mcp`               | the tool `{id}__echo` (scope `{id}:read`)                           |
| worker | `src/worker`            | the job `tick`, every minute                                        |
| store  | `migrations/`, `seeds/` | postgres; `ping` counts the rows of `pings`                         |
| cli    | `src/cli`               | `agentage ping [msg]` prints `pong`                                 |

A seed in `seeds/` runs once, on an empty store.

## Change it

[CLAUDE.md](CLAUDE.md) has the rules. After a route or tool changes, regenerate the contracts:

```bash
npm run build && npx agentage extension check --write && npm run format
```

## Release

1. Raise the version in `package.json`.
2. Run `npx agentage extension check --write`, commit, and push the tag `v<version>` on that commit, on master.
3. `release.yml` pushes the part images, attaches `agentage-extension.json` to the release and
   publishes the package to npm.

The owner does the first publish of a new npm name. A fix is a new version: never move a tag.

## Documentation

- [docs/run-locally.md](docs/run-locally.md): id rules, start errors, answers, health and logs.

## License

[MIT](LICENSE).

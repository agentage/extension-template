# CLAUDE.md - the one page

Read this page first. It is the only page you need to ship this extension to `next` in one day.
The deployed proof of the same shape is [agentage/extension-probe](https://github.com/agentage/extension-probe).
The kit rules are in the READMEs of [`@agentage/extension`](https://www.npmjs.com/package/@agentage/extension)
and [`@agentage/widget`](https://www.npmjs.com/package/@agentage/widget).

## 1. What an extension is

- An extension is one npm package. The `agentage` block of `package.json` is its manifest.
- The manifest names the id, the parts, the commands, the settings and the secrets.
- A part is one folder in `src/`. Each part exports `create(ctx)` and nothing else.
- The ui part exports `widgets` only.
- The kit owns the server, the port, `/health`, discovery, the envelope, the `agcid`, the store
  pool, the scheduler and the command line. You write only the part code.
- There is no Dockerfile and no compose file. The kit builds one image for each part.

| Part   | Folder                  | What it does here                                                   |
| ------ | ----------------------- | ------------------------------------------------------------------- |
| pages  | `src/pages`             | `/` shows `{id} {version} · {commit}`                               |
| ui     | `src/ui`                | the widget `<{id}-echo>`, served at `/ui/{version}/{id}.js`         |
| api    | `src/api`               | `GET /api/v1/echo?msg=` (scope `template:read`), `GET /api/v1/ping` |
| mcp    | `src/mcp`               | the tool `template__echo` (scope `template:read`) on `POST /mcp`    |
| worker | `src/worker`            | the job `tick`, every minute; it logs `tick` and uses no store      |
| store  | `migrations/`, `seeds/` | postgres; `GET /api/v1/ping` counts its `pings` rows                |
| cli    | `src/cli`               | `agentage ping [msg]` prints `pong`                                 |

## 2. Start

```bash
agentage extension create <id> [part...]   # no part = all seven
cd extension-<id> && npm ci && npm run build && agentage extension check
git init -b master && git add -A && git commit -m "feat: <id> extension"
```

- The id has lowercase letters, digits and `-`. It starts with a letter. It is not a part name.
- Keep at least one of pages, ui, api or mcp.
- `create` deletes the folders of the parts you do not keep. It writes your id into every file.
- Push to a new public repo `agentage/extension-<id>`, default branch `master`.
- Without api, delete `openapi.json`. Without mcp, delete `<id>.mcpc.json`.

## 3. Write parts

- A part imports only its own folder and `src/lib/`. Each image carries `dist/{part}` and
  `dist/lib` only. `src/manifest.test.ts` refuses a cross-part import.
- Put code in `src/lib/` only when every kept part can use it.
- Never use `listen()`, the `process` global, a token check or an absolute agentage URL in `src/`.
- Each part has its tests beside it in `src/{part}/`. One part can go without breaking another.
- api: validate every query and body with Zod (`parse`). Answer with `ok(...)`.
- api: give each route a scope in `src/api/openapi.test.ts`, which writes `openapi.json`:
  `security: [{ pat: ['template:read'] }]`, or `security: []` for an anonymous route.
- mcp: give each tool a `scope` beside its schemas. The kit names it `{id}__{name}`.
- The api reads `parts.store` from `package.json`. Without a store, `/ping` does not query.
- store: add a numbered file in `migrations/`. Never edit a migration that ran.
- `openapi.json` and `template.mcpc.json` are committed contracts. Tests compare them to the code.
  `UPDATE_SNAPSHOT=1 npm test` writes both again. A version bump changes both.

## 4. The loop on a laptop

You need Node 22+, npm 10+, Docker, `git` and `jq`.

```bash
npm run verify                                  # type-check, lint, format, tests, build
npx agentage extension check                    # PASS {id} {version} conforms (6 rules)
npx agentage extension up                       # ready    N parts healthy    <n> s
scripts/image-smoke.sh "$(git rev-parse HEAD)"  # PASS for each part image
npm run test:e2e                                # the widget in a browser, axe WCAG A/AA
T=$(npx agentage extension token --scope template:read)
curl -s -H "Authorization: Bearer $T" "localhost:4280/api/v1/echo?msg=hi"
npx agentage extension down                     # removes this working copy's containers
```

- `up` builds the images with the release recipe. It starts postgres, runs the migrations, a dev
  issuer on 4281 and a gateway on 4280 with the URL layout of `next`.
- `up` writes `.agentage/` (ignored). `build` needs a commit: commit first.
- CI runs the same steps, then the e2e gate on local: `npm run e2e -- template gate local` in
  agentage/e2e. The gate needs your row in its `extensions.json` (section 6). It never retries.

## 5. Release

- This repo has no release workflow. Copy `.github/workflows/release.yml` and
  `scripts/release-guard.sh` from agentage/extension-probe before your first release.
- A `v{version}` tag equal to the `package.json` version runs the release. It pushes
  `ghcr.io/agentage/{id}-{part}:{version}`, attaches `agentage-extension.json` (the images by
  digest) to the GitHub release and publishes the npm package with provenance.
- A version never changes. A fix is a new version. Never move a `v*` tag.

## 6. The estate row

These touches are outside this repo. Each is one small PR or one owner action.

| Where                                 | What                                                         |
| ------------------------------------- | ------------------------------------------------------------ |
| agentage/estate `estate.yaml`         | `extensions.{id}: { version, parts: { api: api, ... } }`     |
| agentage/e2e `extensions.json`        | `{ "id": "{id}", "token": "GATE_TOKENS", "targets": [...] }` |
| the `GATE_TOKENS` secret (owner)      | a `"{id}"` entry: the bearer your gate sends on `next`       |
| agentage/auth `pat-scopes.ts` (owner) | the id in `EXTENSION_IDS`, only when you declare a scope     |

- The pools in the row are `web` for pages and ui, `api` for api, mcp and worker, `data` for store.
- The host is `{id}.next.agentage.io`.

## 7. Operate

- A merge to estate master deploys `next`. The deploy applies the stacks, checks each part's
  `/health`, then runs your gate: `npm run e2e -- {id} gate next`.
- Read a red run on the Actions tab of agentage/estate. The run names the part and the check.
- A part's logs are JSON lines with the `agcid` of the request. Search for it.
- To change what runs, release a new version and change the version in the estate row.
- Dependabot opens one group PR every Friday. Merge it when CI is green.

## 8. What the platform promises

- The kit checks the token and the declared scope before your route or tool runs.
- The kit answers `/health`, discovery and errors in the envelope with an `agcid`.
- The gateway serves `/`, `/ui/{version}/`, `/api/v1/` and `/mcp`. It drops the `Cookie` header.
  No route reaches a part's `/health`.
- The estate runs the migrations as a job before the rollout. A release never restarts the store.
- The same smoke and contract gate runs for every extension in the e2e registry.
- A kit minor reaches this repo through the Friday Dependabot group, never by surprise.

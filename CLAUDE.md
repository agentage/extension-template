# CLAUDE.md - rules for changing this extension

Humans start at [README.md](README.md): the start steps, running on a laptop, calling it and the
release. This page is for the agent that changes the code. Do not repeat the README here.
The deployed proof of the same shape is [agentage/extension-probe](https://github.com/agentage/extension-probe).
The kit is the library `@agentage/extension` that owns the server. Its rules, and those of the
widget kit `@agentage/widget`, are in their npm READMEs.

## 1. What an extension is

- An extension is one npm package. The `agentage` block of `package.json` is its manifest: the
  id, the parts, the commands, the settings and the secrets.
- A part is one folder in `src/`. Each exports `create(ctx)` only; the ui part exports `widgets`.
- The kit owns the server, `/health`, auth, the store pool, the scheduler and the images. You
  write only the part code.

The part table is in [README.md](README.md#what-each-part-does-here).

## 2. Start

The start steps are in [README.md](README.md#start). After `create`:

- Keep at least one of pages, ui, api or mcp.
- `create` deletes the folders and contracts of the parts you drop, and writes your id into every
  text file. It does not edit `ci.yml`.
- Push to a new public repo `agentage/extension-<id>`, default branch `master`.
- Edit to the parts you kept: the part table and the lines of [README.md](README.md), and
  `description` in `package.json`.
- `MIN_EXECUTED` in `ci.yml` is the gate's floor, the fewest tests the gate must run (the gate is
  the e2e suite in agentage/e2e). `25` fits all seven parts. With fewer parts the gate runs fewer
  tests, so lower it, or the job is red.

## 3. Write parts

- A part imports only its own folder and `src/lib/`. Each image carries `dist/{part}` and
  `dist/lib` only. `src/manifest.test.ts` refuses a cross-part import.
- Put code in `src/lib/` only when every kept part can use it.
- Never use these in `src/`: `listen()`, the `process` global (or an import of it), an absolute
  agentage URL, a symlink, a dependency on another extension. The `sealing` rule of
  `agentage extension check` scans for them.
- The kit checks the token before a route runs. A part needs no token check.
- Each part has its tests beside it in `src/{part}/`. One part can go without breaking another.
- Test only the lines you wrote: `check` and the kit's own tests cover the rest.
- api: declare each route with `route(method, path, { summary, scope?, input?, output? }, handler)`.
  The scope is `read` (the default), `write`, `admin` or `public` (anonymous). `input` is read
  from the query on get and delete and from the body otherwise: use `z.coerce` for numbers.
  The handler returns the data; the kit answers `ok(...)`.
- mcp: give each tool a `scope` beside its schemas. The kit names it `{id}__{name}`.
- The api reads `ctx.extension.store`. Without a store, `/ping` does not query.
- store: add a numbered file in `migrations/`. Never edit a migration that ran.
- `openapi.json` and `template.mcpc.json` are committed contracts, generated from the routes and
  tools. `check` compares them to the code. After a change, run `npm run build`,
  `npx agentage extension check --write`, then `npm run format`.

## 4. The loop on a laptop

The commands are in [README.md](README.md#run-it-on-your-machine). Rules for the agent:

- Run `npm run verify` and `npx agentage extension check` before every push.
- `npm run test:e2e` runs the widget test in a browser (axe WCAG A/AA). It needs `up` running and
  Chromium: `npx playwright install chromium`.
- `up` runs the release images, postgres with your migrations, a dev issuer (4281) and a gateway
  (4280) laid out like `next` (the shared test environment). It writes `.agentage/` (ignored).
- `up` and `build` need a git commit, because the image tags come from it.
- CI runs the same steps, then the e2e gate on local: `npm run e2e -- <id> gate local` in
  agentage/e2e. The gate needs your row in its `extensions.json` (section 6). It never retries.

## 5. Release

- The steps are in [README.md](README.md#release). `release.yml` runs `agentage extension release`.
- The first publish of a new npm name waits for the owner's approval. Then add `release.yml` as
  the trusted publisher on npmjs.com.
- A re-run only retries npm; a moved tag is refused. A fix is a new version. Never move a `v*` tag.
- `agentage extension release` refuses the id of the repo this one was copied from, and passes for every other id.

## 6. The estate row

The estate is the agentage/estate repo that holds the deployment config of every extension.
These touches are outside this repo. Each is one small PR or one owner action.

| Where                                 | What                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------ |
| agentage/estate `estate.yaml`         | `extensions.{id}: { version, parts: { api: api, ... } }`                 |
| agentage/e2e `extensions.json`        | `{ "id": "{id}", "token": "GATE_TOKENS", "targets": ["local", "next"] }` |
| the `GATE_TOKENS` secret (owner)      | a `"{id}"` entry: the bearer your gate sends on `next`                   |
| agentage/auth `pat-scopes.ts` (owner) | the id in `EXTENSION_IDS`: echo declares `{id}:read`, so it is needed    |

- A row can also set `host`, `market`, `public`, `source`, `resources` and `settings`. The schema in the estate repo is the full list.
- Pools: `web` for pages and ui, `api` for api, mcp and worker, `data` for store. Host: `{id}.next.agentage.io`.

## 7. Operate

- A merge to estate master deploys `next`. The deploy applies the stacks, checks each part's
  `/health`, then runs your gate: `npm run e2e -- {id} gate next`.
- Read a red run on the Actions tab of agentage/estate. The run names the part and the check.
  A part logs JSON lines with the request's `agcid`: search for it.
- A release goes live so:
  - A `v*` tag runs `release.yml`: the package and the images.
  - The market lists the version.
  - A row with `version: latest`: the cloud extension opens a PR to `estate.lock`. It merges by itself and the deploy to `next` runs. A red deploy is reverted by a PR.
  - A row with an exact version (a pin: the version never moves by itself) changes only by a PR to `estate.yaml`.

## 8. What the platform promises

- The kit checks the token and the declared scope before your route or tool runs.
- The gateway serves `/`, `/ui/{version}/`, `/api/v1/` and `/mcp`. It drops the `Cookie` header.
- The estate runs the migrations as a job before the rollout. A release never restarts the store.
- The same smoke and contract gate runs for every extension in the e2e registry.
- A kit minor reaches this repo through the weekly Dependabot group PR. Merge it when CI is green.

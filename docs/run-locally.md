# Run it locally

Details for the [README](../README.md): how to create the project, why `up` or `build` stops, what
the calls answer, and how to check health and logs.

## Create

The id has lowercase letters, digits and `-`. It starts with a letter. It is not a part name.

## When up or build stops

Commit before `up`. `up` needs one git commit, or `COMMIT_SHA` set. Without one it fails with
`git rev-parse failed`.

`build` needs a clean git tree. Outside a repo it stops with "is not a git checkout". With
uncommitted changes it stops with "has uncommitted changes: commit first".

`up` needs ports 4280 (gateway) and 4281 (dev token issuer) free. When another working copy holds
them, `up` refuses and names its compose project. To free them, run `npx agentage extension down`
in that folder, or find the holder with `docker ps`.

## Answers

| Call                                  | Answer                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `GET /api/v1/echo?msg=hi` with token  | 200 `{"success":true,"data":{"msg":"hi","caller":...}}`                                      |
| `GET /api/v1/ping` (public, no token) | 200 `{"success":true,"data":{"msg":"pong","pings":1}}`; `pings` counts the rows in the store |
| a protected route without a token     | 401 `{"success":false,"error":{"code":"UNAUTHORIZED","message":...,"agcid":...}}`            |
| `echo` without `msg`                  | 400 `{"success":false,"error":{"code":"VALIDATION_ERROR",...}}`, with the field named        |

Every answer has an `Agcid` response header with the request id. An error body also carries it as
`error.agcid`. A success body does not.

## Health and logs

- The gateway answers 404 on `/health`. Each part serves its own `/health` on container port 3000.
  `up` does not publish that port. `up` has already checked each one when it prints `ready`.
- `docker ps` lists the gateway, the issuer and one container each for the parts `pages`, `ui`,
  `api`, `mcp` and `worker` that you kept. The `cli` part has no container.
- The store is a container only when you kept `store`. Its migrate job runs once and exits.
- The gateway and the store do not answer on port 3000, so name a part. For the api, run this
  inside this folder:
  `docker compose -f .agentage/compose.json exec api wget -qO- localhost:3000/health`.
- To read logs, run:
  `docker compose -f .agentage/compose.json logs --no-color --tail 80 api`. The api logs JSON
  lines with the request's `agcid`. The worker job `tick` logs `tick`. Without `api` you also get
  the store's init text. The gateway logs nothing.

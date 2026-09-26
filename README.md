# EmitKit SDKs

The official EmitKit SDK and CLI. MIT licensed.

| Package | What it is |
| --- | --- |
| [`@emitkit/js`](./packages/js) | The TypeScript/JavaScript SDK: send events, ask people for decisions and get the answer, list events and channels, verify callbacks. No dependencies. |
| [`@emitkit/cli`](./packages/cli) | `emitkit` in your terminal, built on the SDK: `send`, `ask --timeout`, `events`, `tail`, `channels`, `identify`. |

```ts
import { EmitKit } from "@emitkit/js";

const emitkit = new EmitKit(); // reads EMITKIT_API_KEY
const { answer } = await emitkit.ask({
  channelName: "deploys",
  title: "Ship v1.2.3 to production?",
  actions: [
    { id: "ship", label: "Ship", style: "primary" },
    { id: "hold", label: "Not yet" },
  ],
});
```

Docs: [emitkit.com/docs](https://emitkit.com/docs). API reference:
[openapi.json](https://api.emitkit.com/openapi.json).

## Development

```bash
pnpm install
pnpm build        # the SDK, then the CLI (which bundles it)
pnpm lint         # types, including src/contract.ts: the SDK's types against the API's
pnpm test         # callback signatures against the Standard Webhooks library
```

`pnpm sync` fetches the API's OpenAPI document into `openapi/`, and
`pnpm generate` turns it into `packages/js/src/generated/openapi.ts`. The
daily sync workflow opens a PR when it changes; `pnpm lint` then fails if
the hand-written types in `packages/js/src/types.ts` fall behind.

### End-to-end tests

Both packages have E2E suites that run against a live EmitKit (`pnpm dev` in
the server repo, or a deployment where you can make throwaway keys):

```bash
export EMITKIT_E2E_BASE_URL=http://api.localhost:5391
export EMITKIT_E2E_API_KEY=emitkit_…    # full access, throwaway project
export EMITKIT_E2E_READ_KEY=emitkit_…   # read-only key, same project (optional)
pnpm --filter @emitkit/js test:e2e
pnpm --filter @emitkit/cli build && pnpm --filter @emitkit/cli test:e2e
```

Releases: see [RELEASING.md](./RELEASING.md).

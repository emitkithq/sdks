/**
 * Fetches the EmitKit API's OpenAPI document into openapi/openapi.json.
 * `pnpm generate` then turns it into packages/js/src/generated/openapi.ts,
 * which `src/contract.ts` checks the SDK's types against.
 *
 * EMITKIT_OPENAPI_URL points it elsewhere (a self-hosted or local EmitKit,
 * e.g. http://api.localhost:5391/openapi.json).
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const url = process.env.EMITKIT_OPENAPI_URL ?? "https://api.emitkit.com/openapi.json";

const response = await fetch(url);
if (!response.ok) {
  console.error(`Couldn't fetch ${url}: HTTP ${response.status}`);
  process.exit(1);
}
const spec = (await response.json()) as { openapi?: string; paths?: object };
if (!(spec.openapi && spec.paths)) {
  console.error(`${url} isn't an OpenAPI document`);
  process.exit(1);
}
const path = join(process.cwd(), "openapi", "openapi.json");
await writeFile(path, `${JSON.stringify(spec, null, 2)}\n`);
console.log(`Synced ${Object.keys(spec.paths).length} paths from ${url}`);

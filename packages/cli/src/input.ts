import { readFile } from "node:fs/promises";
import type { Action, CreateEventInput, Field, Json } from "@emitkit/js";

/** A mistake on the command line: printed with a hint, exit code 2. */
export class UsageError extends Error {
  override readonly name = "UsageError";
}

const DURATION = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)?$/u;
const UNIT_MS = { d: 86_400_000, h: 3_600_000, m: 60_000, ms: 1, s: 1000 };

/** `90`, `90s`, `30m`, `2h`, `1d` in milliseconds (a bare number is seconds). */
export const duration = (value: string, flag: string) => {
  const match = DURATION.exec(value.trim());
  if (!match) {
    throw new UsageError(`${flag}: use a duration like 90s, 30m, 2h or 1d`);
  }
  const unit = (match[2] ?? "s") as keyof typeof UNIT_MS;
  return Number(match[1]) * UNIT_MS[unit];
};

/**
 * A value from the command line: `true`, `false`, `null`, a number that
 * reads back the same (`49`, `9.5`; not `1.10`, `007` or ids too big for a
 * number), or JSON `{…}`/`[…]`/`"…"`. Anything else is text.
 */
const valueOf = (raw: string): Json => {
  if (raw === "true" || raw === "false" || raw === "null") {
    return JSON.parse(raw) as Json;
  }
  const number = Number(raw);
  if (raw !== "" && Number.isFinite(number) && String(number) === raw && Math.abs(number) <= Number.MAX_SAFE_INTEGER) {
    return number;
  }
  if (/^[[{"]/u.test(raw)) {
    try {
      return JSON.parse(raw) as Json;
    } catch {
      // Text after all.
    }
  }
  return raw;
};

/** `key=value` pairs (see `valueOf` for how values are read). */
export const keyValues = (pairs: readonly string[], flag: string) => {
  const result: Record<string, Json> = {};
  for (const pair of pairs) {
    const at = pair.indexOf("=");
    if (at <= 0) {
      throw new UsageError(`${flag} ${pair}: use key=value`);
    }
    result[pair.slice(0, at)] = valueOf(pair.slice(at + 1));
  }
  return result;
};

const titled = (id: string) =>
  id.charAt(0).toUpperCase() + id.slice(1).replaceAll(/[-_]+/gu, " ");

/** `id` or `id:Label`. */
const idAndLabel = (value: string) => {
  const at = value.indexOf(":");
  const id = at === -1 ? value : value.slice(0, at);
  const label = at === -1 ? titled(id) : value.slice(at + 1);
  return { id, label };
};

/** `--button approve:Approve`, `--button deny`. */
export const buttons = (values: readonly string[]): Action[] =>
  values.map(idAndLabel);

/** `--link "Open order=https://…"`. */
export const links = (values: readonly string[]): Action[] =>
  values.map((value) => {
    const at = value.indexOf("=");
    if (at <= 0) {
      throw new UsageError(`--link ${value}: use "Label=https://…"`);
    }
    return { label: value.slice(0, at), url: value.slice(at + 1) };
  });

/** `--text note:Note`, `--choice plan:Plan=basic,pro:Pro plan`. */
export const fields = (options: {
  readonly text: readonly string[];
  readonly choice: readonly string[];
}): Field[] => [
  ...options.text.map((value) => ({ ...idAndLabel(value), type: "text" as const })),
  ...options.choice.map((value) => {
    const at = value.indexOf("=");
    if (at <= 0) {
      throw new UsageError(`--choice ${value}: use "id:Label=option,option:Label"`);
    }
    return {
      ...idAndLabel(value.slice(0, at)),
      options: value.slice(at + 1).split(",").map(idAndLabel),
      type: "choice" as const,
    };
  }),
];

/** `--input file.json` or `--input -` (stdin): a whole createEvent body. */
export const readInput = async (path: string): Promise<CreateEventInput> => {
  const text =
    path === "-"
      ? await new Promise<string>((resolve, reject) => {
          let data = "";
          process.stdin.setEncoding("utf8");
          process.stdin.on("data", (chunk) => {
            data += chunk;
          });
          process.stdin.on("end", () => resolve(data));
          process.stdin.on("error", reject);
        })
      : await readFile(path, "utf8");
  try {
    return JSON.parse(text) as CreateEventInput;
  } catch {
    throw new UsageError(`--input ${path}: not JSON`);
  }
};

/** Reads a secret from the terminal without echoing it, or a line from piped stdin. */
export const readSecret = (prompt: string) =>
  new Promise<string>((resolve, reject) => {
    const { stdin, stderr } = process;
    if (!stdin.isTTY) {
      let data = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (chunk) => {
        data += chunk;
      });
      stdin.on("end", () => resolve(data.trim()));
      stdin.on("error", reject);
      return;
    }
    stderr.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let secret = "";
    const done = (value: string | null) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      stderr.write("\n");
      if (value === null) {
        reject(new UsageError("Canceled"));
      } else {
        resolve(value.trim());
      }
    };
    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\r" || character === "\n") {
          done(secret);
          return;
        }
        if (character === "\u0003") {
          done(null);
          return;
        }
        secret = character === "\u007f" ? secret.slice(0, -1) : secret + character;
      }
    };
    stdin.on("data", onData);
  });

/**
 * The built CLI (`pnpm build` first) against a running EmitKit. Skipped
 * unless EMITKIT_E2E_BASE_URL and EMITKIT_E2E_API_KEY are set (see
 * packages/js/e2e/sdk.test.ts). Every run uses a fresh config directory.
 *
 * Ways it could fail:
 * - login saves a key it didn't check, saves it readable by others, or
 *   whoami / any output prints the key;
 * - a command sends the wrong event (metadata types, tags, silent), or
 *   `--input` is ignored;
 * - `ask` exits 0 when nobody answered, or hangs past `--timeout`;
 * - `--json` output isn't JSON, or errors go to stdout / lose their code;
 * - usage mistakes exit like API errors (2 vs 1), or miss the hint;
 * - tail misses an event sent while it runs, or repeats one.
 */
import { spawn } from "node:child_process";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const baseUrl = process.env.EMITKIT_E2E_BASE_URL ?? "";
const apiKey = process.env.EMITKIT_E2E_API_KEY ?? "";
const run = Boolean(baseUrl && apiKey);
const CLI = join(import.meta.dirname, "..", "dist", "cli.js");
const channel = `cli-${Date.now().toString(36)}`;

let configDir = "";

interface Result {
  code: number | null;
  stdout: string;
  stderr: string;
}

/** Runs the CLI with the test's config dir; no EMITKIT_API_KEY unless asked. */
const cli = (
  args: readonly string[],
  options: { env?: Record<string, string>; stdin?: string } = {}
) =>
  new Promise<Result>((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      env: {
        EMITKIT_BASE_URL: baseUrl,
        EMITKIT_CONFIG_DIR: configDir,
        NO_COLOR: "1",
        PATH: process.env.PATH ?? "",
        ...options.env,
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      // Whatever it printed, the key isn't in it.
      expect(stdout + stderr).not.toContain(apiKey);
      resolve({ code, stderr, stdout });
    });
    child.stdin.end(options.stdin ?? "");
  });

const withKey = { env: { EMITKIT_API_KEY: apiKey } };

describe.runIf(run)("emitkit CLI against a live API", () => {
  beforeAll(async () => {
    configDir = await mkdtemp(join(tmpdir(), "emitkit-cli-"));
  });

  afterAll(async () => {
    await cli(["logout"]);
  });

  it("help, version, and usage mistakes exit 2 with a hint", async () => {
    const help = await cli(["--help"]);
    expect(help.code).toBe(0);
    expect(help.stdout).toContain("emitkit <command>");
    const version = await cli(["--version"]);
    expect(version.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/u);
    const unknown = await cli(["sned"]);
    expect(unknown.code).toBe(2);
    expect(unknown.stderr).toContain("Unknown command: sned");
    const missing = await cli(["send", "only-a-channel"], withKey);
    expect(missing.code).toBe(2);
    expect(missing.stderr).toContain("Missing <title>");
    const badFlag = await cli(["send", "a", "b", "--nope"], withKey);
    expect(badFlag.code).toBe(2);
  });

  it("without a key, commands say how to log in", async () => {
    const result = await cli(["whoami"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("missing_api_key");
    expect(result.stderr).toContain("emitkit login");
  });

  it("login checks the key, saves it for you only; whoami shows a prefix", async () => {
    const bad = await cli(["login", "--key", "emitkit_notarealkey0"]);
    expect(bad.code).toBe(1);
    expect(bad.stderr).toContain("unauthorized");
    await expect(stat(join(configDir, "config.json"))).rejects.toThrow();

    const good = await cli(["login"], { stdin: `${apiKey}\n` });
    expect(good.code).toBe(0);
    expect(good.stdout).toContain("Logged in");
    const file = join(configDir, "config.json");
    expect((await stat(file)).mode & 0o777).toBe(0o600);
    const saved = JSON.parse(await readFile(file, "utf8"));
    // Compared, never printed.
    expect(Object.keys(saved)).toEqual(["apiKey"]);
    expect(saved.apiKey === apiKey).toBe(true);

    const whoami = await cli(["whoami", "--json"]);
    expect(whoami.code).toBe(0);
    const me = JSON.parse(whoami.stdout);
    expect(me.key).toBe(`${apiKey.slice(0, 12)}…`);
    expect(me.scopes).toContain("events:write");
  });

  it("send: metadata as JSON values, tags, silent; then events and get", async () => {
    const sent = await cli([
      "send",
      channel,
      "Payment received",
      "-m",
      "amount=49",
      "-m",
      "currency=EUR",
      "-m",
      "trial=true",
      "-t",
      "billing",
      "-i",
      "💰",
      "--silent",
      "--json",
    ]);
    expect(sent.code).toBe(0);
    const event = JSON.parse(sent.stdout);
    expect(event).toMatchObject({
      channelName: channel,
      icon: "💰",
      metadata: { amount: 49, currency: "EUR", trial: true },
      notify: false,
      tags: ["billing"],
      title: "Payment received",
    });
    const human = await cli(["send", channel, "Second", "--silent"]);
    expect(human.stdout).toMatch(/^Sent event_\S+ to #cli-/u);

    const listed = await cli(["events", "-c", channel, "--json"]);
    expect(JSON.parse(listed.stdout).events.map((item: { title: string }) => item.title)).toEqual([
      "Second",
      "Payment received",
    ]);
    const lines = await cli(["events", "-c", channel]);
    expect(lines.stdout.trim().split("\n").at(-1)).toContain("Second");

    const got = await cli(["get", event.id]);
    expect(got.stdout).toContain("Payment received");
    expect(got.stdout).toContain("amount: 49");
    const channels = await cli(["channels"]);
    expect(channels.stdout).toContain(channel);
  });

  it("send --input: a whole event as JSON on stdin, with flags on top", async () => {
    const result = await cli(
      ["send", "--input", "-", "-t", "urgent", "-m", "version=1.10", "-m", "build=42", "--json"],
      {
        stdin: JSON.stringify({
          channelName: channel,
          metadata: { from: "json" },
          notify: false,
          tags: ["ci"],
          title: "From JSON",
        }),
      }
    );
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      // 1.10 isn't a number that reads back the same: it stays text.
      metadata: { build: 42, from: "json", version: "1.10" },
      tags: ["ci", "urgent"],
      title: "From JSON",
    });
  });

  it("API errors: exit 1, code on stderr, JSON with --json", async () => {
    const result = await cli(["get", "event_doesnotexist", "--json"]);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr).error).toMatchObject({ code: "not_found", status: 404 });
  });

  it("ask: --no-wait prints the answer page; --timeout exits 124; expiry exits 3", async () => {
    const nothing = await cli(["ask", channel, "No buttons", "--no-wait"]);
    expect(nothing.code).toBe(2);
    expect(nothing.stderr).toContain("needs a button");
    const noWait = await cli(["ask", channel, "Ship it?", "-b", "ship", "-b", "wait:Not yet", "--no-wait"]);
    expect(noWait.code).toBe(0);
    expect(noWait.stdout).toMatch(/^Asked event_\S+\s+\S+\/a\/event_/u);
    const id = /event_\S+/u.exec(noWait.stdout)?.[0] ?? "";
    const got = await cli(["get", id, "--json"]);
    expect(JSON.parse(got.stdout).actions).toEqual([
      { id: "ship", label: "Ship" },
      { id: "wait", label: "Not yet" },
    ]);
    const canceled = await cli(["cancel", id]);
    expect(canceled.stdout).toContain("Canceled");

    const started = Date.now();
    const timedOut = await cli(["ask", channel, "Anyone?", "-b", "ok", "--timeout", "2s", "--json"]);
    expect(timedOut.code).toBe(124);
    expect(JSON.parse(timedOut.stdout).answer.status).toBe("pending");
    expect(Date.now() - started).toBeLessThan(15_000);
    await cli(["cancel", JSON.parse(timedOut.stdout).id]);

    const expired = await cli([
      "ask",
      channel,
      "Note?",
      "--text",
      "note:Your note",
      "--choice",
      "size:Size=s:Small,m,l",
      "--expires",
      "10s",
      "--json",
    ]);
    expect(expired.code).toBe(3);
    const asked = JSON.parse(expired.stdout);
    expect(asked.answer.status).toBe("expired");
    expect(asked.fields).toEqual([
      { id: "note", label: "Your note", type: "text" },
      {
        id: "size",
        label: "Size",
        options: [
          { id: "s", label: "Small" },
          { id: "m", label: "M" },
          { id: "l", label: "L" },
        ],
        type: "choice",
      },
    ]);
  });

  it("identify with typed properties and aliases", async () => {
    const userId = `cli_user_${Date.now()}`;
    const result = await cli(["identify", userId, "-p", "plan=pro", "-p", "seats=3", "-a", `${userId}@example.com`, "--json"]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ properties: { plan: "pro", seats: 3 }, userId });
  });

  it("tail shows recent events, then new ones once each", async () => {
    const child = spawn(process.execPath, [CLI, "tail", "-c", channel, "--interval", "1s", "--json"], {
      env: { EMITKIT_BASE_URL: baseUrl, EMITKIT_CONFIG_DIR: configDir, PATH: process.env.PATH ?? "" },
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    const until = async (check: () => boolean) => {
      for (let waited = 0; waited < 20_000 && !check(); waited += 250) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    };
    await until(() => output.includes("Payment received"));
    await cli(["send", channel, "Live one", "--silent"]);
    await until(() => output.includes("Live one"));
    await new Promise((resolve) => setTimeout(resolve, 2500));
    child.kill();
    const titles = output
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line).title as string);
    expect(titles).toContain("Live one");
    expect(titles.filter((title) => title === "Live one")).toHaveLength(1);
    expect(titles.at(-1)).toBe("Live one");
    expect(new Set(titles).size).toBe(titles.length);
  });
});

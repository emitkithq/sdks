/**
 * The SDK against a running EmitKit (`pnpm dev` in emitkit-v3, or any
 * deployment you can make throwaway keys on). Skipped unless these are set:
 *
 *   EMITKIT_E2E_BASE_URL   e.g. http://api.localhost:5391
 *   EMITKIT_E2E_API_KEY    a full-access key of a throwaway project
 *   EMITKIT_E2E_READ_KEY   a read-only key of the same project (optional)
 *
 * Ways it could fail:
 * - a method calls the wrong path or sends the wrong shape, so the API
 *   rejects it or the result doesn't match the types;
 * - errors lose their `code`, `status`, `requestId` or validation `details`;
 * - a retried create sends a second event (the Idempotency-Key must be the
 *   same on every attempt), or a caller's idempotency key isn't honoured;
 * - `ask` returns before the answer settles, never returns, or ignores its
 *   timeout;
 * - list paging or filters are dropped on the way to the query string;
 * - `lastResponse` misses the request id, rate limit or replay flag;
 * - a missing key fails with a network error instead of `missing_api_key`.
 */
import { describe, expect, it } from "vitest";
import { EmitKit, EmitKitError } from "../src/index";

const baseUrl = process.env.EMITKIT_E2E_BASE_URL;
const apiKey = process.env.EMITKIT_E2E_API_KEY;
const readKey = process.env.EMITKIT_E2E_READ_KEY;
const run = Boolean(baseUrl && apiKey);

const emitkit = new EmitKit({ apiKey, baseUrl });
const channel = `sdk-${Date.now().toString(36)}`;

const failure = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught
  );
  expect(error).toBeInstanceOf(EmitKitError);
  return error as EmitKitError;
};

describe.runIf(run)("EmitKit SDK against a live API", () => {
  it("me: the key's organization, project and scopes", async () => {
    const me = await emitkit.me();
    expect(me.via).toBe("api_key");
    expect(me.project?.name).toEqual(expect.any(String));
    expect(me.scopes).toContain("events:write");
    expect(emitkit.lastResponse?.requestId).toMatch(/^[\da-f-]{36}$/u);
    expect(emitkit.lastResponse?.rateLimit?.limit).toBe(100);
  });

  it("events: create, get, list with paging and filters, channels", async () => {
    const created = [];
    for (const title of ["One", "Two", "Three"]) {
      created.push(
        await emitkit.events.create({
          channelName: channel,
          metadata: { n: title.length },
          notify: false,
          title,
        })
      );
    }
    expect(created[0]).toMatchObject({
      actions: [],
      answer: null,
      channelName: channel,
      fields: [],
      title: "One",
    });
    const read = await emitkit.events.get(created[2]?.id ?? "");
    expect(read.title).toBe("Three");

    const first = await emitkit.events.list({ channel, limit: 2 });
    expect(first.events.map((event) => event.title)).toEqual(["Three", "Two"]);
    const second = await emitkit.events.list({
      before: first.nextCursor ?? undefined,
      channel,
      limit: 2,
    });
    expect(second.events.map((event) => event.title)).toEqual(["One"]);
    expect(second.nextCursor).toBeNull();
    const later = await emitkit.events.list({
      channel,
      since: new Date(Date.now() + 60_000),
    });
    expect(later.events).toEqual([]);

    const channels = await emitkit.channels.list();
    expect(channels.map((item) => item.name)).toContain(channel);
  });

  it("create is idempotent: the same key twice is one event", async () => {
    const idempotencyKey = `sdk-${crypto.randomUUID()}`;
    const input = { channelName: channel, notify: false, title: "Once" };
    const first = await emitkit.events.create(input, { idempotencyKey });
    expect(emitkit.lastResponse?.replayed).toBe(false);
    const again = await emitkit.events.create(input, { idempotencyKey });
    expect(again.id).toBe(first.id);
    expect(emitkit.lastResponse?.replayed).toBe(true);
  });

  it("errors carry the API's code, status, request id and details", async () => {
    const invalid = await failure(
      emitkit.events.create({ channelName: "", title: "" })
    );
    expect(invalid).toMatchObject({ code: "validation_error", status: 400 });
    expect(invalid.requestId).toMatch(/^[\da-f-]{36}$/u);
    expect(invalid.details.map((detail) => detail.path.join("."))).toContain(
      "channelName"
    );
    const missing = await failure(emitkit.events.get("event_doesnotexist"));
    expect(missing).toMatchObject({ code: "not_found", status: 404 });
    const notWaiting = await failure(emitkit.events.cancel((await emitkit.events.list({ channel, limit: 1 })).events[0]?.id ?? ""));
    expect(notWaiting.code).toBe("not_waiting");
    const noKey = await failure(
      new EmitKit({ apiKey: "", baseUrl }).me()
    );
    expect(noKey.code).toBe("missing_api_key");
    const badKey = await failure(
      new EmitKit({ apiKey: "emitkit_notarealkey0", baseUrl }).me()
    );
    expect(badKey).toMatchObject({ code: "unauthorized", status: 401 });
  });

  it("ask: returns the event still pending at its timeout", async () => {
    const started = Date.now();
    const asked = await emitkit.ask(
      {
        actions: [{ id: "ok", label: "OK" }],
        channelName: channel,
        title: "Anyone?",
      },
      { pollInterval: 500, timeout: 1500 }
    );
    expect(asked.answer.status).toBe("pending");
    expect(Date.now() - started).toBeLessThan(10_000);
    await emitkit.events.cancel(asked.id);
  });

  it("ask: resolves when the question is canceled, and when it expires", async () => {
    const title = `Cancel me ${Date.now()}`;
    const asking = emitkit.ask(
      {
        actions: [{ id: "ok", label: "OK" }],
        channelName: channel,
        title,
      },
      { pollInterval: 500 }
    );
    let id: string | undefined;
    while (!id) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const page = await emitkit.events.list({ channel, limit: 5 });
      id = page.events.find((event) => event.title === title)?.id;
    }
    await emitkit.events.cancel(id);
    const canceled = await asking;
    expect(canceled.answer.status).toBe("canceled");

    const expired = await emitkit.ask(
      {
        channelName: channel,
        expiresIn: 10,
        fields: [{ id: "note", label: "Note", type: "text" }],
        title: "Expires",
      },
      { pollInterval: 1000 }
    );
    expect(expired.answer).toMatchObject({ action: null, status: "expired" });
    expect(expired.fields).toEqual([
      { id: "note", label: "Note", type: "text" },
    ]);
  });

  it("ask refuses an event that asks nothing, before sending it", async () => {
    const error = await failure(
      emitkit.ask({
        actions: [{ label: "Docs", url: "https://emitkit.com" }],
        channelName: channel,
        title: "Links only",
      })
    );
    expect(error.code).toBe("validation_error");
  });

  it("identify and delete an identity", async () => {
    const userId = `sdk_user_${Date.now()}`;
    const identity = await emitkit.identify({
      aliases: [`${userId}@example.com`],
      properties: { plan: "pro" },
      userId,
    });
    expect(identity).toMatchObject({ properties: { plan: "pro" }, userId });
    const erased = await emitkit.identities.delete(userId);
    expect(erased).toMatchObject({ status: "erased", userId });
  });

  it.runIf(Boolean(readKey))("a read-only key reads and can't send", async () => {
    const reader = new EmitKit({ apiKey: readKey, baseUrl });
    expect((await reader.me()).scopes).toEqual(["events:read"]);
    const page = await reader.events.list({ channel, limit: 1 });
    expect(page.events).toHaveLength(1);
    const refused = await failure(
      reader.events.create({ channelName: channel, title: "No" })
    );
    expect(refused).toMatchObject({ code: "forbidden", status: 403 });
  });
});

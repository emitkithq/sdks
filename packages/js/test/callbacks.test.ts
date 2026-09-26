/**
 * verifyCallback against the Standard Webhooks reference library: EmitKit
 * signs callbacks the same way, so whatever the library signs, we accept,
 * and whatever it would reject, we reject.
 *
 * Ways it could fail:
 * - the secret's `whsec_` prefix or base64 is decoded wrongly, so nothing verifies;
 * - a changed body, id or timestamp still verifies;
 * - a timestamp outside the tolerance (replayed or from the future) verifies;
 * - several signatures in one header (a rotated secret) fail when one is right;
 * - an unknown signature version (`v1a,…`) is taken for `v1`;
 * - missing headers crash instead of failing with `invalid_signature`;
 * - a Request's body can't be read after verifying, or header case matters;
 * - the payload comes back unparsed.
 */
import { Webhook } from "standardwebhooks";
import { describe, expect, it } from "vitest";
import { EmitKitError, verifyCallback } from "../src/index";

const secret = `whsec_${btoa("0123456789abcdef0123456789abcdef")}`;
const other = `whsec_${btoa("fedcba9876543210fedcba9876543210")}`;
const payload = {
  answer: { action: "approve", status: "answered" },
  eventId: "event_1",
  resume: "job-7",
  type: "event.answered",
};
const body = JSON.stringify(payload);

const signed = (options: { key?: string; at?: Date; id?: string } = {}) => {
  const id = options.id ?? "msg_event_1_answered";
  const at = options.at ?? new Date();
  const signature = new Webhook(options.key ?? secret).sign(id, at, body);
  return {
    "webhook-id": id,
    "webhook-signature": signature,
    "webhook-timestamp": String(Math.floor(at.getTime() / 1000)),
  };
};

const rejects = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught
  );
  expect(error).toBeInstanceOf(EmitKitError);
  expect((error as EmitKitError).code).toBe("invalid_signature");
};

describe("verifyCallback", () => {
  it("accepts what the reference library signs, and parses it", async () => {
    await expect(
      verifyCallback({ body, headers: signed() }, { secret })
    ).resolves.toEqual(payload);
  });

  it("reads a Request, whatever the header case", async () => {
    const headers = Object.fromEntries(
      Object.entries(signed()).map(([name, value]) => [name.toUpperCase(), value])
    );
    const request = new Request("https://example.com/hook", {
      body,
      headers,
      method: "POST",
    });
    await expect(verifyCallback(request, { secret })).resolves.toEqual(payload);
  });

  it("rejects another secret, a changed body, id or timestamp", async () => {
    await rejects(verifyCallback({ body, headers: signed({ key: other }) }, { secret }));
    await rejects(
      verifyCallback({ body: `${body} `, headers: signed() }, { secret })
    );
    await rejects(
      verifyCallback(
        { body, headers: { ...signed(), "webhook-id": "msg_other" } },
        { secret }
      )
    );
    const headers = signed();
    await rejects(
      verifyCallback(
        {
          body,
          headers: {
            ...headers,
            "webhook-timestamp": String(Number(headers["webhook-timestamp"]) - 1),
          },
        },
        { secret }
      )
    );
  });

  it("rejects timestamps outside the tolerance, both ways", async () => {
    const tenMinutes = 10 * 60 * 1000;
    await rejects(
      verifyCallback(
        { body, headers: signed({ at: new Date(Date.now() - tenMinutes) }) },
        { secret }
      )
    );
    await rejects(
      verifyCallback(
        { body, headers: signed({ at: new Date(Date.now() + tenMinutes) }) },
        { secret }
      )
    );
    await expect(
      verifyCallback(
        { body, headers: signed({ at: new Date(Date.now() - tenMinutes) }) },
        { secret, toleranceSeconds: 15 * 60 }
      )
    ).resolves.toEqual(payload);
  });

  it("accepts one right signature among several, and ignores other versions", async () => {
    const good = signed();
    const wrong = signed({ key: other });
    await expect(
      verifyCallback(
        {
          body,
          headers: {
            ...good,
            "webhook-signature": `${wrong["webhook-signature"]} ${good["webhook-signature"]}`,
          },
        },
        { secret }
      )
    ).resolves.toEqual(payload);
    const [, value] = good["webhook-signature"].split(",");
    await rejects(
      verifyCallback(
        { body, headers: { ...good, "webhook-signature": `v1a,${value}` } },
        { secret }
      )
    );
  });

  it("fails cleanly without headers or a secret", async () => {
    await rejects(verifyCallback({ body, headers: {} }, { secret }));
    await expect(
      verifyCallback({ body, headers: signed() }, { secret: "" })
    ).rejects.toThrow(/secret/iu);
  });
});

/**
 * The EmitKit SDK: send events, ask people for decisions and read the
 * answers, list events and channels, identify your users, and verify
 * callbacks.
 *
 * ```ts
 * import { EmitKit } from "@emitkit/js";
 *
 * const emitkit = new EmitKit(); // reads EMITKIT_API_KEY
 * await emitkit.events.create({ channelName: "payments", title: "New subscription" });
 * ```
 *
 * @packageDocumentation
 */

export { verifyCallback } from "./callbacks";
export type { VerifyCallbackOptions } from "./callbacks";
export { EmitKit } from "./client";
export type { AskOptions, Asked, CreateOptions, EmitKitOptions } from "./client";
export { EmitKitError } from "./errors";
export type * from "./types";

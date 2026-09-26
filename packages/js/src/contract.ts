/**
 * Type-level checks, not shipped: the hand-written types must match the
 * types generated from the API's OpenAPI document (`pnpm generate`, run by
 * the sync and release workflows before `pnpm lint`).
 *
 * Both ways: ours must fit theirs (nothing required is missing), every
 * object has the same keys (nothing new is left out), and the literal
 * unions agree exactly (a new status or scope fails here).
 */
import type { components } from "./generated/openapi";
import type {
  Answer,
  Button,
  Callback,
  Channel,
  CreateEventInput,
  Erasure,
  Event,
  EventPage,
  Link,
  IdentifyInput,
  Identity,
  Me,
} from "./types";

type Schemas = components["schemas"];
type Check<T extends true> = T;
type Fits<Ours, Theirs> = [Ours] extends [Theirs] ? true : false;
type Mutual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
/** An object's named keys, without an index signature. */
type Named<T> = keyof {
  [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
};
type SameKeys<Ours, Theirs> = Mutual<Named<Ours>, Named<Theirs>>;
/** A schema the generator couldn't express comes out `unknown`: that must fail, not pass. */
type Known<T> = unknown extends T ? false : true;
type Both<Ours, Theirs> = Known<Theirs> extends true
  ? Fits<Ours, Theirs> extends true
    ? SameKeys<Ours, Theirs>
    : false
  : false;

type TheirAction = NonNullable<Schemas["CreateEventRequest"]["actions"]>[number];

export type Contract = [
  Check<Both<Event, Schemas["Event"]>>,
  Check<Both<Answer, Schemas["Answer"]>>,
  Check<Both<Channel, Schemas["Channel"]>>,
  Check<Both<EventPage, Schemas["EventListResponse"]["data"]>>,
  Check<Both<Me, Schemas["MeResponse"]["data"]>>,
  Check<Both<Callback, Schemas["CallbackPayload"]>>,
  Check<Both<Identity, Schemas["IdentifyUserResponse"]["data"]>>,
  Check<Both<Erasure, Omit<Schemas["DeleteIdentityResponse"]["data"], "productEventsDetached">>>,
  Check<Both<CreateEventInput, Schemas["CreateEventRequest"]>>,
  // user_id is the deprecated name of userId: the SDK sends userId only.
  Check<Known<Schemas["IdentifyUserRequest"]>>,
  Check<Fits<IdentifyInput, Schemas["IdentifyUserRequest"]>>,
  Check<Mutual<Named<IdentifyInput>, Exclude<keyof Schemas["IdentifyUserRequest"], "user_id">>>,
  Check<Mutual<Answer["status"], Schemas["Answer"]["status"]>>,
  Check<Mutual<Event["displayAs"], Schemas["Event"]["displayAs"]>>,
  Check<Mutual<Me["scopes"][number], Schemas["MeResponse"]["data"]["scopes"][number]>>,
  Check<Mutual<Callback["type"], Schemas["CallbackPayload"]["type"]>>,
  Check<Mutual<NonNullable<Button["style"]>, NonNullable<TheirAction["style"]>>>,
  Check<Mutual<keyof Button | keyof Link, Named<TheirAction>>>,
];

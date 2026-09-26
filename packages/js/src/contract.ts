/**
 * Type-level checks, not shipped: the hand-written types must fit the
 * types generated from the API's OpenAPI document (`pnpm generate`, run by
 * the sync workflow). When the API adds a required field, `pnpm lint`
 * fails here until `types.ts` has it too.
 */
import type { components } from "./generated/openapi";
import type {
  Answer,
  Callback,
  Channel,
  CreateEventInput,
  Erasure,
  Event,
  EventPage,
  Identity,
  Me,
} from "./types";

type Schemas = components["schemas"];
type Fits<Ours, Theirs> = [Ours] extends [Theirs] ? true : false;
type Check<T extends true> = T;

export type Contract = [
  Check<Fits<Event, Schemas["Event"]>>,
  Check<Fits<Answer, Schemas["Answer"]>>,
  Check<Fits<Channel, Schemas["Channel"]>>,
  Check<Fits<EventPage, Schemas["EventListResponse"]["data"]>>,
  Check<Fits<Me, Schemas["MeResponse"]["data"]>>,
  Check<Fits<CreateEventInput, Schemas["CreateEventRequest"]>>,
  Check<Fits<Callback, Schemas["CallbackPayload"]>>,
  Check<Fits<Omit<Identity, never>, Omit<Schemas["IdentifyUserResponse"]["data"], never>>>,
  Check<Fits<Erasure, Omit<Schemas["DeleteIdentityResponse"]["data"], "productEventsDetached">>>,
];

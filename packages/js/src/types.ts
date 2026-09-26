/**
 * The EmitKit API's shapes (https://api.emitkit.com/openapi.json), written
 * out by hand so editors show them plainly. `src/contract.ts` checks them
 * against types generated from the OpenAPI document.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

// ---------------------------------------------------------------------------
// Fields and actions: what an event asks

type FieldBase = {
  /** What the answer reports this field's value under. */
  id: string;
  /** What the person sees. */
  label: string;
};

export type ChoiceOption = {
  /** What the answer reports, e.g. `partial`. */
  id: string;
  label: string;
};

export type ChoiceField = FieldBase & {
  type: "choice";
  /** 2 to 10 options. */
  options: ChoiceOption[];
  /** Pick several (checkboxes): the answer is an array of option ids. */
  multiple?: boolean;
  /** An option id, or ids with `multiple`. A single choice starts on its first option. */
  default?: string | string[];
};

export type TextField = FieldBase & {
  type: "text";
  multiline?: boolean;
  /** At most 2,000. */
  maxLength?: number;
  placeholder?: string;
  default?: string;
};

export type NumberField = FieldBase & {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
  /** Shown with the number, like `$` or `%`. */
  unit?: string;
  default?: number;
};

export type BooleanField = FieldBase & {
  type: "boolean";
  default?: boolean;
};

export type Field = ChoiceField | TextField | NumberField | BooleanField;

/** A button: pressing it answers the event with its `id`. */
export type Button = {
  id: string;
  label: string;
  style?: "primary" | "destructive";
  /** Text or multiple-choice field ids that must be filled in first. */
  requires?: string[];
};

/** A link: opens a page, never answers. */
export type Link = {
  label: string;
  /** https (http only for localhost). */
  url: string;
};

export type Action = Button | Link;

/** A field's value in an answer. */
export type AnswerValue = string | string[] | number | boolean;

export type AnswerStatus = "pending" | "answered" | "expired" | "canceled";

/** The answer to an event that asks something. */
export type Answer = {
  status: AnswerStatus;
  /** When it stops waiting (ISO 8601). */
  expiresAt: string;
  /** The answer page; pushes for the event open it. */
  url: string;
  /** The pressed button's id (`submit` for the Send button); null until answered. */
  action: string | null;
  /** Field values by field id; null until answered. */
  values: Record<string, AnswerValue> | null;
  by: { id: string; name: string; email: string } | null;
  at: string | null;
};

// ---------------------------------------------------------------------------
// Events

export type CreateEventInput = {
  /** The channel, e.g. `payments`. Created on first use. */
  channelName: string;
  /** What happened, or the question. */
  title: string;
  description?: string;
  /** An emoji. */
  icon?: string;
  /** Anything JSON; `{ amount, currency }` at the top level counts as revenue. */
  metadata?: Record<string, Json>;
  tags?: string[];
  /** One of your users (a userId or alias from identify). */
  userId?: string | null;
  /** Push to subscribed devices (default true). */
  notify?: boolean;
  displayAs?: "message" | "notification";
  /** Where it came from (default `api`). */
  source?: string;
  /** Up to 5: with fields (or buttons), the event waits for an answer. */
  fields?: Field[];
  /** Up to 4 buttons and links. */
  actions?: Action[];
  /** Seconds to wait for an answer: 10 to 604,800 (default 86,400). */
  expiresIn?: number;
  /** Where EmitKit POSTs the answer or the expiry, signed (see `verifyCallback`). */
  callbackUrl?: string;
  /** Up to 65,536 characters of your own state, handed back with the answer. */
  resume?: string;
};

/** How delivery to `callbackUrl` went. */
export type CallbackState = {
  url: string;
  attempts: number;
  /** The receiver's last HTTP status; null when it couldn't be reached. */
  lastStatus: number | null;
  /** When a 2xx was received. */
  deliveredAt: string | null;
};

export type Event = {
  id: string;
  channelId: string;
  channelName: string;
  title: string;
  description: string | null;
  icon: string | null;
  /** ISO 8601. */
  createdAt: string;
  displayAs: "message" | "notification";
  metadata: Record<string, Json>;
  notify: boolean;
  source: string;
  tags: string[];
  userId: string | null;
  /** [] when none. */
  fields: Field[];
  /** [] when none. */
  actions: Action[];
  /** Null when the event doesn't ask anything. */
  answer: Answer | null;
  /** Null without a `callbackUrl`. */
  callback: CallbackState | null;
  resume: string | null;
};

export type ListEventsInput = {
  /** Only this channel (its name). */
  channel?: string;
  /** Only events at or after this time. */
  since?: string | Date;
  /** Only events before this time: pass `nextCursor` for the next page. */
  before?: string | Date;
  /** 1 to 100 (default 50). */
  limit?: number;
};

export type EventPage = {
  /** Newest first. */
  events: Event[];
  /** Pass as `before` for the next page; null on the last one. */
  nextCursor: string | null;
};

export type Channel = {
  id: string;
  /** What events use as `channelName`. */
  name: string;
  icon: string | null;
  description: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Identities and the credential

export type IdentifyInput = {
  /** Your id for the user. */
  userId: string;
  /** Merged into the identity's properties. */
  properties?: Record<string, Json>;
  /** Other ids or emails this user is known by in your events' userId. */
  aliases?: string[];
};

export type Identity = {
  id: string;
  userId: string;
  properties: Record<string, Json>;
  aliases: { created: string[] };
  updatedAt: string;
};

export type Erasure = {
  id: string;
  userId: string;
  status: "erased";
  aliasesDeleted: number;
};

export type Scope = "events:write" | "events:read" | "identities:write";

export type Me = {
  organization: { id: string; name: string | null };
  /** Where the key's events go. */
  project: { id: string; name: string } | null;
  scopes: Scope[];
  via: "api_key";
};

// ---------------------------------------------------------------------------
// Callbacks

/** What EmitKit POSTs to a `callbackUrl`. */
export type Callback = {
  type: "event.answered" | "event.expired";
  eventId: string;
  answer: Answer;
  resume: string | null;
};

// ---------------------------------------------------------------------------
// Responses

export type RateLimit = {
  limit: number;
  remaining: number;
  /** When the window resets (Unix seconds). */
  reset: number;
};

/** What the last response said besides its data. */
export type ResponseInfo = {
  requestId: string | null;
  rateLimit: RateLimit | null;
  /** An `Idempotency-Key` replay: the first request's result. */
  replayed: boolean;
};

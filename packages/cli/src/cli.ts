import { parseArgs } from "node:util";
import type { ParseArgsConfig } from "node:util";
import { EmitKit, EmitKitError } from "@emitkit/js";
import type { CreateEventInput, Event } from "@emitkit/js";
import { keyPrefix, loadConfig, removeConfig, saveConfig } from "./config";
import { channelLine, dim, eventDetails, eventLine, green } from "./format";
import {
  buttons,
  duration,
  fields,
  keyValues,
  links,
  readInput,
  readSecret,
  UsageError,
} from "./input";

declare const __CLI_VERSION__: string;

const HELP = `emitkit: send events, ask people for decisions, and read what happened.

Usage: emitkit <command> [options]

  login [--key <key>]          Save an API key (checked first). Without --key it is
                               read from the terminal, hidden, or from stdin.
  logout                       Forget the saved key.
  whoami                       The key's organization, project and scopes.

  send <channel> <title>       Send an event.
      -d, --description <text>   -i, --icon <emoji>   -u, --user <userId>
      -t, --tag <tag>            (repeat)
      -m, --meta <key=value>     (repeat; values are JSON when they parse: amount=49)
      --silent                   no push notification
      --idempotency-key <key>    retrying with the same key sends it once

  ask <channel> <title>        Ask a person and wait for the answer on their phone.
      -b, --button <id[:Label]>  (repeat) e.g. -b approve -b deny:"Don't"
      --text <id[:Label]>        a text field      --link <"Label=https://…">
      --choice <id[:Label]=a,b:B>  a choice field
      --expires <duration>       how long it waits (default 24h), e.g. 30m
      --timeout <duration>       stop waiting after this (the question stays open)
      --no-wait                  print the event and exit
      -d, -i, -m, --input        as for send
    Exit code: 0 answered, 1 expired or canceled, 124 still waiting at --timeout.

  get <id>                     One event, with its answer.
  cancel <id>                  Stop an event from waiting for an answer.
  events [-c channel] [-n limit] [--since <time>]   Recent events, newest last.
  tail [-c channel] [--interval 5s]                 Follow new events.
  channels                     The project's channels.
  identify <userId> [-p key=value]... [-a alias]...  Create or update a user.

Options for every command:
  --json               Machine-readable output (errors too, on stderr).
  --api-key <key>      Default: $EMITKIT_API_KEY, then the saved key.
  --api-url <url>      A self-hosted EmitKit. Default: $EMITKIT_BASE_URL, the
                       saved URL, then https://api.emitkit.com.
  -h, --help           -v, --version

Send --input <file|-> with send or ask to pass a whole event as JSON.
Docs: https://emitkit.com/docs/cli`;

type Options = NonNullable<ParseArgsConfig["options"]>;

const GLOBAL = {
  "api-key": { type: "string" },
  "api-url": { type: "string" },
  help: { short: "h", type: "boolean" },
  json: { type: "boolean" },
} satisfies Options;

const EVENT = {
  description: { short: "d", type: "string" },
  icon: { short: "i", type: "string" },
  "idempotency-key": { type: "string" },
  input: { type: "string" },
  meta: { multiple: true, short: "m", type: "string" },
  tag: { multiple: true, short: "t", type: "string" },
  user: { short: "u", type: "string" },
} satisfies Options;

const COMMANDS = {
  ask: {
    ...EVENT,
    button: { multiple: true, short: "b", type: "string" },
    choice: { multiple: true, type: "string" },
    expires: { type: "string" },
    link: { multiple: true, type: "string" },
    "no-wait": { type: "boolean" },
    text: { multiple: true, type: "string" },
    timeout: { type: "string" },
  },
  cancel: {},
  channels: {},
  events: {
    channel: { short: "c", type: "string" },
    limit: { short: "n", type: "string" },
    since: { type: "string" },
  },
  get: {},
  identify: {
    alias: { multiple: true, short: "a", type: "string" },
    prop: { multiple: true, short: "p", type: "string" },
  },
  login: { key: { type: "string" } },
  logout: {},
  send: { ...EVENT, silent: { type: "boolean" } },
  tail: {
    channel: { short: "c", type: "string" },
    interval: { type: "string" },
  },
  whoami: {},
} satisfies Record<string, Options>;

type Command = keyof typeof COMMANDS;

const print = (json: boolean, value: unknown, human: () => string) => {
  process.stdout.write(`${json ? JSON.stringify(value, null, 2) : human()}\n`);
};

const positional = (values: readonly string[], index: number, name: string) => {
  const value = values[index];
  if (value === undefined || value === "") {
    throw new UsageError(`Missing <${name}>. Run emitkit --help.`);
  }
  return value;
};

/** send and ask: the event from --input, or from the arguments and flags. */
const eventFrom = async (
  values: Record<string, unknown>,
  args: readonly string[]
): Promise<CreateEventInput> => {
  if (typeof values.input === "string") {
    return readInput(values.input);
  }
  const tags = values.tag as string[] | undefined;
  const meta = values.meta as string[] | undefined;
  return {
    channelName: positional(args, 0, "channel"),
    title: positional(args, 1, "title"),
    ...(typeof values.description === "string" ? { description: values.description } : {}),
    ...(typeof values.icon === "string" ? { icon: values.icon } : {}),
    ...(typeof values.user === "string" ? { userId: values.user } : {}),
    ...(tags?.length ? { tags } : {}),
    ...(meta?.length ? { metadata: keyValues(meta, "--meta") } : {}),
  };
};

const run = async (argv: readonly string[]) => {
  const [name, ...rest] = argv;
  if (name === "-v" || name === "--version") {
    process.stdout.write(`${__CLI_VERSION__}\n`);
    return 0;
  }
  if (name === undefined || name === "-h" || name === "--help" || name === "help") {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  if (!Object.hasOwn(COMMANDS, name)) {
    throw new UsageError(`Unknown command: ${name}. Run emitkit --help.`);
  }
  const command = name as Command;
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args: [...rest],
    options: { ...GLOBAL, ...COMMANDS[command] },
    strict: true,
  });
  const option = values as Record<string, unknown>;
  const json = option.json === true;
  if (option.help) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }

  const config = await loadConfig();
  const apiKey =
    (option["api-key"] as string | undefined) ?? process.env.EMITKIT_API_KEY ?? config.apiKey;
  const apiUrl =
    (option["api-url"] as string | undefined) ?? process.env.EMITKIT_BASE_URL ?? config.apiUrl;
  const client = (key = apiKey) => new EmitKit({ apiKey: key, baseUrl: apiUrl });

  switch (command) {
    case "login": {
      const key =
        (option.key as string | undefined) ?? (await readSecret("EmitKit API key (Settings → API keys): "));
      const me = await client(key).me();
      // Only a URL given here is saved; $EMITKIT_BASE_URL stays the environment's.
      const url = option["api-url"] as string | undefined;
      const path = await saveConfig({
        apiKey: key,
        ...(url ? { apiUrl: url } : config.apiUrl ? { apiUrl: config.apiUrl } : {}),
      });
      print(json, { organization: me.organization, project: me.project, saved: path }, () =>
        `${green("Logged in")} to ${me.organization.name ?? me.organization.id} / ${me.project?.name ?? "no project"} ${dim(`(key saved in ${path})`)}`
      );
      return 0;
    }
    case "logout": {
      await removeConfig();
      print(json, { loggedOut: true }, () => "Logged out: the saved key is gone.");
      return 0;
    }
    case "whoami": {
      const me = await client().me();
      const key = apiKey ? keyPrefix(apiKey) : null;
      print(json, { ...me, key }, () =>
        [
          `${me.organization.name ?? me.organization.id} / ${me.project?.name ?? "no project"}`,
          dim(`key ${key}  scopes ${me.scopes.join(", ")}`),
        ].join("\n")
      );
      return 0;
    }
    case "send": {
      const input = await eventFrom(option, positionals);
      const event = await client().events.create(
        option.silent ? { ...input, notify: false } : input,
        typeof option["idempotency-key"] === "string"
          ? { idempotencyKey: option["idempotency-key"] }
          : {}
      );
      print(json, event, () => `${green("Sent")} ${event.id} to #${event.channelName}`);
      return 0;
    }
    case "ask": {
      return ask(client(), option, positionals, json);
    }
    case "get": {
      const event = await client().events.get(positional(positionals, 0, "id"));
      print(json, event, () => eventDetails(event));
      return 0;
    }
    case "cancel": {
      const event = await client().events.cancel(positional(positionals, 0, "id"));
      print(json, event, () => `${green("Canceled")} ${event.id}`);
      return 0;
    }
    case "events": {
      const limit = option.limit === undefined ? undefined : Number(option.limit);
      const page = await client().events.list({
        channel: option.channel as string | undefined,
        limit,
        since: option.since as string | undefined,
      });
      print(json, page, () =>
        page.events.length === 0
          ? dim("No events.")
          : page.events.toReversed().map(eventLine).join("\n")
      );
      return 0;
    }
    case "tail": {
      return tail(client(), option, json);
    }
    case "channels": {
      const channels = await client().channels.list();
      print(json, channels, () =>
        channels.length === 0 ? dim("No channels yet.") : channels.map(channelLine).join("\n")
      );
      return 0;
    }
    case "identify": {
      const props = (option.prop as string[] | undefined) ?? [];
      const identity = await client().identify({
        aliases: (option.alias as string[] | undefined) ?? [],
        properties: keyValues(props, "--prop"),
        userId: positional(positionals, 0, "userId"),
      });
      print(json, identity, () => `${green("Identified")} ${identity.userId}`);
      return 0;
    }
    default: {
      return 2;
    }
  }
};

const ask = async (
  emitkit: EmitKit,
  option: Record<string, unknown>,
  args: readonly string[],
  json: boolean
) => {
  const base = await eventFrom(option, args);
  const extraActions = [
    ...buttons((option.button as string[] | undefined) ?? []),
    ...links((option.link as string[] | undefined) ?? []),
  ];
  const extraFields = fields({
    choice: (option.choice as string[] | undefined) ?? [],
    text: (option.text as string[] | undefined) ?? [],
  });
  const input: CreateEventInput = {
    ...base,
    ...(extraActions.length ? { actions: [...(base.actions ?? []), ...extraActions] } : {}),
    ...(extraFields.length ? { fields: [...(base.fields ?? []), ...extraFields] } : {}),
    ...(typeof option.expires === "string"
      ? { expiresIn: Math.round(duration(option.expires, "--expires") / 1000) }
      : {}),
  };
  if (option["no-wait"]) {
    const event = await emitkit.events.create(input);
    print(json, event, () => `${green("Asked")} ${event.id}  ${dim(event.answer?.url ?? "")}`);
    return 0;
  }
  if (!json) {
    process.stderr.write(dim("Waiting for an answer… (Ctrl-C stops waiting; the question stays open)\n"));
  }
  const asked = await emitkit.ask(
    input,
    typeof option.timeout === "string" ? { timeout: duration(option.timeout, "--timeout") } : {}
  );
  print(json, asked, () => eventDetails(asked));
  switch (asked.answer.status) {
    case "answered": {
      return 0;
    }
    case "pending": {
      return 124;
    }
    default: {
      return 1;
    }
  }
};

const tail = async (emitkit: EmitKit, option: Record<string, unknown>, json: boolean) => {
  const channel = option.channel as string | undefined;
  const interval = duration((option.interval as string | undefined) ?? "5s", "--interval");
  const seen = new Set<string>();
  const show = (events: readonly Event[]) => {
    for (const event of events.toReversed()) {
      if (!seen.has(event.id)) {
        seen.add(event.id);
        process.stdout.write(`${json ? JSON.stringify(event) : eventLine(event)}\n`);
      }
    }
  };
  const first = await emitkit.events.list({ channel, limit: 20 });
  show(first.events);
  let since = first.events[0]?.createdAt ?? new Date().toISOString();
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    // since is inclusive: events at the same instant are skipped by id.
    const page = await emitkit.events.list({ channel, limit: 100, since });
    show(page.events);
    since = page.events[0]?.createdAt ?? since;
    if (seen.size > 10_000) {
      seen.clear();
      for (const event of page.events) {
        seen.add(event.id);
      }
    }
  }
};

const fail = (error: unknown, json: boolean) => {
  if (error instanceof UsageError || (error instanceof Error && error.name === "TypeError" && "code" in error)) {
    process.stderr.write(`${json ? JSON.stringify({ error: { code: "usage", message: error.message } }) : `emitkit: ${error.message}`}\n`);
    return 2;
  }
  if (error instanceof EmitKitError) {
    const { code, details, message, requestId, status } = error;
    if (json) {
      process.stderr.write(`${JSON.stringify({ error: { code, details, message, requestId, status } })}\n`);
    } else {
      const hint =
        code === "missing_api_key" || code === "unauthorized"
          ? "\nRun emitkit login, or set EMITKIT_API_KEY."
          : "";
      const problems = details.map((detail) => `\n  ${detail.path.join(".")}: ${detail.message}`).join("");
      process.stderr.write(`emitkit: ${message} (${code}${requestId ? `, request ${requestId}` : ""})${problems}${hint}\n`);
    }
    return 1;
  }
  process.stderr.write(`emitkit: ${error instanceof Error ? error.message : String(error)}\n`);
  return 1;
};

const argv = process.argv.slice(2);
run(argv).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    process.exitCode = fail(error, argv.includes("--json"));
  }
);

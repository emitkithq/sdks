import type { Answer, Channel, Event } from "@emitkit/js";

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number) => (text: string) =>
  color ? `\u001B[${code}m${text}\u001B[0m` : text;
export const dim = paint(2);
export const bold = paint(1);
export const green = paint(32);
export const red = paint(31);

const time = (iso: string) => {
  const at = new Date(iso);
  const today = new Date().toDateString() === at.toDateString();
  return today
    ? at.toLocaleTimeString(undefined, { hour12: false })
    : at.toLocaleString(undefined, { dateStyle: "short", hour12: false, timeStyle: "short" });
};

const answerLine = (answer: Answer) => {
  switch (answer.status) {
    case "answered": {
      const by = answer.by ? ` by ${answer.by.name}` : "";
      return green(`answered ${answer.action}${by}`);
    }
    case "pending": {
      return `waiting for an answer until ${time(answer.expiresAt)}`;
    }
    default: {
      return red(answer.status);
    }
  }
};

/** One line per event: time, channel, icon and title, and the answer if it asked. */
export const eventLine = (event: Event) =>
  [
    dim(time(event.createdAt)),
    dim(`#${event.channelName}`),
    `${event.icon ? `${event.icon} ` : ""}${bold(event.title)}`,
    event.answer ? `(${answerLine(event.answer)})` : "",
  ]
    .filter(Boolean)
    .join("  ");

/** An event in full: what `get` prints. */
export const eventDetails = (event: Event) => {
  const lines = [eventLine(event), dim(event.id)];
  if (event.description) {
    lines.push(event.description);
  }
  for (const [key, value] of Object.entries(event.metadata)) {
    lines.push(`${dim(`${key}:`)} ${JSON.stringify(value)}`);
  }
  if (event.answer) {
    lines.push(`${dim("answer page:")} ${event.answer.url}`);
    if (event.answer.values) {
      for (const [id, value] of Object.entries(event.answer.values)) {
        lines.push(`${dim(`${id}:`)} ${Array.isArray(value) ? value.join(", ") : String(value)}`);
      }
    }
  }
  return lines.join("\n");
};

export const channelLine = (channel: Channel) =>
  `${channel.icon ?? " "}  ${bold(channel.name)}${channel.description ? dim(`  ${channel.description}`) : ""}`;

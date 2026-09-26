# @emitkit/cli

EmitKit from your terminal: send events, ask a person for a decision and wait
for the answer on their phone, and follow what happens.

```bash
npx @emitkit/cli login          # paste an API key (Settings → API keys)
npx @emitkit/cli send deploys "Deployed v1.2.3" -i 🚀
```

Or install it: `npm install -g @emitkit/cli`, then run `emitkit`.

## Commands

```bash
emitkit login [--key emitkit_…]       # checks the key, saves it (readable by you only)
emitkit whoami                        # organization, project, scopes
emitkit logout

emitkit send payments "New subscription" -i 💰 -m amount=49 -m currency=USD -t billing
emitkit send deploys "Nightly build" --silent          # no push

emitkit ask deploys "Ship v1.2.3 to production?" -b ship -b wait:"Not yet" --timeout 30m
emitkit ask support "Reply to Jane?" --text reply:Reply -b send -b skip
emitkit ask ops "Rotate the keys?" -b yes -b no --no-wait   # prints the answer page

emitkit events -c payments -n 20      # recent events, newest last
emitkit tail -c payments              # follow new ones
emitkit get event_…                   # one event and its answer
emitkit cancel event_…                # stop a question from waiting
emitkit channels
emitkit identify user_123 -p plan=pro -a jane@example.com
```

`-m key=value` and `-p key=value` read values as JSON when they parse
(`amount=49` is a number, `trial=true` a boolean), and as text otherwise.

For anything the flags don't cover, pass the whole event as JSON:

```bash
cat refund.json | emitkit ask --input -
```

## In scripts and agents

`--json` prints JSON on stdout, and errors as JSON on stderr:
`{ "error": { "code": "validation_error", "message": …, "details": […] } }`.

`ask` exits `0` when answered, `1` when the question expired or was
canceled, and `124` when it's still waiting at `--timeout`. Usage mistakes
exit `2`, API errors `1`.

```bash
if emitkit ask deploys "Ship it?" -b ship -b hold --timeout 1h --json > answer.json \
  && [ "$(jq -r .answer.action answer.json)" = ship ]; then
  ./deploy.sh
fi
```

## Configuration

| | |
| --- | --- |
| API key | `--api-key`, then `EMITKIT_API_KEY`, then the key saved by `login` |
| API URL | `--api-url`, then `EMITKIT_BASE_URL`, then the saved URL, then `https://api.emitkit.com` (set it for a self-hosted EmitKit) |
| Saved in | `$EMITKIT_CONFIG_DIR`, `$XDG_CONFIG_HOME/emitkit`, or `~/.config/emitkit` |

`NO_COLOR` turns colors off. The CLI never prints your key; `whoami` shows its
first characters.

## License

MIT

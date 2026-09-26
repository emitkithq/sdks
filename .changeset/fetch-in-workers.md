---
"@emitkit/js": patch
---

Fix "Illegal invocation" on every request in Cloudflare Workers: the client called `fetch` as a method of its config object, which workerd rejects. It now calls the global `fetch` (or the one passed in `config.fetch`) unbound.

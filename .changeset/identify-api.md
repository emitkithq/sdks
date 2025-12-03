---
'@emitkit/js': minor
---

Add user identification with properties and aliases

- Add `client.identify()` method for tracking user identities with custom properties and aliases
- Track users with custom properties (email, name, plan, signup date, etc.)
- Create multiple aliases per user (email, username, external IDs)
- Events API automatically resolves aliases to canonical user IDs
- Comprehensive test coverage including partial alias failures
- Full TypeScript support with IntelliSense
- Clean API design following industry best practices (Segment, Amplitude)

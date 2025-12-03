---
'@emitkit/js': minor
---

Add support for Identify API endpoint

- Add `client.identity.identify()` method for tracking user identities with properties and aliases
- Users can now associate custom properties with user IDs
- Aliases allow referencing users by multiple identifiers (email, username, external IDs)
- Events API now automatically resolves aliases to canonical user IDs
- Comprehensive test coverage for identify functionality including partial alias failures
- Updated TypeScript types with full IntelliSense support

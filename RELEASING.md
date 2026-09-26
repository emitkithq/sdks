# Releasing

Releases go through [Changesets](https://github.com/changesets/changesets)
and npm trusted publishing: no npm token anywhere.

1. With your change, add a changeset: `pnpm changeset` (patch, minor or major,
   and a sentence for the changelog). Commit it with the change.
2. Merging to `main` makes the Release workflow open (or update) the
   "chore: release packages" PR, with the versions and changelogs.
3. Merging that PR publishes to npm from GitHub Actions, with provenance.

Each package trusts `release.yml` on npm (package settings → Trusted
publisher → GitHub Actions: `emitkithq` / `sdks` / `release.yml`), and
Actions may open PRs (Settings → Actions → General).

## Prereleases (now: `next`)

The repository is in Changesets pre mode with the `next` tag
(`.changeset/pre.json`), so releases publish as `3.0.0-next.N` under the
`next` dist-tag and `latest` stays where it is. Try one with
`npm install @emitkit/js@next`.

To release 3.0.0 as `latest`: `pnpm changeset pre exit`, commit, merge, then
merge the release PR.

## The CLI's first publish

`@emitkit/cli` doesn't exist on npm yet, and trusted publishing can only be
set up for a package that exists. It is `"private": true` until then, so
releases skip it. Once, by hand:

```bash
pnpm install && pnpm build
cd packages/cli
# remove "private": true from package.json, then:
npm publish --access public --tag next      # asks for your 2FA code
npm trust github @emitkit/cli --file release.yml --repo emitkithq/sdks --allow-publish
```

Commit the removed `"private": true`; from then on the CLI releases like the SDK.

## Syncing the API

`pnpm sync` fetches `https://api.emitkit.com/openapi.json`
(`EMITKIT_OPENAPI_URL` for another EmitKit), and `pnpm generate` regenerates
`packages/js/src/generated/openapi.ts`. The Sync workflow does both daily and
opens a PR when the document changed. If `pnpm lint` fails on
`src/contract.ts`, update `packages/js/src/types.ts` to match, and add a
changeset.

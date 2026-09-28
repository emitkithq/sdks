# Releasing

Releases go through [Changesets](https://github.com/changesets/changesets)
and npm trusted publishing: no npm token anywhere.

1. With your change, add a changeset: `pnpm changeset` (patch, minor or major,
   and a sentence for the changelog). Commit it with the change.
2. Merging to `main` makes the Release workflow open (or update) the
   "chore: release packages" PR, with the versions and changelogs.
3. Merging that PR publishes to npm from GitHub Actions, with provenance.

Each package trusts `release.yml` on npm (package settings → Trusted
publisher → GitHub Actions: `emitkithq` / `sdks` / `release.yml`).

Step 2 needs Actions to be allowed to open PRs (organization and repository
Settings → Actions → General → "Allow GitHub Actions to create and approve
pull requests"). While the emitkithq organization has that off, the Release
workflow stops there; open the release PR by hand instead:

```bash
git checkout -b release && pnpm changeset version
git commit -am "chore: release packages" && gh pr create --fill
```

Merging it runs the Release workflow, which finds no pending changesets and
publishes.

## Prereleases (now: `next`)

The repository is in Changesets pre mode with the `next` tag
(`.changeset/pre.json`), so releases publish as `3.0.0-next.N` under the
`next` dist-tag and `latest` stays where it is. Try one with
`npm install @emitkit/js@next`.

To release 3.0.0 as `latest`: `pnpm changeset pre exit`, commit, merge, then
merge the release PR.

## Adding a package

npm trusted publishing can only be set up for a package that exists, so a new
package's first version is published by hand (`npm publish --access public
--tag next`, with your 2FA code), then trusted on npmjs.com: package →
Settings → Trusted Publisher → GitHub Actions, organization `emitkithq`,
repository `sdks`, workflow `release.yml`. From then on it releases like the
others. `@emitkit/cli` went this way with 0.1.0-next.0.

## Syncing the API

`pnpm sync` fetches `https://api.emitkit.com/openapi.json`
(`EMITKIT_OPENAPI_URL` for another EmitKit), and `pnpm generate` regenerates
`packages/js/src/generated/openapi.ts`. The Sync workflow does both daily and
opens a PR when the document changed. If `pnpm lint` fails on
`src/contract.ts`, update `packages/js/src/types.ts` to match, and add a
changeset.

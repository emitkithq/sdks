# Release Guide

This guide explains how to release new versions of the EmitKit SDKs.

## Prerequisites

1. **npm Access**: You need publish access to the `@emitkit` organization on npm
2. **GitHub Permissions**: Write access to the repository
3. **Secrets Configured**:
   - `NPM_TOKEN` - npm authentication token with publish access
   - `GITHUB_TOKEN` - Automatically provided by GitHub Actions

## Release Process (Automated with Changesets)

### 1. Make Changes

Make your changes to the SDK (e.g., update client wrapper, fix bugs, add features).

### 2. Create a Changeset

When you're ready to release, create a changeset describing your changes:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages to bump (e.g., `@emitkit/js`)
2. Choose the version bump type:
   - **patch** (0.0.X) - Bug fixes, minor updates
   - **minor** (0.X.0) - New features, backward compatible
   - **major** (X.0.0) - Breaking changes
3. Write a summary of the changes

The changeset will be saved in `.changeset/` directory.

### 3. Commit and Push

```bash
git add .
git commit -m "feat: add new SDK features"
git push origin main
```

### 4. Automated Release

When changes are pushed to `main`:

1. **GitHub Actions** runs the release workflow
2. **Changesets** creates a "Release" pull request with:
   - Updated package versions
   - Generated CHANGELOG.md
   - All pending changesets applied
3. **Review the PR** - Check the version bumps and changelog
4. **Merge the PR** - This triggers the actual publish to npm

### 5. Verify Release

After the PR is merged:

1. Check npm: https://www.npmjs.com/package/@emitkit/js
2. Check GitHub Releases: https://github.com/emitkit/emitkit-sdks/releases

## Manual Release (Fallback)

If you need to release manually:

### 1. Version Packages

```bash
# Apply changesets and update versions
pnpm changeset version
```

This updates `package.json` versions and generates CHANGELOGs.

### 2. Build and Test

```bash
# Sync latest OpenAPI spec
pnpm run sync

# Generate SDKs
pnpm run generate

# Run tests
pnpm run test

# Build packages
pnpm run build
```

### 3. Publish to npm

```bash
# Make sure you're logged in
npm login

# Publish all packages
pnpm run release
```

### 4. Create Git Tag

```bash
git tag @emitkit/js@1.0.1
git push --tags
```

## Version Guidelines

### Patch (0.0.X)

- Bug fixes
- Documentation updates
- Performance improvements
- Internal refactoring

Example changeset:
```bash
pnpm changeset
# Select: @emitkit/js
# Type: patch
# Summary: Fix rate limit header parsing
```

### Minor (0.X.0)

- New features (backward compatible)
- New API endpoints added
- Enhanced functionality

Example changeset:
```bash
pnpm changeset
# Select: @emitkit/js
# Type: minor
# Summary: Add webhook signature verification
```

### Major (X.0.0)

- Breaking changes
- API redesign
- Removed/renamed public APIs

Example changeset:
```bash
pnpm changeset
# Select: @emitkit/js
# Type: major
# Summary: BREAKING: Rename EmitKit to EmitKitClient
```

## OpenAPI Spec Updates

When the OpenAPI spec is updated:

### Automatic (Recommended)

The daily sync workflow automatically:
1. Fetches the latest spec at midnight UTC
2. Regenerates SDKs
3. Creates a PR if changes detected

### Manual

```bash
# Sync from production
pnpm run sync

# Or from development
ENV=development pnpm run sync

# Regenerate SDKs
pnpm run generate

# Create changeset
pnpm changeset
# Type: patch (if just types updated) or minor (if new endpoints)
# Summary: Update OpenAPI spec to v2.1.0

# Commit and push
git add .
git commit -m "chore: sync OpenAPI spec"
git push
```

## Troubleshooting

### "npm ERR! 403 Forbidden"

You don't have publish access. Contact the package maintainer.

### "Version already exists"

The version is already published. Bump the version in `package.json` or create a new changeset.

### Tests Failing

Don't publish if tests fail. Fix the issues first:

```bash
pnpm run test
pnpm run lint
```

### OpenAPI Sync Fails

Check if the API endpoint is accessible:

```bash
curl https://api.emitkit.com/api/openapi.json
```

## Release Checklist

Before merging a release PR:

- [ ] Version bumps are correct
- [ ] CHANGELOG.md is accurate
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Documentation is updated (if needed)
- [ ] Breaking changes are clearly documented

## Post-Release

After a successful release:

1. **Announce** - Share the release in relevant channels
2. **Update Docs** - If using external docs (like Mintlify), they should auto-update
3. **Monitor** - Check npm download stats and GitHub issues for problems
4. **Test** - Verify the published package works:

```bash
# Create a test project
mkdir test-@emitkit/js
cd test-@emitkit/js
npm init -y
npm install @emitkit/js

# Test the import
node -e "const { EmitKit } = require('@emitkit/js'); console.log('SDK loaded successfully');"
```

## References

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)

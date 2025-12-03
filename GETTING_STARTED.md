# Getting Started with EmitKit SDKs

This guide will help you set up the EmitKit SDKs monorepo for development.

## Prerequisites

- **Node.js** 20 or higher
- **pnpm** 9 or higher (install with `npm install -g pnpm`)
- **Git**

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/emitkit/emitkit-sdks.git
cd emitkit-sdks
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install dependencies for all packages in the monorepo.

### 3. Sync OpenAPI Specification

Fetch the latest OpenAPI spec from the EmitKit API:

```bash
pnpm run sync
```

This downloads the OpenAPI spec to `openapi/openapi.json`.

**For local development** (if your API is running locally):

```bash
ENV=development pnpm run sync
```

### 4. Generate SDKs

Generate all SDK packages from the OpenAPI spec:

```bash
pnpm run generate
```

This will:
- Generate TypeScript types and client code
- Create type definitions
- Set up the API client

### 5. Build Packages

Build all SDK packages:

```bash
pnpm run build
```

### 6. Run Tests

Verify everything works:

```bash
pnpm run test
```

## Development Workflow

### Watch Mode

Run in watch mode for development:

```bash
pnpm run dev
```

This will rebuild packages automatically when source files change.

### Making Changes

1. **Modify the wrapper code** in `packages/js/src/` (not in `src/generated/`)
2. **Add tests** in `packages/js/tests/`
3. **Run tests**: `pnpm run test`
4. **Build**: `pnpm run build`

### Regenerating SDKs

After OpenAPI spec changes:

```bash
pnpm run sync      # Fetch latest spec
pnpm run generate  # Regenerate SDKs
pnpm run build     # Rebuild packages
pnpm run test      # Run tests
```

## Testing the SDK Locally

### Option 1: Link Locally

```bash
# In emitkit-sdks/packages/js
pnpm link

# In your test project
pnpm link @emitkit/js
```

### Option 2: Use Relative Path

```json
{
  "dependencies": {
    "@emitkit/js": "file:../emitkit-sdks/packages/js"
  }
}
```

### Option 3: Run Examples

```bash
cd packages/js
pnpm tsx examples/basic.ts
```

## Project Structure

```
emitkit-sdks/
├── packages/
│   └── js/                     # TypeScript SDK
│       ├── src/
│       │   ├── generated/      # Auto-generated (don't edit!)
│       │   ├── index.ts        # Main exports
│       │   ├── client.ts       # Custom wrapper
│       │   └── types.ts        # Additional types
│       ├── examples/           # Usage examples
│       ├── tests/              # Unit tests
│       └── package.json
├── scripts/
│   ├── sync-openapi.ts        # Fetch OpenAPI spec
│   └── generate.ts            # Generate SDKs
├── openapi/
│   └── openapi.json           # Synced spec
└── package.json               # Root workspace
```

## Common Commands

```bash
# Sync OpenAPI spec
pnpm run sync

# Generate SDKs
pnpm run generate

# Build all packages
pnpm run build

# Run tests
pnpm run test

# Watch mode
pnpm run dev

# Type check
pnpm run lint

# Clean build artifacts
pnpm run clean
```

## Troubleshooting

### Generated Files Missing

If you see import errors for generated files:

```bash
pnpm run sync      # Fetch spec
pnpm run generate  # Generate code
```

### Build Errors

Try cleaning and rebuilding:

```bash
pnpm run clean
pnpm install
pnpm run sync
pnpm run generate
pnpm run build
```

### Test Failures

Ensure you have the latest spec:

```bash
pnpm run sync
pnpm run generate
pnpm run test
```

## Publishing (Maintainers Only)

### Manual Release

```bash
# Bump version
cd packages/js
pnpm version patch  # or minor, major

# Build and test
cd ../..
pnpm run build
pnpm run test

# Publish
cd packages/js
pnpm publish --access public
```

### Automated Release

Create a version tag:

```bash
git tag @emitkit/js@1.0.1
git push --tags
```

GitHub Actions will automatically publish to npm.

## Next Steps

- Read the [JavaScript SDK README](./packages/js/README.md)
- Check out the [examples](./packages/js/examples/)
- Read the [Contributing Guide](./CONTRIBUTING.md)

## Getting Help

- [GitHub Issues](https://github.com/emitkit/emitkit-sdks/issues)
- [EmitKit Documentation](https://emitkit.com/docs)
- [Discord Community](https://discord.gg/emitkit)

# EmitKit SDKs

Official SDKs for the EmitKit API - Real-time event tracking and notifications

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI Status](https://github.com/emitkit/emitkit-sdks/workflows/Test/badge.svg)](https://github.com/emitkit/emitkit-sdks/actions)

## 📦 Available SDKs

| Language | Package | Version | Documentation |
|----------|---------|---------|---------------|
| **TypeScript/JavaScript** | [`@emitkit/js`](./packages/js) | [![npm](https://img.shields.io/npm/v/@emitkit/js)](https://www.npmjs.com/package/@emitkit/js) | [Docs](./packages/js/README.md) |

## 🚀 Quick Start

### JavaScript/TypeScript

```bash
npm install @emitkit/js
# or
pnpm add @emitkit/js
# or
yarn add @emitkit/js
```

```typescript
import { EmitKit } from '@emitkit/js';

const client = new EmitKit('emitkit_xxxxxxxxxxxxxxxxxxxxx');

await client.events.create({
  channelName: 'payments',
  title: 'Payment Received',
  metadata: { amount: 99.99 }
});
```

## 🏗️ Architecture

This is a **monorepo** containing multiple SDK packages, all auto-generated from the [EmitKit OpenAPI specification](https://api.emitkit.com/api/openapi.json).

### Structure

```
@emitkit/jss/
├── packages/
│   ├── js/          # TypeScript/JavaScript SDK
│   └── ...          # Future SDKs
├── scripts/         # Automation scripts
└── openapi/         # Synced OpenAPI spec
```

### Automation

- **Daily Sync**: OpenAPI spec is automatically synced from production API
- **Auto-Generation**: SDKs are regenerated when the spec changes
- **Auto-Publishing**: New versions are published to npm on release tags
- **CI/CD**: Tests run on all pull requests

## 🛠️ Development

### Prerequisites

- Node.js 20+
- pnpm 9+

### Setup

```bash
# Clone the repository
git clone https://github.com/emitkit/emitkit-sdks.git
cd @emitkit/jss

# Install dependencies
pnpm install

# Sync OpenAPI spec
pnpm run sync

# Generate all SDKs
pnpm run generate

# Build all packages
pnpm run build

# Run tests
pnpm run test
```

### Development Workflow

```bash
# Watch mode for development
pnpm run dev

# Lint code
pnpm run lint

# Clean build artifacts
pnpm run clean
```

## 📝 Adding a New SDK

1. Create a new package directory: `packages/<language>/`
2. Add generator configuration
3. Update `scripts/generate.ts` to include the new SDK
4. Add package to `SDK_PACKAGES` array

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

### Reporting Issues

If you find a bug or have a feature request, please [open an issue](https://github.com/emitkit/emitkit-sdks/issues).

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

## 🔗 Links

- [EmitKit Documentation](https://emitkit.com/docs)
- [API Reference](https://api.emitkit.com/api/docs)
- [OpenAPI Spec](https://api.emitkit.com/api/openapi.json)
- [Main Repository](https://github.com/emitkit/blip-sk)

---

**Note**: These SDKs are automatically generated from the OpenAPI specification. Do not edit generated files directly.

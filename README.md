# Plugin Quick Starter

A minimal backend-only plugin template for ElizaOS. This template provides a clean starting point for creating simple plugins without frontend complexity.

## Overview

This quick-starter template is ideal for:

- Backend-only plugins
- Simple API integrations
- Services and providers
- Actions without UI components
- Lightweight extensions

## Structure

```
plugin-ar/
├── src/
│   ├── __tests__/          # Unit tests
│   │   ├── plugin.test.ts
│   │   └── test-utils.ts
│   ├── plugin.ts           # Main plugin implementation
│   ├── tests.ts            # Plugin test suite
│   └── index.ts            # Plugin export
├── scripts/
│   └── install-test-deps.js # Test dependency installer
├── tsup.config.ts          # Build configuration
├── tsconfig.json           # TypeScript config
├── package.json            # Minimal dependencies
└── README.md               # This file
```

## Getting Started

1. **Create your plugin:**

   ```bash
   elizaos create my-plugin
   # Select: Plugin
   # Select: Quick Plugin (Backend Only)
   ```

2. **Navigate to your plugin:**

   ```bash
   cd my-plugin
   ```

3. **Install dependencies:**

   ```bash
   bun install
   ```

4. **Start development:**
   ```bash
   bun run dev
   ```

## Key Features

### Minimal Dependencies

- Only essential packages (`@elizaos/core`, `zod`)
- No frontend frameworks or build tools
- Fast installation and builds

### Simple Testing

- Unit tests only with Bun test runner
- No E2E or component testing overhead
- Quick test execution

### Backend Focus

- API routes for server-side functionality
- Services for state management
- Actions for agent capabilities
- Providers for contextual data

## Plugin Components

### Actions

Define agent capabilities:

```typescript
const myAction: Action = {
  name: 'MY_ACTION',
  description: 'Description of what this action does',
  validate: async (runtime, message, state) => {
    // Validation logic
    return true;
  },
  handler: async (runtime, message, state, options, callback) => {
    // Action implementation
    return { success: true, data: {} };
  },
};
```

### Services

Manage plugin state:

```typescript
export class MyService extends Service {
  static serviceType = 'my-service';

  async start() {
    // Initialize service
  }

  async stop() {
    // Cleanup
  }
}
```

### Providers

Supply contextual information:

```typescript
const myProvider: Provider = {
  name: 'MY_PROVIDER',
  description: 'Provides contextual data',
  get: async (runtime, message, state) => {
    return {
      text: 'Provider data',
      values: {},
      data: {},
    };
  },
};
```

### API Routes

Backend endpoints:

```typescript
routes: [
  {
    name: 'api-endpoint',
    path: '/api/endpoint',
    type: 'GET',
    handler: async (req, res) => {
      res.json({ data: 'response' });
    },
  },
];
```

## Development Commands

```bash
# Start in development mode with hot reload
bun run dev

# Start in production mode
bun run start

# Build the plugin
bun run build

# Run tests
bun test

# Format code
bun run format
```

## Testing

Write unit tests in `src/__tests__/`:

```typescript
import { describe, it, expect } from 'bun:test';

describe('My Plugin', () => {
  it('should work correctly', () => {
    expect(true).toBe(true);
  });
});
```

## Publishing

1. Update `package.json` with your plugin details
2. Build your plugin: `bun run build`
3. Publish: `elizaos publish`

## When to Use Quick Starter

Use this template when you need:

- ✅ Backend-only functionality
- ✅ Simple API integrations
- ✅ Lightweight plugins
- ✅ Fast development cycles
- ✅ Minimal dependencies

Consider the full plugin-ar if you need:

- ❌ React frontend components
- ❌ Complex UI interactions
- ❌ E2E testing with Cypress
- ❌ Frontend build pipeline

## License

This template is part of the ElizaOS project.



# Arweave Plugin for ElizaOS

This plugin integrates Arweave network capabilities into ElizaOS, enabling permanent data storage and token transfers.

## Features

### Actions
- **CREATE_ARWEAVE_WALLET**: Creates a new Arweave wallet
- **UPLOAD_TO_ARWEAVE**: Uploads data to the Arweave network
- **RETRIEVE_FROM_ARWEAVE**: Retrieves data from Arweave using transaction ID
- **TRANSFER_AR_TOKENS**: Transfers AR tokens to another wallet
- **SEARCH_ARWEAVE**: Searches for transactions using tags

### Providers
- **ARWEAVE_STATUS**: Provides current network status and block information
- **WALLET_INFO**: Shows current wallet address and balance

### Evaluators
- **ARWEAVE_TRANSACTION_TRACKER**: Monitors transaction confirmations and notifies when confirmed

## Installation

```bash
bun add arweave-plugin
```

## Configuration

1. Add the plugin to your ElizaOS agent configuration
2. Set environment variables:
   - `ARWEAVE_WALLET_KEY`: Your Arweave wallet private key (optional but required for wallet operations)

## Usage

### Creating a Wallet
```
Create a new Arweave wallet
```

### Uploading Data
```
Upload "Hello World" to Arweave with content-type=text/plain
```

### Retrieving Data
```
Retrieve data from Arweave transaction abc123...
```

### Transferring Tokens
```
Transfer 1.5 AR to zYxWvU... 
```

### Searching Data
```
Search arweave with tag:content-type=text/html
```

## Security

- Wallet private keys should be stored securely using environment variables
- The plugin follows Arweave best practices for transaction signing and data upload
- All operations include comprehensive error handling

## Development

### Running Tests
```bash
bun test
```

### Building
```bash
bun run build
```

## License

MIT

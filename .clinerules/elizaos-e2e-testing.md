---
title: ElizaOS End-to-End Runtime Testing Guide
alwaysApply: true
---

# ElizaOS End-to-End Runtime Testing

This guide explains how to create end-to-end (E2E) runtime tests for ElizaOS projects and plugins using the ElizaOS CLI test runner.

## Overview

ElizaOS E2E tests are **real runtime tests** that:

- Execute against actual ElizaOS runtime instances with live services
- Use real database (in-memory PGLite for testing), plugins, and AI capabilities
- Create real messages, memories, and interactions
- Verify actual agent behaviors and responses
- Are run using the `elizaos test` command which wraps vitest

## Core Interfaces

```typescript
import type { IAgentRuntime } from '@elizaos/core';

/**
 * Represents a test case for evaluating agent or plugin functionality.
 */
export interface TestCase {
  /** A descriptive name for the test case */
  name: string;
  /** The test function that receives the runtime instance */
  fn: (runtime: IAgentRuntime) => Promise<void> | void;
}

/**
 * Represents a suite of related test cases.
 */
export interface TestSuite {
  /** A descriptive name for the test suite */
  name: string;
  /** An array of TestCase objects */
  tests: TestCase[];
}
```

## Test Structure

### 1. Test Suite Class Implementation

```typescript
import { type TestSuite } from '@elizaos/core';

export class MyTestSuite implements TestSuite {
  name = 'my-test-suite';
  description = 'E2E tests for my feature';

  tests = [
    {
      name: 'Test case 1',
      fn: async (runtime: any) => {
        // Test implementation
        // Throw error on failure
      },
    },
    {
      name: 'Test case 2',
      fn: async (runtime: any) => {
        // Another test
      },
    },
  ];
}

// Export default instance for test runner
export default new MyTestSuite();
```

### 2. Test Suite Organization

For projects with multiple test files:

```typescript
// src/__tests__/e2e/index.ts
import projectTestSuite from './project';
import featureTestSuite from './feature';
import integrationTestSuite from './integration';

export const testSuites = [projectTestSuite, featureTestSuite, integrationTestSuite];

export default testSuites;
```

### 3. Plugin Integration

For plugins, add the test suite to the plugin's `tests` property:

```typescript
// In plugin's tests.ts
export { MyPluginTestSuite } from './__tests__/e2e/my-plugin';

// In plugin's index.ts
import { MyPluginTestSuite } from './tests';

export const myPlugin: Plugin = {
  name: 'my-plugin',
  description: 'My plugin description',
  tests: [MyPluginTestSuite], // Add test suite here
  actions: [...],
  providers: [...],
  // ... other plugin properties
};
```

## Writing E2E Tests

### Key Principles

1. **Real Runtime**: Tests receive an actual `IAgentRuntime` instance - no mocks
2. **Real Environment**: Database, services, and plugins are fully initialized
3. **Real Interactions**: Test actual message processing and agent responses
4. **Error = Failure**: Tests pass if no errors are thrown, fail if errors occur
5. **Independent Tests**: Each test should work in isolation

### Basic Test Pattern

```typescript
{
  name: 'My feature test',
  fn: async (runtime: any) => {
    try {
      // 1. Set up test data
      const testData = {
        // Your test setup
      };

      // 2. Execute the feature
      const result = await runtime.someMethod(testData);

      // 3. Verify the results
      if (!result) {
        throw new Error('Expected result but got nothing');
      }

      // Test passes if we reach here without throwing
    } catch (error) {
      // Re-throw with context for debugging
      throw new Error(`My feature test failed: ${(error as Error).message}`);
    }
  },
}
```

## Common Testing Patterns

### 1. Testing Character Configuration

```typescript
{
  name: 'Character configuration test',
  fn: async (runtime: any) => {
    const character = runtime.character;

    // Verify required fields
    if (!character.name) {
      throw new Error('Character name is missing');
    }

    if (!Array.isArray(character.bio)) {
      throw new Error('Character bio should be an array');
    }

    if (!character.system) {
      throw new Error('Character system prompt is missing');
    }
  },
}
```

### 2. Testing Natural Language Processing

```typescript
{
  name: 'Agent responds to hello world',
  fn: async (runtime: any) => {
    // Create unique identifiers
    const roomId = `test-room-${Date.now()}`;
    const userId = 'test-user';

    // Create message
    const message = {
      id: `msg-${Date.now()}`,
      userId: userId,
      agentId: runtime.agentId,
      roomId: roomId,
      content: {
        text: 'hello world',
        type: 'text',
      },
      createdAt: Date.now(),
    };

    // Process message
    await runtime.processMessage(message);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Retrieve messages
    const messages = await runtime.messageManager.getMessages({
      roomId,
      limit: 10,
    });

    // Verify response
    const agentResponse = messages.find(
      m => m.userId === runtime.agentId && m.id !== message.id
    );

    if (!agentResponse) {
      throw new Error('Agent did not respond');
    }

    console.log('Agent response:', agentResponse.content.text);
  },
}
```

### 3. Testing Actions

```typescript
{
  name: 'Action execution test',
  fn: async (runtime: any) => {
    // Find action
    const action = runtime.actions.find(a => a.name === 'MY_ACTION');
    if (!action) {
      throw new Error('MY_ACTION not found');
    }

    // Create test message
    const message = {
      entityId: uuidv4(),
      roomId: uuidv4(),
      content: {
        text: 'Test message',
        source: 'test',
        actions: ['MY_ACTION'], // Explicitly request action
      },
    };

    // Create state
    const state = {
      values: {},
      data: {},
      text: '',
    };

    // Set up callback
    let responseReceived = false;
    const callback = async (content) => {
      if (content.actions?.includes('MY_ACTION')) {
        responseReceived = true;
      }
      return [];
    };

    // Execute action
    await action.handler(runtime, message, state, {}, callback, []);

    if (!responseReceived) {
      throw new Error('Action did not execute properly');
    }
  },
}
```

### 4. Testing Providers

```typescript
{
  name: 'Provider functionality test',
  fn: async (runtime: any) => {
    const provider = runtime.providers.find(
      p => p.name === 'MY_PROVIDER'
    );

    if (!provider) {
      throw new Error('MY_PROVIDER not found');
    }

    const result = await provider.get(runtime, message, state);

    if (!result.text) {
      throw new Error('Provider returned no text');
    }
  },
}
```

### 5. Testing Services

```typescript
{
  name: 'Service lifecycle test',
  fn: async (runtime: any) => {
    const service = runtime.getService('my-service');

    if (!service) {
      throw new Error('Service not found');
    }

    // Test service methods
    const result = await service.someMethod();

    if (!result) {
      throw new Error('Service method failed');
    }

    // Test cleanup
    await service.stop();
  },
}
```

### 6. Testing Conversation Context

```typescript
{
  name: 'Agent maintains conversation context',
  fn: async (runtime: any) => {
    const roomId = `test-room-${Date.now()}`;
    const userId = 'test-user';

    // First message
    await runtime.processMessage({
      id: `msg-1`,
      userId,
      roomId,
      content: { text: 'My favorite color is blue.' },
      createdAt: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Follow-up message
    await runtime.processMessage({
      id: `msg-2`,
      userId,
      roomId,
      content: { text: 'What color did I just mention?' },
      createdAt: Date.now() + 1000,
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check responses
    const messages = await runtime.messageManager.getMessages({ roomId });
    const responses = messages.filter(m => m.userId === runtime.agentId);

    if (responses.length < 2) {
      throw new Error('Agent did not respond to both messages');
    }

    // Verify context awareness
    const lastResponse = responses[responses.length - 1];
    if (!lastResponse.content.text.toLowerCase().includes('blue')) {
      throw new Error('Agent did not maintain context');
    }
  },
}
```

## File Organization

### For Projects

```
src/
├── __tests__/
│   └── e2e/
│       ├── index.ts           # Test suite exports
│       ├── project.ts         # Project-specific tests
│       ├── natural-language.ts # NLP tests
│       └── integration.ts     # Integration tests
├── index.ts                   # Project entry point
└── character.json             # Character configuration
```

### For Plugins

```
src/
├── __tests__/
│   └── e2e/
│       └── plugin-tests.ts    # Plugin test suite
├── tests.ts                   # Test exports
├── index.ts                   # Plugin definition
├── actions/                   # Action implementations
└── providers/                 # Provider implementations
```

## Running Tests

### Commands

```bash
# Run all tests (from project or plugin directory)
elizaos test

# Or using npm script
npm test

# For coverage (if configured)
npm run test:coverage
```

### Test Output Best Practices

Use console.log for test progress:

```typescript
console.log('Starting my feature test...');
console.log('✓ Step 1 completed');
console.log('✓ Step 2 completed');
console.log('✅ My feature test PASSED');

// On failure
console.error('❌ My feature test FAILED:', error);
```

## Best Practices

1. **Descriptive Names**: Use clear test names that describe what is being tested
2. **Error Context**: Always wrap errors with additional context
3. **Console Logging**: Log progress for easier debugging
4. **Async Handling**: Use appropriate delays for async operations
5. **Unique IDs**: Use timestamps or UUIDs to avoid conflicts
6. **Test Independence**: Don't rely on state from other tests
7. **Real Verifications**: Check actual runtime behavior, not mocked responses

## Common Issues and Solutions

### Runtime Methods Undefined

- Ensure you're using the actual runtime instance provided
- Check that required plugins are loaded in character config
- Verify services are initialized

### Timing Issues

```typescript
// Add delays after async operations
await new Promise((resolve) => setTimeout(resolve, 1000));
```

### Message Processing

- Use unique room IDs to isolate conversations
- Wait for message processing to complete
- Query messages with appropriate filters

### Type Safety

- The runtime parameter is typed as `any` in examples for flexibility
- Cast to specific types when needed for better IDE support

## Advanced Patterns

### Testing Multiple Interactions

```typescript
for (const greeting of ['hello', 'hi', 'hey']) {
  const roomId = `test-${Date.now()}-${Math.random()}`;

  await runtime.processMessage({
    roomId,
    content: { text: greeting },
    // ... other fields
  });

  // Verify each response
}
```

### Parallel Test Execution

```typescript
const promises = messages.map(async (msg) => {
  return runtime.processMessage(msg);
});

await Promise.all(promises);
```

## Summary

ElizaOS E2E tests provide a powerful way to verify agent behavior in a real runtime environment. By following these patterns and best practices, you can create comprehensive test suites that ensure your agents and plugins work correctly with actual language processing, database operations, and service interactions.

Remember: **No mocks, real runtime, throw errors to fail.**

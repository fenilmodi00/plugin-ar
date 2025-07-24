---
title: ElizaOS Unit Testing Guide
alwaysApply: true
---

# ElizaOS Unit Testing

This guide explains how to write effective unit tests for ElizaOS components using the ElizaOS CLI test runner, which wraps Vitest under the hood.

## Overview

ElizaOS unit tests focus on testing individual components in isolation:

- Test single functions, actions, providers, or services
- Use mocks for all dependencies (especially `IAgentRuntime`)
- Run via `elizaos test` command (wraps Vitest)
- Aim for >75% code coverage on testable components
- Ensure all tests pass before considering work complete

## Key Differences from E2E Tests

| Unit Tests        | E2E Tests         |
| ----------------- | ----------------- |
| Mock the runtime  | Use real runtime  |
| Test in isolation | Test integration  |
| Fast execution    | Slower execution  |
| No side effects   | Real side effects |
| Vitest primitives | Runtime instance  |

## Test Structure

### File Organization

```
packages/my-plugin/
├── src/
│   ├── __tests__/
│   │   ├── actions/
│   │   │   └── my-action.test.ts
│   │   ├── providers/
│   │   │   └── my-provider.test.ts
│   │   ├── services/
│   │   │   └── my-service.test.ts
│   │   └── test-utils.ts         # Shared mock utilities
│   ├── actions/
│   │   └── my-action.ts
│   ├── providers/
│   │   └── my-provider.ts
│   └── index.ts
```

### Basic Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myComponent } from '../my-component';
import { createMockRuntime } from '../test-utils';

describe('MyComponent', () => {
  let mockRuntime: any;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    mockRuntime = createMockRuntime();
  });

  it('should handle valid input correctly', async () => {
    // Arrange
    const input = { text: 'valid input' };

    // Act
    const result = await myComponent.process(mockRuntime, input);

    // Assert
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    // Arrange
    const input = { text: '' };

    // Act & Assert
    await expect(myComponent.process(mockRuntime, input)).rejects.toThrow('Input cannot be empty');
  });
});
```

## Creating Mock Runtime

The most critical part of unit testing is mocking the `IAgentRuntime`. Create a reusable mock factory:

```typescript
// src/__tests__/test-utils.ts
import { vi } from 'vitest';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';

export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  return {
    // Core properties
    agentId: 'test-agent-id',
    character: {
      name: 'TestAgent',
      bio: ['Test bio'],
      system: 'Test system prompt',
      messageExamples: [],
      postExamples: [],
      topics: [],
      adjectives: [],
      knowledge: [],
      clients: [],
      plugins: [],
    },

    // Settings
    getSetting: vi.fn((key: string) => {
      const settings: Record<string, string> = {
        API_KEY: 'test-api-key',
        SECRET_KEY: 'test-secret',
        ...overrides.settings,
      };
      return settings[key];
    }),

    // Services
    getService: vi.fn((name: string) => {
      const services: Record<string, any> = {
        'test-service': {
          start: vi.fn(),
          stop: vi.fn(),
          doSomething: vi.fn().mockResolvedValue('service result'),
        },
        ...overrides.services,
      };
      return services[name];
    }),

    // Model/LLM
    useModel: vi.fn().mockResolvedValue('mock model response'),
    generateText: vi.fn().mockResolvedValue('generated text'),

    // Memory operations
    messageManager: {
      createMemory: vi.fn().mockResolvedValue(true),
      getMemories: vi.fn().mockResolvedValue([]),
      updateMemory: vi.fn().mockResolvedValue(true),
      deleteMemory: vi.fn().mockResolvedValue(true),
      searchMemories: vi.fn().mockResolvedValue([]),
      getLastMessages: vi.fn().mockResolvedValue([]),
    },

    // State
    composeState: vi.fn().mockResolvedValue({
      values: {},
      data: {},
      text: '',
    }),
    updateState: vi.fn().mockResolvedValue(true),

    // Actions & Providers
    actions: [],
    providers: [],
    evaluators: [],

    // Components
    createComponent: vi.fn().mockResolvedValue(true),
    getComponents: vi.fn().mockResolvedValue([]),
    updateComponent: vi.fn().mockResolvedValue(true),

    // Database
    db: {
      query: vi.fn().mockResolvedValue([]),
      execute: vi.fn().mockResolvedValue({ changes: 1 }),
      getWorlds: vi.fn().mockResolvedValue([]),
      getWorld: vi.fn().mockResolvedValue(null),
    },

    // Logging
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },

    // Apply any overrides
    ...overrides,
  } as unknown as IAgentRuntime;
}

// Helper to create mock memory objects
export function createMockMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'test-memory-id',
    entityId: 'test-entity-id',
    roomId: 'test-room-id',
    agentId: 'test-agent-id',
    content: {
      text: 'test message',
      source: 'test',
    },
    createdAt: Date.now(),
    ...overrides,
  } as Memory;
}

// Helper to create mock state
export function createMockState(overrides: Partial<State> = {}): State {
  return {
    values: {},
    data: {},
    text: '',
    ...overrides,
  } as State;
}
```

## Testing Patterns

### Testing Actions

```typescript
// src/actions/__tests__/my-action.test.ts
import { describe, it, expect, vi } from 'vitest';
import { myAction } from '../my-action';
import { createMockRuntime, createMockMemory, createMockState } from '../../__tests__/test-utils';

describe('MyAction', () => {
  describe('validate', () => {
    it('should return true when all requirements are met', async () => {
      const mockRuntime = createMockRuntime({
        getService: vi.fn().mockReturnValue({ isReady: true }),
      });
      const mockMessage = createMockMemory();

      const isValid = await myAction.validate(mockRuntime, mockMessage);

      expect(isValid).toBe(true);
    });

    it('should return false when service is not available', async () => {
      const mockRuntime = createMockRuntime({
        getService: vi.fn().mockReturnValue(null),
      });
      const mockMessage = createMockMemory();

      const isValid = await myAction.validate(mockRuntime, mockMessage);

      expect(isValid).toBe(false);
    });
  });

  describe('handler', () => {
    it('should process message and return response', async () => {
      const mockRuntime = createMockRuntime();
      const mockMessage = createMockMemory({
        content: { text: 'do something', source: 'test' },
      });
      const mockState = createMockState();
      const mockCallback = vi.fn();

      const result = await myAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback);

      expect(result).toBeDefined();
      expect(result.text).toContain('success');
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.any(String),
          actions: expect.arrayContaining(['MY_ACTION']),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const mockRuntime = createMockRuntime({
        getService: vi.fn().mockImplementation(() => {
          throw new Error('Service error');
        }),
      });
      const mockMessage = createMockMemory();
      const mockState = createMockState();

      await expect(myAction.handler(mockRuntime, mockMessage, mockState)).rejects.toThrow(
        'Service error'
      );
    });
  });
});
```

### Testing Providers

```typescript
// src/providers/__tests__/my-provider.test.ts
import { describe, it, expect, vi } from 'vitest';
import { myProvider } from '../my-provider';
import { createMockRuntime, createMockMemory, createMockState } from '../../__tests__/test-utils';

describe('MyProvider', () => {
  it('should provide context information', async () => {
    const mockRuntime = createMockRuntime({
      getSetting: vi.fn().mockReturnValue('test-value'),
    });
    const mockMessage = createMockMemory();
    const mockState = createMockState();

    const result = await myProvider.get(mockRuntime, mockMessage, mockState);

    expect(result).toBeDefined();
    expect(result.text).toContain('Provider context');
    expect(result.values).toHaveProperty('setting', 'test-value');
  });

  it('should handle missing configuration', async () => {
    const mockRuntime = createMockRuntime({
      getSetting: vi.fn().mockReturnValue(null),
    });
    const mockMessage = createMockMemory();
    const mockState = createMockState();

    const result = await myProvider.get(mockRuntime, mockMessage, mockState);

    expect(result.text).toContain('not configured');
  });
});
```

### Testing Services

```typescript
// src/services/__tests__/my-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MyService } from '../my-service';
import { createMockRuntime } from '../../__tests__/test-utils';

describe('MyService', () => {
  let service: MyService;
  let mockRuntime: any;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
    service = new MyService(mockRuntime);
  });

  describe('start', () => {
    it('should initialize successfully', async () => {
      await service.start();

      expect(service.isReady()).toBe(true);
      expect(mockRuntime.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Service started')
      );
    });

    it('should handle initialization errors', async () => {
      mockRuntime.getSetting.mockReturnValue(null);

      await expect(service.start()).rejects.toThrow('Missing configuration');
    });
  });

  describe('operations', () => {
    beforeEach(async () => {
      await service.start();
    });

    it('should perform operation successfully', async () => {
      const result = await service.performOperation('test-input');

      expect(result).toBe('expected-output');
      expect(mockRuntime.logger.debug).toHaveBeenCalled();
    });

    it('should validate input before processing', async () => {
      await expect(service.performOperation('')).rejects.toThrow('Invalid input');
    });
  });

  describe('stop', () => {
    it('should clean up resources', async () => {
      await service.start();
      await service.stop();

      expect(service.isReady()).toBe(false);
      expect(mockRuntime.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Service stopped')
      );
    });
  });
});
```

### Testing Utility Functions

```typescript
// src/utils/__tests__/helpers.test.ts
import { describe, it, expect } from 'vitest';
import { formatMessage, validateInput, parseResponse } from '../helpers';

describe('Utility Functions', () => {
  describe('formatMessage', () => {
    it('should format message correctly', () => {
      const input = { text: 'hello', user: 'test' };
      const result = formatMessage(input);

      expect(result).toBe('[test]: hello');
    });

    it('should handle empty text', () => {
      const input = { text: '', user: 'test' };
      const result = formatMessage(input);

      expect(result).toBe('[test]: <empty message>');
    });
  });

  describe('validateInput', () => {
    it('should accept valid input', () => {
      expect(validateInput('valid input')).toBe(true);
    });

    it('should reject invalid input', () => {
      expect(validateInput('')).toBe(false);
      expect(validateInput(null)).toBe(false);
      expect(validateInput(undefined)).toBe(false);
    });
  });
});
```

## Running Tests

### Commands

```bash
# Run all tests (unit and E2E)
elizaos test

# Run tests from package.json script
npm test

# Run tests with coverage
npm run test:coverage
```

### Coverage Requirements

Aim for >75% coverage on testable code:

- Actions: Test both `validate` and `handler`
- Providers: Test the `get` method
- Services: Test lifecycle and public methods
- Utilities: Test all exported functions

## Best Practices

1. **Isolation**: Each test should be completely independent
2. **Clear Structure**: Use Arrange-Act-Assert pattern
3. **Mock Everything**: Never use real services, databases, or APIs
4. **Test Edge Cases**: Empty inputs, null values, errors
5. **Descriptive Names**: Test names should explain what they verify
6. **Fast Execution**: Unit tests should run in milliseconds
7. **Coverage Goals**: Maintain >75% coverage on testable code
8. **Pass Before Proceeding**: All tests must pass before moving on

## Common Patterns

### Mocking Async Operations

```typescript
// Mock a service that returns promises
const mockService = {
  fetchData: vi.fn().mockResolvedValue({ data: 'test' }),
  saveData: vi.fn().mockResolvedValue(true),
  // Simulate errors
  failingMethod: vi.fn().mockRejectedValue(new Error('API Error')),
};
```

### Testing Error Scenarios

```typescript
it('should handle network errors', async () => {
  const mockRuntime = createMockRuntime({
    useModel: vi.fn().mockRejectedValue(new Error('Network error')),
  });

  await expect(myAction.handler(mockRuntime, message, state)).rejects.toThrow('Network error');
});
```

### Spying on Method Calls

```typescript
it('should call logger with correct parameters', async () => {
  const mockRuntime = createMockRuntime();

  await myComponent.process(mockRuntime, input);

  expect(mockRuntime.logger.info).toHaveBeenCalledWith('Processing started', { input });
  expect(mockRuntime.logger.info).toHaveBeenCalledTimes(2);
});
```

### Testing with Different Runtime Configurations

```typescript
const testCases = [
  { setting: 'MODE', value: 'production', expected: 'strict' },
  { setting: 'MODE', value: 'development', expected: 'relaxed' },
];

testCases.forEach(({ setting, value, expected }) => {
  it(`should handle ${value} mode correctly`, async () => {
    const mockRuntime = createMockRuntime({
      getSetting: vi.fn((key) => (key === setting ? value : null)),
    });

    const result = await myComponent.getMode(mockRuntime);
    expect(result).toBe(expected);
  });
});
```

## Debugging Tests

### Useful Vitest Features

```typescript
// Skip a test temporarily
it.skip('should do something', async () => {
  // Test implementation
});

// Run only this test
it.only('should focus on this', async () => {
  // Test implementation
});

// Add console logs for debugging
it('should debug something', async () => {
  console.log('Input:', input);
  const result = await myComponent.process(input);
  console.log('Result:', result);
  expect(result).toBeDefined();
});
```

## Summary

Unit testing in ElizaOS ensures individual components work correctly in isolation. By using the `elizaos test` command (which wraps Vitest), creating comprehensive mocks, and following these patterns, you can build a robust test suite that catches bugs early and maintains code quality.

Remember:

- **Always use `elizaos test`**, not direct vitest commands
- **Mock everything** - no real dependencies in unit tests
- **Aim for >75% coverage** on testable code
- **All tests must pass** before considering work complete

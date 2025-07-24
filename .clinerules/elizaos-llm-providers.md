---
description: ElizaOS LLM Providers and AI Model Handling in the runtime
globs: 
alwaysApply: false
---
> You are an expert in ElizaOS, focusing on the integration of Large Language Models (LLMs) through the plugin architecture. You provide clear, practical guidance on creating model providers.

## LLM Provider Architecture

In ElizaOS, LLMs are integrated via plugins that register `ModelHandler` functions with the `AgentRuntime`. This allows the agent to use different models for various tasks like text generation, reasoning, and creating embeddings. The runtime manages a prioritized list of handlers for each `ModelType`.

```mermaid
graph TD
    A[AgentRuntime] -->|Calls useModel(type, params)| B(getModel(type));
    B --> C{Find Handler by Type & Priority};
    C -->|Found| D[Select Highest Priority Handler];
    D --> E[Execute Handler(params)];
    E --> F[Return Result];
    A --> F;

    subgraph "Plugin Registration"
        G[Plugin Init] --> H[runtime.registerModel(type, handler, provider, priority)];
        H --> I[Runtime adds handler to sorted list for 'type'];
    end
```

## Core Concepts

### `ModelType` Enum
This enum in `@elizaos/core` defines the standard categories of models the runtime understands. Plugins should register handlers for one or more of these types.

```typescript
// packages/core/src/types.ts (partial)
export const ModelType = {
  TEXT_SMALL: 'TEXT_SMALL',
  TEXT_LARGE: 'TEXT_LARGE',
  TEXT_EMBEDDING: 'TEXT_EMBEDDING',
  TEXT_REASONING_LARGE: 'REASONING_LARGE',
  // ... and others for images, audio, etc.
} as const;
```

### `ModelHandler` Interface
A `ModelHandler` is an object that packages the model-calling function with its metadata.

```typescript
// packages/core/src/types.ts (partial)
export interface ModelHandler {
  handler: (runtime: IAgentRuntime, params: Record<string, unknown>) => Promise<unknown>;
  provider: string; // The name of the plugin providing this handler
  priority?: number; // Higher number means higher priority
  registrationOrder?: number; // Internal tie-breaker
}
```

### Registration and Selection
-   **`runtime.registerModel(type, handler, provider, priority)`**: A plugin calls this in its `init` function to make a model available.
-   **`runtime.getModel(type)`**: The runtime uses this internally to retrieve the highest-priority handler for a given `ModelType`. If multiple handlers have the same priority, the one registered first is chosen.
-   **`runtime.useModel(type, params)`**: This is the primary method agents and other components use to invoke a model. It automatically selects the best available handler and executes it.

## Implementation Pattern

Here is how you would create a plugin that provides an LLM for text generation.

### 1. Define the Model Handler
Create a function that takes the runtime and parameters, calls the external LLM API, and returns the result in the expected format.

```typescript
// my-llm-plugin/src/handler.ts
import { type IAgentRuntime, type TextGenerationParams } from '@elizaos/core';
import { callMyLlmApi } from './api'; // Your API client

// ✅ DO: Implement the handler function matching the expected parameters
export async function handleTextLarge(
  runtime: IAgentRuntime,
  params: TextGenerationParams,
): Promise<string> {
  const apiKey = runtime.getSetting('MY_LLM_API_KEY');
  if (!apiKey) {
    throw new Error('MY_LLM_API_KEY is not configured.');
  }

  const { prompt, temperature, maxTokens } = params;

  // ✅ DO: Call your external API and format the parameters correctly
  const response = await callMyLlmApi(apiKey, {
    prompt,
    temperature,
    max_tokens: maxTokens,
  });

  // ✅ DO: Return the result in the format expected by ModelResultMap
  // For TEXT_LARGE, this is a string.
  return response.choices[0].text;
}
```

### 2. Create the Plugin
In your plugin's main file, register the handler.

```typescript
// my-llm-plugin/src/index.ts
import { type Plugin, ModelType } from '@elizaos/core';
import { handleTextLarge } from './handler';

export const myLlmProviderPlugin: Plugin = {
  name: 'my-llm-provider',
  description: 'Provides access to My Custom LLM.',
  
  // ✅ DO: Register your model handlers in the `models` property
  models: {
    // The key must match a value from the ModelType enum
    [ModelType.TEXT_LARGE]: handleTextLarge,
  },

  // Set a priority if you want this model to be preferred over others
  priority: 10,

  async init(config, runtime) {
    // You can perform validation here
    const apiKey = runtime.getSetting('MY_LLM_API_KEY');
    if (!apiKey) {
      runtime.logger.warn(`${this.name} requires an API key. It may not function correctly.`);
    }
  },
};
```

### 3. Usage in an Action or Provider
Once the plugin is registered, any other component can use the model via `runtime.useModel`.

```typescript
// another-plugin/src/actions.ts
import { type Action, type IAgentRuntime, ModelType } from '@elizaos/core';

export const myAction: Action = {
  name: 'ask-my-llm',
  // ...
  async handler(runtime: IAgentRuntime, message) {
    const question = message.content.text;

    // ✅ DO: Use `runtime.useModel` to invoke the model
    // The runtime handles selecting the highest-priority provider.
    const responseText = await runtime.useModel(ModelType.TEXT_LARGE, {
      prompt: `The user asked: ${question}. Please provide a concise answer.`,
      temperature: 0.5,
    });
    
    // ... do something with the response
    return { text: responseText };
  },
  // ...
};
```

## Best Practices

### Parameter and Result Typing
-   Use the generic parameter and result types from `@elizaos/core` (`ModelParamsMap`, `ModelResultMap`, `TextGenerationParams`, etc.) to ensure your handler is compatible with the runtime.
-   If your model returns extra metadata (like token usage), you can attach it to the response, but ensure the primary return value matches the `ModelResultMap` type for the given `ModelType`.

### Error Handling
-   Your handler function should perform robust error handling. If an API call fails, throw a descriptive error. The `useModel` call will propagate this error, allowing the caller to handle it.
-   Check for required API keys or configuration in your plugin's `init` function and log a warning if they are missing.

### Priority
-   If you are creating a plugin that you intend to be the default for a certain `ModelType`, give it a `priority`. For example, `@elizaos/plugin-openai` might have a higher priority than a local model provider.
-   If no priority is set, it defaults to `0`. The registration order is used as a tie-breaker.

### Providing Multiple Models
A single plugin can provide handlers for multiple `ModelType`s.

```typescript
// my-full-llm-plugin/src/index.ts
import { type Plugin, ModelType } from '@elizaos/core';
import { handleTextLarge, handleEmbedding } from './handlers';

export const myFullLlmPlugin: Plugin = {
  name: 'my-full-llm-provider',
  description: 'Provides text and embedding models.',
  
  models: {
    [ModelType.TEXT_LARGE]: handleTextLarge,
    [ModelType.TEXT_EMBEDDING]: handleEmbedding,
  },
};
```

## References
- [Core Types (`ModelType`, `ModelHandler`, `ModelParamsMap`)](mdc:packages/core/src/types.ts)
- [Agent Runtime (`registerModel`, `useModel`)](mdc:packages/core/src/runtime.ts)
- [Example: OpenAI Plugin](mdc:packages/plugin-openai/src/index.ts)

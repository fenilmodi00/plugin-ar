---
description: Action, tool, workflow, agent actions, action processing, when the agent wants to perform an action or do something, or can call an action because the user requested it, autonomous action calling
globs:
alwaysApply: false
---

# ElizaOS Actions System

Actions define how agents respond to and interact with messages. They are the core components that define an agent's capabilities and enable complex behaviors through action chaining.

## Core Concepts

### Action Structure

```typescript
interface Action {
  name: string; // Unique identifier
  similes: string[]; // Alternative names/triggers
  description: string; // Purpose and usage explanation
  validate: Validator; // Check if action is appropriate
  handler: Handler; // Core implementation logic
  examples: ActionExample[][]; // Sample usage patterns
  suppressInitialMessage?: boolean;
  effects?: {
    provides: string[]; // What this action provides
    requires: string[]; // What this action needs
    modifies: string[]; // What state it changes
  };
  estimateCost?: (params: any) => number; // Optional cost estimation
}
```

### Action Chaining

Actions can be chained together, with each action receiving:

- Results from previous actions (`ActionResult`)
- Access to shared working memory
- Accumulated state from earlier executions

```typescript
interface ActionResult {
  values?: { [key: string]: any }; // Values to merge into state
  data?: { [key: string]: any }; // Internal data for next action
  text?: string; // Summary text
}

interface ActionContext {
  previousResults?: ActionResult[];
  workingMemory?: WorkingMemory;
  updateMemory?: (key: string, value: any) => void;
  getMemory?: (key: string) => any;
  getPreviousResult?: (stepId: UUID) => ActionResult | undefined;
}
```

## Implementation Patterns

### Basic Action

```typescript
const customAction: Action = {
  name: 'CUSTOM_ACTION',
  similes: ['ALTERNATE_NAME'],
  description: 'Action description',

  validate: async (runtime, message, state) => {
    // Return true if action is valid for this message
    return message.content.text?.includes('trigger');
  },

  handler: async (runtime, message, state, options, callback) => {
    // Access action context
    const context = options?.context as ActionContext;

    // Use previous results
    const previousData = context?.previousResults?.[0]?.data;

    // Use working memory
    context?.updateMemory?.('step', 1);

    // Send response
    await callback({
      text: 'Response text',
      thought: 'Internal reasoning',
      actions: ['CUSTOM_ACTION'],
    });

    // Return result for next action
    return {
      values: { processedData: 'value' },
      data: { internal: 'state' },
    };
  },

  examples: [
    [
      { name: '{{user}}', content: { text: 'trigger text' } },
      {
        name: '{{agent}}',
        content: {
          text: 'Response',
          thought: 'Reasoning',
          actions: ['CUSTOM_ACTION'],
        },
      },
    ],
  ],
};
```

### Chained Actions

```typescript
// First action fetches data
const fetchAction: Action = {
  name: 'FETCH_DATA',
  handler: async (runtime, message, state, options, callback) => {
    const data = await fetchExternalData();
    return {
      values: { fetchedData: data },
      data: { source: 'api' },
    };
  },
};

// Second action processes data
const processAction: Action = {
  name: 'PROCESS_DATA',
  handler: async (runtime, message, state, options, callback) => {
    const context = options?.context as ActionContext;
    const data = context?.previousResults?.[0]?.values?.fetchedData;

    const processed = await processData(data);

    await callback({
      text: `Processed ${processed.length} items`,
      thought: 'Data processing complete',
    });

    return { values: { processed } };
  },
};
```

## Agent Decision Flow

1. Message received → Agent evaluates all actions via `validate()`
2. Valid actions provided to LLM via `actionsProvider`
3. LLM decides which action(s) to execute
4. Actions execute in sequence, each receiving previous results
5. Response sent back to conversation

## Integration Points

- **Providers**: Supply context before action selection
- **Evaluators**: Process conversation after actions complete
- **Services**: Enable actions to interact with external systems
- **Working Memory**: Maintains state across action chain

## Best Practices

1. **Validation**: Keep `validate()` functions fast and efficient
2. **Error Handling**: Actions should handle errors gracefully
3. **Return Values**: Always return `ActionResult` for chaining
4. **Working Memory**: Clean up after multi-step processes
5. **Examples**: Provide clear examples for LLM understanding
6. **Effects**: Define provides/requires/modifies for planning

## Common Action Types

- **REPLY**: Basic text response
- **CONTINUE**: Extend conversation
- **IGNORE**: Explicitly do nothing
- **SEND_TOKEN**: Blockchain transactions
- **GENERATE_IMAGE**: Media generation
- **FETCH_DATA**: External API calls
- **PROCESS_DATA**: Data transformation
- **MULTI_STEP**: Complex workflows

---
description: ElizaOS Core Plugin Architecture, how plugins are implemented
globs: 
alwaysApply: false
---
> You are an expert in the ElizaOS plugin architecture, focusing on core concepts, lifecycle, and best practices for creating robust and interoperable plugins.

## Core Plugin Architecture

The ElizaOS plugin system is the primary mechanism for extending agent capabilities. A plugin is a self-contained module that can register various components with the `AgentRuntime`. The runtime acts as the central nervous system, managing the lifecycle and interactions of these components.

```mermaid
graph TD
    subgraph "Initialization Phase"
        A[AgentRuntime.initialize()] --> B{Resolve Plugin Dependencies};
        B --> C(Topologically Sort Plugins);
        C --> D(For each plugin in order...);
        D --> E[runtime.registerPlugin(plugin)];
    end

    subgraph "Plugin Registration (within registerPlugin)"
        E --> F[plugin.init(runtime)];
        F --> G[Register Components];
        G --> H(Actions);
        G --> I(Providers);
        G --> J(Services);
        G --> K(Models);
        G --> L(Evaluators);
        G --> M(Events);
        G --> N(Routes);
    end

    subgraph "Runtime Operation"
        O[Incoming Message/Event] --> P[AgentRuntime];
        P -->|Uses Provider for context| I;
        P -->|Selects & runs Action| H;
        P -->|Calls Service logic| J;
        P -->|Uses Model for generation| K;
        P -->|Triggers Evaluator| L;
        P -->|Emits Event to handlers| M;
    end

    Q[External HTTP Request] --> N;
```

## The `Plugin` Interface: The Heart of a Plugin

Every plugin is an object that conforms to the `Plugin` interface. This interface is a manifest of all the capabilities the plugin provides to the runtime.

```typescript
// packages/core/src/types.ts (Annotated)
export interface Plugin {
  // Required: A unique NPM-style package name. (e.g., '@elizaos/plugin-sql')
  name: string;
  // Required: A human-readable description of the plugin's purpose.
  description: string;

  // An initialization function called once when the plugin is registered.
  // Use this for setup, validation, and connecting to services.
  init?: (config: Record<string, string>, runtime: IAgentRuntime) => Promise<void>;

  // A list of other plugin *names* that must be loaded before this one.
  dependencies?: string[];
  
  // A priority number for ordering. Higher numbers load first within the dependency graph.
  priority?: number;

  // --- Core Capabilities ---

  // Services are long-running, stateful classes. (e.g., a database connection manager)
  services?: (typeof Service)[];

  // Actions define what an agent *can do*. They are the agent's tools.
  actions?: Action[];

  // Providers supply contextual information into the agent's "state" before a decision is made.
  providers?: Provider[];

  // Evaluators run *after* an interaction to process the outcome (e.g., for memory or learning).
  evaluators?: Evaluator[];
  
  // Model handlers provide implementations for different AI model types (e.g., text generation).
  models?: { [key: string]: (...args: any[]) => Promise<any> };

  // --- Advanced Capabilities ---

  // A database adapter. Typically only one SQL plugin provides this for the entire runtime.
  adapter?: IDatabaseAdapter;

  // Event handlers to listen for and react to specific runtime events.
  events?: PluginEvents;

  // Custom HTTP routes to expose a web API or UI from the agent server.
  routes?: Route[];
  
  // A suite of E2E or unit tests, runnable via `elizaos test`.
  tests?: TestSuite[];

  // Default configuration values for the plugin.
  config?: { [key:string]: any };
}
```

## Plugin Lifecycle and Dependency Resolution

The `AgentRuntime` manages a sophisticated plugin lifecycle to ensure stability and correct ordering.

1.  **Dependency Resolution**: When `runtime.initialize()` is called, it first looks at the `plugins` array in the agent's `Character` definition. It then recursively scans the `dependencies` array of each of these plugins, building a complete graph of all required plugins.
2.  **Topological Sort**: The runtime performs a topological sort on the dependency graph. This creates a linear loading order where every plugin is guaranteed to be loaded *after* its dependencies have been loaded. `priority` is used as a secondary sorting factor.
3.  **Registration**: The runtime iterates through the sorted list and calls `runtime.registerPlugin()` for each plugin.
4.  **Initialization (`init`)**: The `init` function of the plugin is the first thing called within `registerPlugin`. This is the critical "setup" phase. It is the only place you can be certain that all dependency plugins (and their services) are available.
5.  **Component Registration**: After `init` completes successfully, the runtime registers all other capabilities (`actions`, `providers`, etc.) from the plugin object, making them available to the rest of the system.

```typescript
// packages/core/src/runtime.ts

export class AgentRuntime implements IAgentRuntime {
  // ...
  async initialize(): Promise<void> {
    // 1. & 2. Resolve dependencies and get the final, sorted list of plugins to load
    const pluginsToLoad = await this.resolvePluginDependencies(this.characterPlugins);

    // 3. Iterate over the resolved list and register each plugin
    for (const plugin of pluginsToLoad) {
      // 4. & 5. Call registerPlugin, which handles init and component registration
      await this.registerPlugin(plugin);
    }
    // ...
  }

  async registerPlugin(plugin: Plugin): Promise<void> {
    // ...
    // Call the plugin's init function FIRST
    if (plugin.init) {
      await plugin.init(plugin.config || {}, this);
    }
    
    // Then, register all other components
    if (plugin.services) {
        for (const service of plugin.services) {
            await this.registerService(service);
        }
    }
    if (plugin.actions) {
      for (const action of plugin.actions) {
        this.registerAction(action);
      }
    }
    // ... and so on for providers, evaluators, models, routes, etc.
  }
}
```

## Deep Dive: Plugin Components

### Services
Services are singleton classes that manage long-running processes or state. They are the backbone for complex plugins.
- **Definition**: A `Service` is a class with a static `start` method.
- **Lifecycle**: `Service.start(runtime)` is called during plugin registration. The returned instance is stored in `runtime.services`.
- **Access**: Other components access services via `runtime.getService<T>('service_name')`.
- **Use Case**: A `ConnectionService` for a blockchain, a `WebSocketClient` for a chat platform, a `CacheManager`.

```typescript
// ✅ DO: Define a service for stateful logic.
export class MyCacheService extends Service {
  public static serviceType = 'my_cache'; // Unique identifier
  private cache = new Map<string, any>();

  // The start method is the factory for the service instance
  static async start(runtime: IAgentRuntime): Promise<MyCacheService> {
    const instance = new MyCacheService(runtime);
    runtime.logger.info("MyCacheService started.");
    return instance;
  }
  
  public get(key: string) { return this.cache.get(key); }
  public set(key: string, value: any) { this.cache.set(key, value); }
  
  async stop(): Promise<void> { this.cache.clear(); }
  public get capabilityDescription(): string { return "An in-memory cache."; }
}
```

### Actions
Actions define what an agent *can do*. They are the primary way to give an agent capabilities.
- **Definition**: An `Action` object contains a `name`, `description`, `validate` function, and `handler` function.
- **Lifecycle**: After the LLM selects an action, its `handler` is executed.
- **Use Case**: `send-email`, `transfer-funds`, `query-database`.

```typescript
// ✅ DO: Define a clear, purposeful action.
export const sendTweetAction: Action = {
  name: 'send-tweet',
  description: 'Posts a tweet to the connected Twitter account.',
  // The handler function contains the core logic.
  async handler(runtime, message, state) {
    const twitterService = runtime.getService<TwitterService>('twitter');
    if (!twitterService) throw new Error('Twitter service not available.');

    const textToTweet = message.content.text;
    const tweetId = await twitterService.postTweet(textToTweet);
    return { text: `Tweet posted successfully! ID: ${tweetId}` };
  },
  // The validate function determines if the action should be available to the LLM.
  async validate(runtime, message, state) {
    const twitterService = runtime.getService('twitter');
    return !!twitterService; // Only available if the twitter service is running.
  }
};
```

### Providers
Providers inject contextual information into the agent's "state" before the LLM makes a decision. They are the agent's senses.
- **Definition**: A `Provider` object has a `name` and a `get` function.
- **Lifecycle**: The `get` function of all registered (non-private) providers is called by `runtime.composeState()` before invoking the main LLM.
- **Use Case**: `CURRENT_TIME`, `RECENT_MESSAGES`, `ACCOUNT_BALANCE`, `WORLD_STATE`.

```typescript
// ✅ DO: Create providers for dynamic context.
export const accountBalanceProvider: Provider = {
  name: 'ACCOUNT_BALANCE',
  // The 'get' function returns text and structured data to be injected into the prompt.
  async get(runtime, message, state) {
    const solanaService = runtime.getService<SolanaService>('solana');
    if (!solanaService) return { text: '' };

    const balance = await solanaService.getBalance();
    const text = `The current wallet balance is ${balance} SOL.`;

    return {
      text: `[ACCOUNT BALANCE]\n${text}\n[/ACCOUNT BALANCE]`,
      values: { // This data can be used by other components
        solBalance: balance,
      }
    };
  },
};
```

## Best Practices
- **Explicit Dependencies**: Always declare `dependencies` to ensure correct load order. The runtime does not guarantee service availability otherwise.
- **Fail Fast**: In your `init` function, check for required configuration (e.g., API keys via `runtime.getSetting()`) and throw an error if something critical is missing. This prevents the agent from running in a broken state.
- **Scoped Logic**: Keep your plugin focused. A single plugin should manage one core piece of functionality (e.g., one API integration, one protocol).
- **Use Services for State**: Avoid global variables. If you need to maintain state (like a connection object, cache, or user session), encapsulate it within a `Service`.

## References
- [Core Types (`Plugin`, `Action`, `Provider` etc.)](mdc:packages/core/src/types.ts)
- [Agent Runtime Implementation](mdc:packages/core/src/runtime.ts)
- [Example: SQL Plugin](mdc:packages/plugin-sql/src/index.ts)
- [Example: Bootstrap Plugin](mdc:packages/plugin-message-handling/src/index.ts)

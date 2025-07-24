---
description: Service architecture, microservices, service discoverability, services are used in the agent to enable additional functionality and hold state which can be accessed by providers, manipulated by actions etc, useful for managing connections and active clients
globs:
alwaysApply: false
---

# ElizaOS Services System

Services are long-running, stateful singleton components that manage complex functionality and external integrations. They provide a consistent interface for agents to interact with various platforms and systems.

## Core Concepts

### Service Structure

```typescript
abstract class Service {
  static serviceName: string; // Unique identifier
  static serviceType?: ServiceTypeName; // Category of service
  serviceName: string; // Instance name
  abstract capabilityDescription: string; // What the service enables
  config?: Metadata; // Service configuration

  constructor(runtime?: IAgentRuntime); // Constructor with optional runtime

  abstract stop(): Promise<void>; // Cleanup method
  static async start(runtime: IAgentRuntime): Promise<Service>; // Factory method
}
```

## Service Lifecycle

1. **Registration**: Services registered during plugin initialization
2. **Instantiation**: Single instance created via `start()` static method
3. **Configuration**: Constructor sets up initial state
4. **Runtime Access**: Available via `runtime.getService(serviceName)`
5. **Cleanup**: `stop()` called when agent shuts down

## Implementation Patterns

### Basic Service

```typescript
class DatabaseService extends Service {
  static serviceName = 'database';
  static serviceType = ServiceType.DATA_STORAGE;

  capabilityDescription = 'Provides database access';
  private connection: DatabaseConnection;

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
    // Initialize properties
  }

  static async start(runtime: IAgentRuntime): Promise<DatabaseService> {
    const service = new DatabaseService(runtime);
    const config = runtime.getSetting('DATABASE_URL');
    service.connection = await createConnection(config);
    runtime.logger.info('Database service initialized');
    return service;
  }

  async query(sql: string, params: any[]): Promise<any> {
    return await this.connection.query(sql, params);
  }

  async stop(): Promise<void> {
    await this.connection.close();
    this.runtime.logger.info('Database service stopped');
  }
}
```

### Platform Integration Service

```typescript
class DiscordService extends Service {
  static serviceName = 'discord';
  static serviceType = ServiceType.MESSAGING;

  capabilityDescription = 'Provides Discord integration';
  private client: DiscordClient;

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<DiscordService> {
    const service = new DiscordService(runtime);
    const token = runtime.getSetting('DISCORD_TOKEN');

    service.client = new DiscordClient();
    await service.client.login(token);

    service.setupEventHandlers();
    return service;
  }

  private setupEventHandlers(): void {
    this.client.on('messageCreate', async (message) => {
      // Convert to ElizaOS message format
      const memory = await this.convertMessage(message);

      // Emit to runtime
      await this.runtime.emitEvent(EventType.MESSAGE_RECEIVED, {
        runtime: this.runtime,
        message: memory,
        callback: this.sendResponse.bind(this),
      });
    });
  }

  async sendMessage(channelId: string, content: Content): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    await channel.send(content.text);
  }

  async stop(): Promise<void> {
    await this.client.destroy();
  }
}
```

### Blockchain Service

```typescript
class SolanaService extends Service {
  static serviceName = 'solana' as ServiceTypeName;
  static serviceType = ServiceType.BLOCKCHAIN;

  private connection: Connection;
  private wallet: Wallet;

  async initialize(runtime: IAgentRuntime): Promise<void> {
    const rpcUrl = runtime.getSetting('SOLANA_RPC_URL');
    const privateKey = runtime.getSetting('SOLANA_PRIVATE_KEY');

    this.connection = new Connection(rpcUrl);
    this.wallet = new Wallet(privateKey);
  }

  async transfer(to: string, amount: number): Promise<string> {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.wallet.publicKey,
        toPubkey: new PublicKey(to),
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );

    const signature = await sendAndConfirmTransaction(this.connection, transaction, [this.wallet]);

    return signature;
  }

  async getBalance(): Promise<number> {
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  async stop(): Promise<void> {
    // Cleanup if needed
  }
}
```

## Service Types

- **MESSAGING**: Discord, Telegram, Twitter
- **BLOCKCHAIN**: Solana, Ethereum, Bitcoin
- **DATA_STORAGE**: Database, Cache, Vector Store
- **AI_MODEL**: OpenAI, Anthropic, Local Models
- **MEDIA**: Image Generation, Video Processing
- **EXTERNAL_API**: Weather, News, Market Data

## Service Discovery

```typescript
// Get specific service
const discord = runtime.getService<DiscordService>('discord');

// Get all services of a type
const messagingServices = runtime.getServicesByType(ServiceType.MESSAGING);

// Check if service exists
if (runtime.hasService('solana')) {
  const solana = runtime.getService('solana');
}
```

## Best Practices

1. **Singleton Pattern**: Services are singletons - maintain single instance
2. **Configuration**: Use `runtime.getSetting()` for config values
3. **Error Handling**: Implement robust error handling and retry logic
4. **Event Integration**: Emit runtime events for agent processing
5. **Cleanup**: Always implement proper cleanup in `stop()`
6. **Type Safety**: Use TypeScript generics for type-safe access

## Action Integration

Actions commonly use services to perform operations:

```typescript
const transferAction: Action = {
  name: 'TRANSFER_SOL',

  handler: async (runtime, message, state, options, callback) => {
    const solanaService = runtime.getService<SolanaService>('solana');
    if (!solanaService) {
      throw new Error('Solana service not available');
    }

    const { to, amount } = extractParams(message);
    const signature = await solanaService.transfer(to, amount);

    await callback({
      text: `Transferred ${amount} SOL. Signature: ${signature}`,
      thought: 'Successfully completed SOL transfer',
    });
  },
};
```

## Service Registration

Services are registered via plugins:

```typescript
const myPlugin: Plugin = {
  name: 'my-plugin',
  description: 'Plugin with custom service',
  services: [DatabaseService, CacheService],

  init: async (runtime: IAgentRuntime) => {
    // Services automatically registered and started
    const db = runtime.getService('database');
    // Use service...
  },
};
```

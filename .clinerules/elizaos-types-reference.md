---
description:
globs:
alwaysApply: true
---

# ElizaOS Types Reference

This document provides a comprehensive reference for all core types and interfaces used throughout ElizaOS.

## Agent & Character Types

### Character

Defines an agent's personality, knowledge, and capabilities.

```typescript
interface Character {
  id?: UUID;
  name: string;
  username?: string;
  system?: string; // System prompt
  templates?: { [key: string]: TemplateType }; // Prompt templates
  bio: string | string[];
  messageExamples?: MessageExample[][];
  postExamples?: string[];
  topics?: string[];
  adjectives?: string[];
  knowledge?: (string | { path: string; shared?: boolean } | DirectoryItem)[];
  plugins?: string[];
  settings?: { [key: string]: any };
  secrets?: { [key: string]: string | boolean | number };
  style?: {
    all?: string[];
    chat?: string[];
    post?: string[];
  };
}
```

### Agent

Extends Character with runtime status.

```typescript
interface Agent extends Character {
  enabled?: boolean;
  status?: AgentStatus;
  createdAt: number;
  updatedAt: number;
}

enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}
```

## Component System Types

### Action

Defines agent capabilities and response mechanisms.

```typescript
interface Action {
  name: string;
  similes?: string[];
  description: string;
  examples?: ActionExample[][];
  handler: Handler;
  validate: Validator;
  effects?: {
    provides: string[];
    requires: string[];
    modifies: string[];
  };
  estimateCost?: (params: any) => number;
}
```

### Provider

Sources of information for agents.

```typescript
interface Provider {
  name: string;
  description?: string;
  dynamic?: boolean; // Only used when requested
  position?: number; // Execution order
  private?: boolean; // Must be explicitly included
  get: (runtime: IAgentRuntime, message: Memory, state: State) => Promise<ProviderResult>;
}

interface ProviderResult {
  values?: { [key: string]: any };
  data?: { [key: string]: any };
  text?: string;
}
```

### Evaluator

Post-processing cognitive components.

```typescript
interface Evaluator {
  alwaysRun?: boolean;
  description: string;
  similes?: string[];
  examples: EvaluationExample[];
  handler: Handler;
  name: string;
  validate: Validator;
}
```

### Service

Long-running stateful components.

```typescript
abstract class Service {
  static serviceName: string;
  static serviceType?: ServiceTypeName;
  serviceName: string;
  abstract capabilityDescription: string;
  config?: Metadata;

  abstract stop(): Promise<void>;
  static async start(runtime: IAgentRuntime): Promise<Service>;
}
```

## Environment Types

### Entity

Represents users, agents, or participants.

```typescript
interface Entity {
  id?: UUID;
  names: string[];
  metadata?: Metadata;
  agentId: UUID;
  components?: Component[];
}
```

### Component

Modular data attached to entities.

```typescript
interface Component {
  id: UUID;
  entityId: UUID;
  agentId: UUID;
  roomId: UUID;
  worldId: UUID;
  sourceEntityId: UUID;
  type: string;
  createdAt: number;
  data: Metadata;
}
```

### World

Collections of entities and rooms.

```typescript
type World = {
  id: UUID;
  name?: string;
  agentId: UUID;
  serverId: string;
  metadata?: {
    ownership?: { ownerId: string };
    roles?: { [entityId: UUID]: Role };
    [key: string]: unknown;
  };
};

enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  NONE = 'NONE',
}
```

### Room

Individual interaction spaces.

```typescript
type Room = {
  id: UUID;
  name?: string;
  agentId?: UUID;
  source: string;
  type: ChannelType;
  channelId?: string;
  serverId?: string;
  worldId?: UUID;
  metadata?: Metadata;
};

enum ChannelType {
  SELF = 'SELF',
  DM = 'DM',
  GROUP = 'GROUP',
  VOICE_DM = 'VOICE_DM',
  VOICE_GROUP = 'VOICE_GROUP',
  FEED = 'FEED',
  THREAD = 'THREAD',
  WORLD = 'WORLD',
  FORUM = 'FORUM',
  API = 'API', // @deprecated
}
```

### Relationship

Connections between entities.

```typescript
interface Relationship {
  id: UUID;
  sourceEntityId: UUID;
  targetEntityId: UUID;
  agentId: UUID;
  tags: string[];
  metadata: Metadata;
  createdAt?: string;
  relationshipType?: string;
  strength?: number;
  lastInteractionAt?: string;
  nextFollowUpAt?: string;
}
```

## Memory Types

### Memory

Core memory/message structure.

```typescript
interface Memory {
  id?: UUID;
  entityId: UUID;
  agentId?: UUID;
  createdAt?: number;
  content: Content;
  embedding?: number[];
  roomId: UUID;
  worldId?: UUID;
  unique?: boolean;
  similarity?: number;
  metadata?: MemoryMetadata;
}
```

### Content

Message content structure.

```typescript
interface Content {
  thought?: string; // Agent's internal thought
  text?: string; // Main text content
  actions?: string[]; // Actions to perform
  providers?: string[]; // Providers to use
  source?: string;
  target?: string;
  url?: string;
  inReplyTo?: UUID;
  attachments?: Media[];
  channelType?: string;
  [key: string]: unknown;
}
```

### Memory Metadata Types

```typescript
enum MemoryType {
  DOCUMENT = 'document',
  FRAGMENT = 'fragment',
  MESSAGE = 'message',
  DESCRIPTION = 'description',
  CUSTOM = 'custom',
}

type MemoryScope = 'shared' | 'private' | 'room';

interface BaseMetadata {
  type: MemoryTypeAlias;
  source?: string;
  sourceId?: UUID;
  scope?: MemoryScope;
  timestamp?: number;
  tags?: string[];
}
```

## Planning & Execution Types

### ActionResult

Result of action execution for chaining.

```typescript
interface ActionResult {
  values?: { [key: string]: any };
  data?: { [key: string]: any };
  text?: string;
}
```

### ActionContext

Context provided during action execution.

```typescript
interface ActionContext {
  planId?: UUID;
  stepId?: UUID;
  workingMemory?: WorkingMemory;
  previousResults?: ActionResult[];
  abortSignal?: AbortSignal;
  updateMemory?: (key: string, value: any) => void;
  getMemory?: (key: string) => any;
  getPreviousResult?: (stepId: UUID) => ActionResult | undefined;
  requestReplanning?: () => Promise<ActionPlan>;
}
```

### Task

Deferred or scheduled operations.

```typescript
interface Task {
  id?: UUID;
  name: string;
  updatedAt?: number;
  metadata?: TaskMetadata;
  description: string;
  roomId?: UUID;
  worldId?: UUID;
  entityId?: UUID;
  tags: string[];
}

type TaskMetadata = {
  updateInterval?: number; // For recurring tasks
  options?: {
    // For choice tasks
    name: string;
    description: string;
  }[];
  [key: string]: unknown;
};
```

## State Types

### State

Current conversation context.

```typescript
interface State {
  values: { [key: string]: any };
  data: { [key: string]: any };
  text: string;
  [key: string]: any;
}
```

## Model Types

### ModelType

Available model categories.

```typescript
const ModelType = {
  TEXT_SMALL: 'TEXT_SMALL',
  TEXT_LARGE: 'TEXT_LARGE',
  TEXT_EMBEDDING: 'TEXT_EMBEDDING',
  TEXT_TOKENIZER_ENCODE: 'TEXT_TOKENIZER_ENCODE',
  TEXT_TOKENIZER_DECODE: 'TEXT_TOKENIZER_DECODE',
  TEXT_REASONING_SMALL: 'REASONING_SMALL',
  TEXT_REASONING_LARGE: 'REASONING_LARGE',
  TEXT_COMPLETION: 'TEXT_COMPLETION',
  IMAGE: 'IMAGE',
  IMAGE_DESCRIPTION: 'IMAGE_DESCRIPTION',
  TRANSCRIPTION: 'TRANSCRIPTION',
  TEXT_TO_SPEECH: 'TEXT_TO_SPEECH',
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO',
  OBJECT_SMALL: 'OBJECT_SMALL',
  OBJECT_LARGE: 'OBJECT_LARGE',
} as const;
```

## Event Types

### EventType

Standard event types across platforms.

```typescript
enum EventType {
  // World events
  WORLD_JOINED = 'WORLD_JOINED',
  WORLD_CONNECTED = 'WORLD_CONNECTED',
  WORLD_LEFT = 'WORLD_LEFT',

  // Entity events
  ENTITY_JOINED = 'ENTITY_JOINED',
  ENTITY_LEFT = 'ENTITY_LEFT',
  ENTITY_UPDATED = 'ENTITY_UPDATED',

  // Room events
  ROOM_JOINED = 'ROOM_JOINED',
  ROOM_LEFT = 'ROOM_LEFT',

  // Message events
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  MESSAGE_SENT = 'MESSAGE_SENT',
  MESSAGE_DELETED = 'MESSAGE_DELETED',

  // Other events...
}
```

## Plugin Types

### Plugin

Extension interface for agent functionality.

```typescript
interface Plugin {
  name: string;
  description: string;
  init?: (config: Record<string, string>, runtime: IAgentRuntime) => Promise<void>;
  config?: { [key: string]: any };
  services?: (typeof Service)[];
  componentTypes?: {
    name: string;
    schema: Record<string, unknown>;
    validator?: (data: any) => boolean;
  }[];
  actions?: Action[];
  providers?: Provider[];
  evaluators?: Evaluator[];
  adapter?: IDatabaseAdapter;
  models?: { [key: string]: (...args: any[]) => Promise<any> };
  events?: PluginEvents;
  routes?: Route[];
  tests?: TestSuite[];
  dependencies?: string[];
  testDependencies?: string[];
  priority?: number;
  schema?: any;
}
```

## Runtime Interface

### IAgentRuntime

Core runtime environment for agents.

```typescript
interface IAgentRuntime extends IDatabaseAdapter {
  // Properties
  agentId: UUID;
  character: Character;
  providers: Provider[];
  actions: Action[];
  evaluators: Evaluator[];
  plugins: Plugin[];
  services: Map<ServiceTypeName, Service>;
  events: Map<string, ((params: any) => Promise<void>)[]>;
  fetch?: typeof fetch | null;
  routes: Route[];

  // Core methods
  registerPlugin(plugin: Plugin): Promise<void>;
  initialize(): Promise<void>;
  getService<T extends Service>(service: ServiceTypeName | string): T | null;
  composeState(
    message: Memory,
    includeList?: string[],
    onlyInclude?: boolean,
    skipCache?: boolean
  ): Promise<State>;
  useModel<T extends ModelTypeName, R = ModelResultMap[T]>(
    modelType: T,
    params: Omit<ModelParamsMap[T], 'runtime'> | any
  ): Promise<R>;
  processActions(
    message: Memory,
    responses: Memory[],
    state?: State,
    callback?: HandlerCallback
  ): Promise<void>;
  evaluate(
    message: Memory,
    state?: State,
    didRespond?: boolean,
    callback?: HandlerCallback,
    responses?: Memory[]
  ): Promise<Evaluator[] | null>;

  // Task methods
  registerTaskWorker(taskHandler: TaskWorker): void;
  getTaskWorker(name: string): TaskWorker | undefined;

  // And many more...
}
```

## Handler & Callback Types

### Handler

Core handler function type.

```typescript
type Handler = (
  runtime: IAgentRuntime,
  message: Memory,
  state?: State,
  options?: { [key: string]: unknown },
  callback?: HandlerCallback,
  responses?: Memory[]
) => Promise<ActionResult | void | boolean | null>;
```

### HandlerCallback

Response callback function.

```typescript
type HandlerCallback = (response: Content, files?: any) => Promise<Memory[]>;
```

### Validator

Validation function type.

```typescript
type Validator = (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<boolean>;
```

## Primitive Types

### UUID

Universally unique identifier.

```typescript
type UUID = `${string}-${string}-${string}-${string}-${string}`;

function asUUID(id: string): UUID; // Helper to cast string to UUID
```

### Metadata

Generic metadata object.

```typescript
type Metadata = Record<string, unknown>;
```

## Testing Types

### TestSuite & TestCase

Testing infrastructure types.

```typescript
interface TestCase {
  name: string;
  fn: (runtime: IAgentRuntime) => Promise<void> | void;
}

interface TestSuite {
  name: string;
  tests: TestCase[];
}
```

## Service Types

### ServiceType

Available service categories.

```typescript
const ServiceType = {
  UNKNOWN: 'UNKNOWN',
  TRANSCRIPTION: 'transcription',
  VIDEO: 'video',
  BROWSER: 'browser',
  PDF: 'pdf',
  REMOTE_FILES: 'aws_s3',
  WEB_SEARCH: 'web_search',
  EMAIL: 'email',
  TEE: 'tee',
  TASK: 'task',
  WALLET: 'wallet',
  LP_POOL: 'lp_pool',
  TOKEN_DATA: 'token_data',
  TUNNEL: 'tunnel',
} as const;
```

## Best Practices

1. **Type Safety**: Always use proper types instead of `any`
2. **UUID Handling**: Use `asUUID()` helper for validation
3. **Metadata**: Keep metadata structured and documented
4. **Enums**: Use enums for fixed sets of values
5. **Interfaces**: Prefer interfaces over types for objects
6. **Generics**: Use generics for reusable patterns
7. **Type Guards**: Create type guards for runtime checks

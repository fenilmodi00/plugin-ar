---
description: Entities are database representations of users that the agent tracks, the user can track data on entities and track the relationships between entities
globs:
alwaysApply: false
---

# ElizaOS Entities System

Entities represent users, agents, or any participant that can interact within the system. They form the basis of the entity-component architecture, allowing for flexible data modeling and relationships.

## Core Concepts

### Entity Structure

```typescript
interface Entity {
  id?: UUID; // Unique identifier (optional on creation)
  names: string[]; // Array of names/aliases
  metadata?: { [key: string]: any }; // Additional information
  agentId: UUID; // Related agent ID
  components?: Component[]; // Modular data components
}
```

### Component Structure

Components are modular data pieces attached to entities:

```typescript
interface Component {
  id: UUID; // Unique identifier
  entityId: UUID; // Parent entity ID
  agentId: UUID; // Managing agent ID
  roomId: UUID; // Associated room
  worldId: UUID; // Associated world
  sourceEntityId: UUID; // Creator entity ID
  type: string; // Component type (profile, settings, etc)
  data: { [key: string]: any }; // Component data
}
```

## Entity Management

### Creating Entities

```typescript
// Create new entity
const entityId = await runtime.createEntity({
  names: ['John Doe', 'JohnD'],
  agentId: runtime.agentId,
  metadata: {
    discord: {
      username: 'john_doe',
      name: 'John Doe',
    },
  },
});

// Create with specific ID
await runtime.createEntity({
  id: customUuid,
  names: ['Agent Smith'],
  agentId: runtime.agentId,
  metadata: {
    type: 'ai_agent',
    version: '1.0',
  },
});
```

### Retrieving Entities

```typescript
// Get by ID
const entity = await runtime.getEntityById(entityId);

// Get all entities in a room (with components)
const entitiesInRoom = await runtime.getEntitiesForRoom(roomId, true);

// Get multiple by IDs
const entities = await runtime.getEntityByIds([id1, id2, id3]);
```

### Updating Entities

```typescript
await runtime.updateEntity({
  id: entityId,
  names: [...entity.names, 'Johnny'], // Add new alias
  metadata: {
    ...entity.metadata,
    customProperty: 'value',
  },
});
```

## Component System

Components enable flexible data modeling:

### Creating Components

```typescript
// Create profile component
await runtime.createComponent({
  id: componentId,
  entityId: entityId,
  agentId: runtime.agentId,
  roomId: roomId,
  worldId: worldId,
  sourceEntityId: creatorEntityId,
  type: 'profile',
  data: {
    bio: 'Software developer interested in AI',
    location: 'San Francisco',
    website: 'https://example.com',
  },
});

// Create settings component
await runtime.createComponent({
  id: settingsId,
  entityId: entityId,
  agentId: runtime.agentId,
  roomId: roomId,
  worldId: worldId,
  sourceEntityId: entityId,
  type: 'settings',
  data: {
    notifications: true,
    theme: 'dark',
    language: 'en',
  },
});
```

### Retrieving Components

```typescript
// Get specific component type
const profile = await runtime.getComponent(
  entityId,
  'profile',
  worldId, // optional filter
  sourceEntityId // optional filter
);

// Get all components for entity
const allComponents = await runtime.getComponents(
  entityId,
  worldId, // optional
  sourceEntityId // optional
);
```

### Managing Components

```typescript
// Update component
await runtime.updateComponent({
  id: profileComponent.id,
  data: {
    ...profileComponent.data,
    bio: 'Updated bio information',
  },
});

// Delete component
await runtime.deleteComponent(componentId);
```

## Entity Relationships

Entities can have relationships with other entities:

### Creating Relationships

```typescript
await runtime.createRelationship({
  sourceEntityId: entityId1,
  targetEntityId: entityId2,
  tags: ['friend', 'collaborator'],
  metadata: {
    interactions: 5,
    lastInteraction: Date.now(),
  },
});
```

### Managing Relationships

```typescript
// Get relationships
const relationships = await runtime.getRelationships({
  entityId: entityId1,
  tags: ['friend'], // optional filter
});

// Get specific relationship
const relationship = await runtime.getRelationship({
  sourceEntityId: entityId1,
  targetEntityId: entityId2,
});

// Update relationship
await runtime.updateRelationship({
  ...relationship,
  metadata: {
    ...relationship.metadata,
    interactions: relationship.metadata.interactions + 1,
    lastInteraction: Date.now(),
  },
});
```

## Entity Resolution

Find entities by name or reference:

```typescript
import { findEntityByName } from '@elizaos/core';

// Resolve entity from message context
const entity = await findEntityByName(runtime, message, state);
```

Resolution considers:

- Exact ID matches
- Username matches
- Recent conversation context
- Relationship strength
- World role permissions

## Entity Details

Format entity information:

```typescript
import { getEntityDetails, formatEntities } from '@elizaos/core';

// Get detailed entity information
const entityDetails = await getEntityDetails({
  runtime,
  roomId,
});

// Format entities for display
const formatted = formatEntities({
  entities: entitiesInRoom,
});
```

## Unique ID Generation

Create deterministic IDs for entity-agent pairs:

```typescript
import { createUniqueUuid } from '@elizaos/core';

// Generate consistent ID
const uniqueId = createUniqueUuid(runtime, baseUserId);
```

## Common Patterns

### User Entity

```typescript
const userEntity = {
  names: [userName, displayName],
  metadata: {
    platform: {
      id: platformUserId,
      username: userName,
      avatar: avatarUrl,
    },
    joinedAt: Date.now(),
  },
  agentId: runtime.agentId,
};
```

### Agent Entity

```typescript
const agentEntity = {
  id: agentId,
  names: [agentName],
  metadata: {
    type: 'agent',
    capabilities: ['chat', 'voice'],
    version: '1.0.0',
  },
  agentId: agentId, // Self-reference
};
```

### Multi-Platform Entity

```typescript
const multiPlatformEntity = {
  names: ['JohnDoe', 'john_doe', 'JD'],
  metadata: {
    discord: {
      id: discordId,
      username: 'john_doe#1234',
    },
    twitter: {
      id: twitterId,
      handle: '@johndoe',
    },
    telegram: {
      id: telegramId,
      username: 'john_doe_tg',
    },
  },
  agentId: runtime.agentId,
};
```

## Best Practices

1. **Meaningful Names**: Use descriptive names in the array
2. **Metadata Structure**: Organize by source/platform
3. **Component Usage**: Use components for modular data
4. **Permission Checking**: Verify before accessing components
5. **Relationship Updates**: Keep interaction metadata current
6. **Entity Resolution**: Use provided utilities
7. **Unique IDs**: Use `createUniqueUuid` for consistency

## Entity-Component Benefits

- **Flexibility**: Add new data types without schema changes
- **Modularity**: Components can be independently managed
- **Multi-tenancy**: Different agents can manage different components
- **Extensibility**: Plugins can define custom component types
- **Performance**: Load only needed components

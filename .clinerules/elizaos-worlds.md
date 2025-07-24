---
description: Worlds, agent representation of a server, worlds are collections of rooms which are bound together, sometimes a platform or an embodiment of an actual world
globs:
alwaysApply: false
---

# ElizaOS Worlds System

Worlds in ElizaOS are collections of entities (users, agents) and rooms (conversations, channels) that form a cohesive environment for interactions. They act as virtual spaces, similar to Discord servers, Slack workspaces, or 3D MMO environments.

## Core Concepts

### World Structure

```typescript
interface World {
  id: UUID; // Unique identifier
  name?: string; // Display name
  agentId: UUID; // Managing agent ID
  serverId: string; // External system ID
  metadata?: {
    ownership?: {
      ownerId: string; // World owner
    };
    roles?: {
      [entityId: UUID]: Role; // Entity role assignments
    };
    settings?: {
      // World-specific settings
      [key: string]: any;
    };
    [key: string]: unknown; // Additional metadata
  };
}
```

### Role System

```typescript
enum Role {
  OWNER = 'OWNER', // Full control, can assign any roles
  ADMIN = 'ADMIN', // Administrative capabilities
  NONE = 'NONE', // Standard participant
}
```

## World Management

### Creating Worlds

```typescript
// Basic world creation
const worldId = await runtime.createWorld({
  name: 'My Project Space',
  agentId: runtime.agentId,
  serverId: 'external-server-id',
  metadata: {
    ownership: {
      ownerId: ownerEntityId,
    },
  },
});

// Ensure world exists (create if not)
await runtime.ensureWorldExists({
  id: worldId,
  name: 'My Project Space',
  agentId: runtime.agentId,
  serverId: serverId,
});
```

### World Operations

```typescript
// Get world information
const world = await runtime.getWorld(worldId);

// Get all worlds
const allWorlds = await runtime.getAllWorlds();

// Update world properties
await runtime.updateWorld({
  id: worldId,
  name: 'Updated Name',
  metadata: {
    ...world.metadata,
    customProperty: 'value',
  },
});
```

## Role Management

```typescript
// Assign role to entity
const world = await runtime.getWorld(worldId);
if (!world.metadata) world.metadata = {};
if (!world.metadata.roles) world.metadata.roles = {};

world.metadata.roles[entityId] = Role.ADMIN;
await runtime.updateWorld(world);

// Check permissions
import { canModifyRole } from '@elizaos/core';

if (canModifyRole(userRole, targetRole, newRole)) {
  // Allow role change
}

// Find worlds where user is owner
import { findWorldForOwner } from '@elizaos/core';
const userWorld = await findWorldForOwner(runtime, entityId);
```

## World Settings

Worlds support configurable settings:

```typescript
import { getWorldSettings, updateWorldSettings } from '@elizaos/core';

// Get settings
const settings = await getWorldSettings(runtime, serverId);

// Update settings
settings.MY_SETTING = {
  name: 'My Setting',
  description: 'User-facing description',
  value: 'setting-value',
  required: false,
};

await updateWorldSettings(runtime, serverId, settings);
```

## Relationship with Rooms

Worlds contain multiple rooms (channels/conversations):

```typescript
// Get all rooms in a world
const worldRooms = await runtime.getRooms(worldId);

// Rooms reference their parent world
const room = {
  id: roomId,
  worldId: worldId, // Parent world reference
  // ... other properties
};
```

## World Events

```typescript
// World-related events
enum EventType {
  WORLD_JOINED = 'WORLD_JOINED',
  WORLD_CONNECTED = 'WORLD_CONNECTED',
  WORLD_LEFT = 'WORLD_LEFT',
}

// Handle world events in plugin
const plugin: Plugin = {
  name: 'world-handler',
  events: {
    [EventType.WORLD_JOINED]: [
      async (payload: WorldPayload) => {
        const { world, runtime, entities, rooms } = payload;
        console.log(`Joined world: ${world.name}`);

        // Sync entities and rooms
        await runtime.ensureConnections(entities, rooms, source, world);
      },
    ],
  },
};
```

## Integration Patterns

### Discord Server → World

```typescript
// Discord server becomes a world
const world = {
  id: createUniqueUuid(runtime, discord.guild.id),
  name: discord.guild.name,
  serverId: discord.guild.id,
  metadata: {
    platform: 'discord',
    memberCount: discord.guild.memberCount,
  },
};
```

### DM World Creation

For direct messages, create a world with ownership:

```typescript
// DM creates personal world
const dmWorld = {
  id: createUniqueUuid(runtime, userId),
  name: `${userName}'s Space`,
  serverId: userId,
  metadata: {
    ownership: {
      ownerId: userId,
    },
    roles: {
      [userId]: Role.OWNER,
    },
    settings: {}, // For onboarding
  },
};
```

## Best Practices

1. **Permission Checking**: Always verify roles before administrative actions
2. **Metadata Management**: Modify metadata carefully - it contains critical config
3. **World-Room Sync**: Keep world and room structures aligned with external platforms
4. **Event-Driven**: Use events to respond to world changes
5. **Default Settings**: Provide sensible defaults for world settings

## Common Use Cases

- **Multi-tenant Platforms**: Each organization gets its own world
- **Gaming Environments**: Game servers as worlds with zones as rooms
- **Social Platforms**: Discord servers, Slack workspaces
- **Private Spaces**: DM conversations with personal settings
- **Collaborative Tools**: Project spaces with role-based access

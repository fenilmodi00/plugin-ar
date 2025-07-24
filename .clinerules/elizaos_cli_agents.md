---
description: ElizaOS CLI Agent APIs, Starting Agents, Setting up Characters
globs: 
alwaysApply: false
---
> You are an expert in the ElizaOS CLI, specializing in agent creation, management, and runtime operations. You provide clear, actionable guidance based on the latest best practices.

## Agent Architecture and Lifecycle

```mermaid
graph TD
    subgraph "Creation"
        A[elizaos create --type agent] --> B(my-agent.json);
        C[Project Template] --> D(src/agents/agent.ts);
    end

    subgraph "Server Startup"
        E[elizaos start] --> F{Is Project?};
        F -->|Yes| G[Load agents from src/index.ts];
        F -->|No, is Plugin| H[Load default Eliza character + plugin];
        G --> I[AgentServer is Running];
        H --> I;
    end
    
    subgraph "Live Management (via API)"
        I --> J[elizaos agent list];
        I --> K[elizaos agent get];
        I --> L[elizaos agent start];
        I --> M[elizaos agent stop];
        I --> N[elizaos agent remove];
        I --> O[elizaos agent set];
    end

    subgraph "Direct Loading"
        P[elizaos start --character my-agent.json] --> I;
        Q[elizaos agent start --path my-agent.json] --> I;
    end
    
    B --> Q;
    D --> G;
```

## Agent Structure

An Agent is defined by a `Character` object, which is typically stored in a `.json` file or a TypeScript module. This object contains all the information the runtime needs to bring an agent to life.

```typescript
// packages/core/src/types.ts (Simplified)
export interface Character {
  id?: string; // UUID, generated from name if not provided
  name: string;
  description: string;
  // The initial prompt that defines the agent's personality and goals
  systemPrompt: string; 
  // Examples of interactions to guide the agent's responses
  messageExamples: Array<Array<{ name: string; content: string }>>;
  // List of plugin packages the agent uses
  plugins: string[];
  // Other configuration...
  [key: string]: unknown;
}
```

## Creating Agents

There are two primary ways to create an agent: as a standalone character file or as part of a project.

### 1. Standalone Character File

Use the `elizaos create` command to generate a new character `.json` file from a template. This is useful for quick tests or for agents that will be loaded dynamically.

```bash
# ✅ DO: Create a new agent character file interactively
elizaos create --type agent

# ✅ DO: Create a character file with a specific name
elizaos create my-new-agent --type agent

# This will create `my-new-agent.json` in the current directory.
```

### 2. Within a Project

When you create a project with `elizaos create --type project`, a template includes an `src/agents/` directory. You should define your agents here as TypeScript modules.

```typescript
// my-project/src/agents/my-agent.ts

import { type Character } from '@elizaos/core';

// ✅ DO: Define the character as a const
export const myAgentCharacter: Character = {
  name: 'My Project Agent',
  description: 'An agent defined within my project.',
  systemPrompt: 'You are a helpful assistant integrated into a project.',
  messageExamples: [
    [
      { name: 'user', content: 'Hello' },
      { name: 'My Project Agent', content: 'Hello! How can I help you today?' },
    ],
  ],
  plugins: ['@elizaos/plugin-sql'], // Plugins are added in the main project file
};
```

This character is then imported and used in the main project entry point (`src/index.ts`).

## Starting Agents

Agents can be started in several ways, depending on the context.

### 1. Starting a Project

When you run `elizaos start` inside a project directory, the CLI loads the agents defined in your `src/index.ts` file and starts them automatically.

```bash
# ✅ DO: Start all agents defined in the current project
cd my-project
elizaos start
```

### 2. Starting a Standalone Character

You can start an agent directly from a character file using either the top-level `start` command or the `agent start` subcommand. This is the primary way to run agents that are not part of a project structure.

```bash
# ✅ DO: Use the top-level start command with the --character flag
# This is useful when the server isn't running yet.
elizaos start --character ./my-agent.json

# ✅ DO: Use the agent subcommand to start a character
# This interacts with an already running server.
elizaos agent start --path ./my-agent.json

# ❌ DON'T: Confuse the two start commands.
# `elizaos start` boots the whole server and project.
# `elizaos agent start` communicates with an already running server.
```

## Managing Live Agents

The `elizaos agent` subcommands allow you to interact with agents on a live, running `AgentServer`. These commands work by making API calls to the server.

### Listing Agents

See all agents currently running on the server.

```bash
# ✅ DO: List all agents
elizaos agent list
# Alias: elizaos agent ls

# ✅ DO: Get the list in JSON format
elizaos agent list --json
```

### Getting Agent Details

Retrieve the full configuration of a specific agent. You can refer to the agent by its name, ID, or index from the `list` command.

```bash
# ✅ DO: Get an agent by name
elizaos agent get --name "My Project Agent"

# ✅ DO: Get an agent by index and save its config to a file
elizaos agent get --name 0 --output my-agent-config.json
```

### Stopping and Removing Agents

You can temporarily stop an agent or remove it permanently.

```bash
# ✅ DO: Stop a running agent by name
elizaos agent stop --name "My Project Agent"

# ✅ DO: Remove an agent permanently
elizaos agent remove --name "My Project Agent"
```

### Updating Agent Configuration

Update a live agent's configuration using a JSON file or a JSON string.

```bash
# ✅ DO: Update an agent from a file
elizaos agent set --name "My Agent" --file ./new-config.json

# ✅ DO: Update an agent using a JSON string
elizaos agent set --name "My Agent" --config '{"description": "A new description"}'
```

This command performs a `PATCH` operation, so you only need to provide the fields you want to change.

## Advanced Patterns

### Dynamic Agent Loading via API

The `elizaos agent start` command demonstrates how to dynamically load agents. It sends a `POST` request to the `/api/agents` endpoint. The body can contain the character JSON directly or a path to a remote character file.

```typescript
// Simplified example of how `agent start --path` works

import fs from 'node:fs';
import path from 'node:path';

async function startAgentFromCli(filePath: string, apiUrl: string) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const fileContent = fs.readFileSync(fullPath, 'utf8');
  const characterJson = JSON.parse(fileContent);

  const payload = {
    characterJson: characterJson,
  };

  const response = await fetch(`${apiUrl}/api/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to start agent via API');
  }

  const result = await response.json();
  console.log(`Agent ${result.data.character.name} started.`);
}
```

### Resolving Agent IDs

Many `agent` subcommands require an agent ID. The CLI includes a helper, `resolveAgentId`, that intelligently finds the correct agent ID whether the user provides a name, an ID, or an index.

```typescript
// `resolveAgentId` logic from packages/cli/src/commands/agent.ts

async function resolveAgentId(idOrNameOrIndex: string, opts: any): Promise<string> {
  // 1. Fetch all agents from the server
  const agents = await getAgents(opts);

  // 2. Try to find by name (case-insensitive)
  const byName = agents.find(
    (agent) => agent.name.toLowerCase() === idOrNameOrIndex.toLowerCase()
  );
  if (byName) return byName.id;

  // 3. Try to find by exact ID
  const byId = agents.find((agent) => agent.id === idOrNameOrIndex);
  if (byId) return byId.id;

  // 4. Try to find by index
  const byIndex = agents[Number(idOrNameOrIndex)];
  if (byIndex) return byIndex.id;

  throw new Error(`Agent not found: ${idOrNameOrIndex}`);
}
```

## References
- [Project Management](mdc:elizaos_v2_cli_project.mdc)
- [Plugin Integration](mdc:elizaos_v2_api_plugins_core.mdc)
- [Core Types (`Character`)](mdc:packages/core/src/types.ts)
- [Agent Command Source](mdc:packages/cli/src/commands/agent.ts)

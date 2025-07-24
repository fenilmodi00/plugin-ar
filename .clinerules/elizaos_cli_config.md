---
description: ElizaOS CLI configuration and settings
globs: 
alwaysApply: false
---
> You are an expert in ElizaOS configuration, focusing on environment management, security, and best practices. You provide clear, actionable guidance for developers to configure their projects effectively.

## ElizaOS Configuration Architecture

Configuration in ElizaOS is handled through a layered and context-aware system, prioritizing local project settings and secure management of secrets. The system is designed to be both user-friendly for interactive sessions and robust for automated CI/CD environments.

```mermaid
graph TD
    subgraph "User Action"
        A[elizaos create] --> B(Interactive Prompts);
        C[elizaos start] --> D[Runtime Initialization];
        E[elizaos env] --> F(Manage .env File);
    end

    subgraph "Configuration Sources (Order of Precedence)"
        G(1. Built-in Defaults) --> H(2. .env File);
        H --> I(3. CLI Flags);
    end
    
    subgraph "File System & Path Resolution"
        J[UserEnvironment Utility] --> K{Find Project Root};
        K -->|Monorepo?| L[packages/core exists];
        K -->|Standard| M[Current Directory];
        L & M --> N[Resolve .env Path];
        J --> O[Resolve .eliza/config.json Path];
    end
    
    subgraph "Runtime Loading"
        D --> P(Load .env into process.env);
        P --> Q(Apply CLI Flags);
        Q --> R(Start AgentServer w/ Config);
    end

    B --> F;
```

## Configuration Files and Locations

The `UserEnvironment` utility is the brain behind locating configuration files. It intelligently determines the project root, allowing for consistent behavior in both standalone projects and monorepos.

1.  **Project `.env` file** (Primary Configuration):
    *   **Location**: At the root of your project directory (e.g., `my-project/.env`). This is found by `UserEnvironment` by searching up from the current directory.
    *   **Purpose**: This is the most important configuration file. It stores all secrets, API keys, and environment-specific settings (e.g., `POSTGRES_URL`, `OPENAI_API_KEY`).
    *   **Management**: Use the `elizaos env` command for interactive management. For new projects, `elizaos create` will prompt you for initial values and generate this file.
    *   **Security**: This file **must never be committed to version control**. Ensure `.env` is in your `.gitignore`.

2.  **Global `config.json`**:
    *   **Location**: Inside a global `.eliza` directory in your home directory (e.g., `~/.eliza/config.json`).
    *   **Purpose**: Stores non-sensitive, global CLI state. Currently, it's used to track the `lastUpdated` timestamp. It is not intended for user configuration.
    *   **Management**: This file is managed automatically by the CLI. You should not need to edit it manually.

## Environment Management (`elizaos env`)

The `elizaos env` command suite is the dedicated tool for managing your local project's `.env` file safely and interactively.

### Listing Environment Variables (`list`)
Get a clear, color-coded overview of your system information and the contents of your local `.env` file. Sensitive values like API keys are automatically masked for security.

```bash
# ✅ DO: List system info and all local .env variables
elizaos env list
```

### Editing Environment Variables (`edit-local`)
This command launches an interactive terminal UI to securely add, edit, or delete variables in your local `.env` file. It's the safest way to manage secrets.

```bash
# ✅ DO: Start the interactive editor for the local .env file
elizaos env edit-local
```

### Resetting the Environment (`reset`)
For a clean slate, the `reset` command can clear configurations and data. It interactively prompts you to select what to reset, including the `.env` file, the cache, and the local PGLite database.

```bash
# ✅ DO: Interactively reset environment, cache, and local DB
elizaos env reset

# ✅ DO: Reset non-interactively, accepting all defaults (useful for CI/CD)
elizaos env reset --yes
```

## Configuration in Practice

### Hierarchy and Precedence
ElizaOS applies configuration in the following order (lower numbers are overridden by higher numbers):

1.  **Built-in Defaults**: Default values hardcoded in the CLI (e.g., server port `3000`, default model names).
2.  **`.env` File**: Variables loaded from your project's local `.env` file via `dotenv`. **This is the standard place for your configuration.**
3.  **Command-Line Flags**: Arguments passed directly to a command (e.g., `elizaos start --port 4000`) will always take the highest precedence, overriding all other sources.

### The `create` Workflow
When you run `elizaos create`, the CLI uses the `env-prompt.ts` utility to guide you.

```typescript
// packages/cli/src/utils/env-prompt.ts

// The CLI has a predefined map of required/optional configs for known plugins.
const ENV_VAR_CONFIGS: Record<string, EnvVarConfig[]> = {
  openai: [ { name: 'OpenAI API Key', key: 'OPENAI_API_KEY', ... } ],
  discord: [ { name: 'Discord API Token', key: 'DISCORD_API_TOKEN', ... } ],
  // ... and so on
};

// It uses this map to interactively prompt the user.
export async function promptForEnvVars(pluginName: string): Promise<void> {
  const envVarConfigs = ENV_VAR_CONFIGS[pluginName.toLowerCase()];
  // ...
  // It then prompts for each required variable...
  const value = await promptForEnvVar(config);
  // ...and writes the result to the .env file.
  await writeEnvFile(envVars);
}
```

### The `start` Workflow
The `elizaos start` command uses `UserEnvironment` to find the correct `.env` file and loads it using `dotenv`. This populates `process.env`, making the variables available to the entire runtime and all plugins.

```typescript
// packages/core/src/runtime.ts

// ✅ DO: Access settings through the runtime's helper method.
// This provides a consistent access pattern.
public getSetting(key: string): string | boolean | null | any {
    const value =
      this.character.secrets?.[key] ||
      this.character.settings?.[key] ||
      this.settings[key]; // this.settings is populated from process.env
    // ... handles decryption ...
    return decryptedValue || null;
}

// In a plugin's init or handler:
const apiKey = runtime.getSetting('OPENAI_API_KEY');
```

## Security Best Practices
-   **Secrets belong in `.env`**: Always use your project's local `.env` file for API keys, database URLs, and any other sensitive data.
-   **Never Hardcode Secrets**: Do not write secrets directly in your source code (`.ts` files). This is a major security risk.
-   **Git Ignore**: Your `.gitignore` file must include `.env` to prevent accidental commits of your secrets. The default project template handles this for you.
-   **CI/CD**: For automated environments, do not check in a `.env` file. Instead, use your CI/CD provider's secret management system to inject the required values as environment variables at build/runtime.

## References
- [UserEnvironment Utility](mdc:packages/cli/src/utils/user-environment.ts)
- [Environment Prompting Logic](mdc:packages/cli/src/utils/env-prompt.ts)
- [Env Command Source](mdc:packages/cli/src/commands/env.ts)
- [Agent Management Rules](mdc:elizaos_v2_cli_agents.mdc)

---
description: ElizaOS CLI Project and Project Loading
globs: 
alwaysApply: false
---
> You are an expert in the ElizaOS CLI, focusing on project management, configuration, and development workflows. You produce clear, comprehensive documentation and examples using the latest CLI features and best practices.

## ElizaOS Project Architecture

```mermaid
graph TD
    A[Start: elizaos create] --> B{Project Type?};
    B -->|Project| C[Create Project Directory];
    B -->|Plugin| D[Create Plugin Directory];
    B -->|Agent| E[Create Character .json];

    C --> F{Database?};
    F -->|PGLite| G[Setup PGLite in .elizadb];
    F -->|Postgres| H[Prompt for POSTGRES_URL];
    
    C --> I{AI Model?};
    I -->|Local| J[Use Local AI];
    I -->|OpenAI| K[Prompt for OPENAI_API_KEY];
    I -->|Claude| L[Prompt for ANTHROPIC_API_KEY];

    subgraph "Project Setup"
        direction LR
        G --> M[Copy project-starter template];
        H --> M;
        J --> M;
        K --> M;
        L --> M;
        M --> N[Install Dependencies];
        N --> O[Build Project];
    end
    
    D --> P[Copy plugin-starter template];
    P --> Q[Install Dependencies];
    Q --> R[Build Plugin];

    subgraph "Execution"
        direction LR
        S[elizaos start] --> T{Detect Dir Type};
        T -->|Project| U[Load Project Agents];
        T -->|Plugin| V[Load Default Agent + Plugin];
        U --> W[Start AgentServer];
        V --> W;
        E --> X[elizaos agent start --path <file>];
        X --> W;
    end
    
    O --> S;
    R --> S;
```

## Project Structure

A standard ElizaOS project has the following structure, created by `elizaos create`.

```
my-project/
├── .env                  # Environment variables (API keys, DB URLs)
├── .gitignore            # Standard git ignore for Node.js projects
├── .elizadb/             # PGLite database files (if using PGLite)
├── bun.lockb             # Bun lockfile
├── package.json          # Project definition and dependencies
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── index.ts          # Main project entry point
│   ├── agents/           # Agent character definitions
│   │   └── my-agent.ts
│   └── plugins/          # Project-specific plugins
│       └── my-plugin.ts
├── knowledge/            # Knowledge files for agents
└── dist/                 # Compiled output
```

## Core Implementation Patterns

### Creating a New Project

The `elizaos create` command is the unified entry point for creating projects, plugins, or standalone agent character files.

```bash
# ✅ DO: Use the interactive `create` command
elizaos create

# ✅ DO: Create a new project non-interactively
elizaos create my-new-project --type project --yes

# ✅ DO: Create a new plugin
elizaos create my-new-plugin --type plugin

# ✅ DO: Create a project in the current directory
elizaos create .

# ❌ DON'T: Manually create project directories and files.
# The `create` command handles templates, dependencies, and initial configuration.
```

The interactive `create` command will guide you through:
1.  **Choosing a type**: Project, Plugin, or Agent.
2.  **Naming**: Providing a valid npm package name.
3.  **Database Selection**: Choosing between PGLite (development) and PostgreSQL (production).
4.  **AI Model Selection**: Choosing between Local AI, OpenAI, or Anthropic.

### Starting a Project

The `elizaos start` command is used to run your project or test your plugin. It automatically detects the context (project or plugin) in the current directory.

```bash
# ✅ DO: Start the project from its root directory
cd my-new-project
elizaos start

# ✅ DO: Start and automatically build the project first
elizaos start --build

# ✅ DO: Specify a port for the server
elizaos start --port 4000

# ❌ DON'T: Run start from outside a project/plugin directory.
# It relies on the local `package.json` and file structure to work correctly.
```

### Building a Project

Projects need to be built (transpiled from TypeScript to JavaScript) before they can be run in production. The build step is often handled automatically by `start`, but can be run manually.

```bash
# ✅ DO: Manually build a project
elizaos build

# ✅ DO: Manually build a plugin
# The command is the same, it detects the context.
elizaos build

# The `build` command is a wrapper around `tsup` or a similar bundler
# defined in your project's `package.json`.
```

### Managing Dependencies

Project dependencies, including plugins, are managed in `package.json`. Use `bun` to manage them. Core ElizaOS plugins are scoped under `@elizaos`.

```bash
# ✅ DO: Add a new ElizaOS plugin to your project
bun add @elizaos/plugin-openai

# ✅ DO: Add a local plugin using a file path
bun add ../path/to/my-local-plugin

# After adding a plugin to package.json, you must register it
# with an agent in your project's main entry point (e.g., `src/index.ts`).
# The `start` command will handle installing any missing plugins.

# ❌ DON'T: Manually edit `bun.lockb`. Use the `bun` command.
```

## Advanced Patterns

### Project Entry Point (`src/index.ts`)

The project entry point is where you define your agents and associate them with plugins. The `start` command executes this file.

```typescript
// src/index.ts

import { myAgentCharacter } from './agents/my-agent';
import { myProjectPlugin } from './plugins/my-plugin';
import { type Project } from '@elizaos/core';

// ✅ DO: Define a project with one or more agents
const project: Project = {
  agents: [
    {
      character: myAgentCharacter,
      // List all plugins the agent should use
      plugins: [
        '@elizaos/plugin-sql',
        '@elizaos/plugin-openai',
        myProjectPlugin, // A local plugin
      ],
      // Optional init function for the agent
      init: (runtime) => {
        console.log(`Agent ${runtime.character.name} initialized!`);
      },
    },
  ],
};

// ✅ DO: Export the project as the default export
export default project;
```

### Loading Multiple Characters

The `start` command can load one or more standalone character files, overriding the project's default agents. This is useful for testing or running different agent configurations without changing the code.

```bash
# ✅ DO: Load a single character file
elizaos start --character ./path/to/my-agent.json

# ✅ DO: Load multiple character files
elizaos start --character ./agent1.json ./agent2.json

# ✅ DO: Load characters using comma-separated values
elizaos start --character="./agent1.json, ./agent2.json"

# Note: When using --character, the agents defined in your
# project's `src/index.ts` will be ignored.
```

### Non-Interactive Mode

For CI/CD or automated environments, use the `-y` (`--yes`) flag with `create` to skip all interactive prompts and use default values.

```bash
# ✅ DO: Create a project non-interactively
elizaos create my-ci-project --type project --yes

# ✅ DO: Create a plugin non-interactively
elizaos create my-ci-plugin --type plugin --yes
```

This will create a project/plugin with default settings:
*   **Database**: PGLite
*   **AI Model**: Local AI

Placeholders for API keys will be added to the `.env` file, which you can then populate using environment variables in your CI/CD system.

## References
- [ElizaOS CLI Documentation](mdc:https:/eliza.how/docs/cli)
- [Managing Agents](mdc:elizaos_v2_cli_agents.mdc)
- [Project Configuration](mdc:elizaos_v2_cli_config.mdc)

      throw new ProjectValidationError(
        `Command must be run inside an ElizaOS project directory. ` +
        `Current directory: ${getDirectoryTypeDescription(directoryInfo)}`
      );
    }
    
    // Normalize plugin name and resolve package
    const normalizedName = normalizePluginNameForDisplay(pluginArg);
    const packageName = await resolvePluginPackage(pluginArg, opts);
    
    console.log(`Installing plugin: ${normalizedName}`);
    
    // Install plugin with dependency resolution
    await installPlugin(packageName, {
      branch: opts.branch,
      tag: opts.tag,
      skipEnvPrompt: opts.noEnvPrompt,
      cwd
    });
    
    // Update project configuration
    await updateProjectConfig(cwd, packageName);
    
    console.log(`✅ Plugin ${normalizedName} installed successfully`);
  });

// Plugin removal with cleanup
plugins
  .command('remove')
  .alias('delete')
  .description('Remove a plugin from the project')
  .argument('<plugin>', 'Plugin name to remove')
  .action(async (pluginArg: string) => {
    const cwd = process.cwd();
    const allDependencies = getDependenciesFromDirectory(cwd);
    
    if (!allDependencies) {
      throw new ProjectValidationError('Could not read project dependencies');
    }
    
    const packageName = findPluginPackageName(pluginArg, allDependencies);
    
    if (!packageName) {
      throw new PluginNotFoundError(`Plugin "${pluginArg}" not found in dependencies`);
    }
    
    // Remove plugin and clean up configuration
    await removePlugin(packageName, cwd);
    await cleanupPluginConfig(cwd, packageName);
    
    console.log(`✅ Plugin ${pluginArg} removed successfully`);
  });

// ❌ DON'T: Install plugins without validation or proper error handling
plugins
  .command('bad-add')
  .action(async (plugin: string) => {
    // No validation, no dependency resolution, no error handling
    await execa('npm', ['install', plugin]);
  });
```

### Development Workflow Commands

```typescript
// ✅ DO: Implement comprehensive development server with hot reload and configuration
export const dev = new Command()
  .name('dev')
  .description('Start the project in development mode')
  .option('-c, --configure', 'Reconfigure services and AI models')
  .option('-char, --character [paths...]', 'Character file(s) to use')
  .option('-b, --build', 'Build the project before starting')
  .option('-p, --port <port>', 'Port to listen on', parseInt)
  .action(async (opts) => {
    try {
      const projectConfig = await loadProjectConfiguration();
      
      // Build project if requested
      if (opts.build) {
        console.log('Building project...');
        await buildProject();
      }
      
      // Handle character file configuration
      const characterPaths = await resolveCharacterPaths(opts.character);
      
      // Setup development environment
      const devConfig = {
        port: opts.port || projectConfig.defaultPort || 3000,
        characters: characterPaths,
        hotReload: true,
        watch: ['src/**/*.ts', 'characters/**/*.json'],
        env: 'development'
      };
      
      // Start development server with hot reload
      await startDevelopmentServer(devConfig);
      
      // Setup file watchers for auto-reload
      setupFileWatchers(devConfig.watch, () => {
        console.log('Changes detected, reloading...');
        restartServer();
      });
      
      console.log(`🚀 Development server running on port ${devConfig.port}`);
      console.log(`📁 Characters: ${characterPaths.join(', ')}`);
      
    } catch (error) {
      handleDevelopmentError(error);
    }
  });

// Character path resolution with validation
async function resolveCharacterPaths(characterInput?: string[]): Promise<string[]> {
  if (!characterInput || characterInput.length === 0) {
    // Look for default character files
    const defaultPaths = [
      'characters/default.json',
      'character.json',
      'src/character.json'
    ];
    
    for (const defaultPath of defaultPaths) {
      if (await fs.access(defaultPath).then(() => true).catch(() => false)) {
        return [defaultPath];
      }
    }
    
    throw new ConfigurationError('No character files found. Use --character to specify files.');
  }
  
  const resolvedPaths: string[] = [];
  
  for (const input of characterInput) {
    if (input.startsWith('http')) {
      // Remote character file
      resolvedPaths.push(input);
    } else {
      // Local file - add .json extension if missing
      const path = input.endsWith('.json') ? input : `${input}.json`;
      
      if (await fs.access(path).then(() => true).catch(() => false)) {
        resolvedPaths.push(path);
      } else {
        throw new FileNotFoundError(`Character file not found: ${path}`);
      }
    }
  }
  
  return resolvedPaths;
}

// Production start command
export const start = new Command()
  .name('start')
  .description('Start the project in production mode')
  .option('-p, --port <port>', 'Port to listen on', parseInt)
  .option('-char, --character [paths...]', 'Character file(s) to use')
  .action(async (opts) => {
    try {
      const projectConfig = await loadProjectConfiguration();
      const characterPaths = await resolveCharacterPaths(opts.character);
      
      const prodConfig = {
        port: opts.port || process.env.PORT || projectConfig.defaultPort || 3000,
        characters: characterPaths,
        env: 'production',
        clustering: projectConfig.clustering || false
      };
      
      console.log('🚀 Starting ElizaOS in production mode...');
      await startProductionServer(prodConfig);
      
    } catch (error) {
      handleProductionError(error);
    }
  });

// ❌ DON'T: Start development without proper configuration or error handling
export const badDev = new Command()
  .action(async () => {
    // No configuration, no character handling, no error handling
    require('./src/index.js');
  });
```

## Error Handling and Validation

### Custom Error Classes

```typescript
// ✅ DO: Implement specific error types for different failure scenarios
export class ProjectValidationError extends Error {
  constructor(message: string, public context?: Record<string, any>) {
    super(message);
    this.name = 'ProjectValidationError';
  }
}

export class PluginInstallationError extends Error {
  constructor(
    message: string,
    public pluginName: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'PluginInstallationError';
  }
}

export class PluginNotFoundError extends Error {
  constructor(message: string, public pluginName: string) {
    super(message);
    this.name = 'PluginNotFoundError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, public configType?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class FileNotFoundError extends Error {
  constructor(message: string, public filePath: string) {
    super(message);
    this.name = 'FileNotFoundError';
  }
}

// Centralized error handler
export function handleCreateError(error: unknown): never {
  if (error instanceof ProjectValidationError) {
    console.error(`❌ Project validation failed: ${error.message}`);
    if (error.context) {
      console.error('Context:', error.context);
    }
  } else if (error instanceof PluginInstallationError) {
    console.error(`❌ Plugin installation failed: ${error.message}`);
    console.error(`Plugin: ${error.pluginName}`);
    if (error.cause) {
      console.error('Caused by:', error.cause.message);
    }
  } else if (error instanceof ConfigurationError) {
    console.error(`❌ Configuration error: ${error.message}`);
    if (error.configType) {
      console.error(`Configuration type: ${error.configType}`);
    }
  } else {
    console.error(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  process.exit(1);
}
```

### Validation Patterns

```typescript
// ✅ DO: Implement comprehensive validation for project names and configurations
export const validateProjectName = (name: string): boolean => {
  // Check for valid npm package name
  const npmPattern = /^[a-z0-9](mdc:[a-z0-9-]*[a-z0-9])?$/;
  
  if (!npmPattern.test(name)) {
    throw new ProjectValidationError(
      'Project name must be a valid npm package name (lowercase, no spaces, can contain hyphens)'
    );
  }
  
  // Check for reserved names
  const reservedNames = ['elizaos', 'eliza', 'node_modules', 'package'];
  if (reservedNames.includes(name.toLowerCase())) {
    throw new ProjectValidationError(`Project name "${name}" is reserved`);
  }
  
  return true;
};

export const validatePluginName = (name: string): boolean => {
  // Normalize and validate plugin name
  const normalized = normalizePluginNameForDisplay(name);
  
  if (normalized.length < 3) {
    throw new ProjectValidationError('Plugin name must be at least 3 characters long');
  }
  
  return true;
};

// Directory type detection and validation
export interface DirectoryInfo {
  hasPackageJson: boolean;
  hasElizaConfig: boolean;
  isElizaProject: boolean;
  isPlugin: boolean;
  projectType: 'eliza-project' | 'plugin' | 'other' | 'empty';
}

export function detectDirectoryType(dir: string): DirectoryInfo {
  const packageJsonPath = path.join(dir, 'package.json');
  const elizaConfigPath = path.join(dir, 'elizaos.config.js');
  
  const hasPackageJson = fs.existsSync(packageJsonPath);
  const hasElizaConfig = fs.existsSync(elizaConfigPath);
  
  let isElizaProject = false;
  let isPlugin = false;
  let projectType: DirectoryInfo['projectType'] = 'empty';
  
  if (hasPackageJson) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      isElizaProject = !!packageJson.dependencies?.['@elizaos/core'];
      isPlugin = packageJson.name?.startsWith('plugin-') || 
                 packageJson.name?.includes('/plugin-');
      
      if (isElizaProject) {
        projectType = isPlugin ? 'plugin' : 'eliza-project';
      } else {
        projectType = 'other';
      }
    } catch {
      projectType = 'other';
    }
  }
  
  return {
    hasPackageJson,
    hasElizaConfig,
    isElizaProject,
    isPlugin,
    projectType
  };
}

// ❌ DON'T: Skip validation or use weak checks
export const badValidation = (name: string): boolean => {
  return name.length > 0; // Too weak, allows invalid names
};
```

## Plugin Name Resolution

### Name Normalization Patterns

```typescript
// ✅ DO: Implement comprehensive plugin name normalization and resolution
export const normalizePluginNameForDisplay = (pluginInput: string): string => {
  let baseName = pluginInput;
  
  // Handle scoped formats like "@scope/plugin-name" or "scope/plugin-name"
  if (pluginInput.includes('/')) {
    const parts = pluginInput.split('/');
    baseName = parts[parts.length - 1];
  }
  // Handle "@plugin-name" format
  else if (pluginInput.startsWith('@')) {
    baseName = pluginInput.substring(1);
  }
  
  // Ensure it starts with 'plugin-' and remove duplicates
  baseName = baseName.replace(/^plugin-/, '');
  return `plugin-${baseName}`;
};

export const findPluginPackageName = (
  pluginInput: string,
  allDependencies: Record<string, string>
): string | null => {
  const normalizedBase = pluginInput
    .replace(/^@[^/]+\//, '') // Remove scope
    .replace(/^plugin-/, ''); // Remove prefix
  
  // Potential package names to check in order of preference
  const possibleNames = [
    pluginInput, // Check raw input first
    `@elizaos/plugin-${normalizedBase}`, // Official scope
    `@elizaos-plugins/plugin-${normalizedBase}`, // Alternative scope
    `plugin-${normalizedBase}`, // Unscoped
    `@elizaos/${normalizedBase}`, // Official without plugin prefix
    `@elizaos-plugins/${normalizedBase}` // Alternative without prefix
  ];
  
  for (const name of possibleNames) {
    if (allDependencies[name]) {
      return name;
    }
  }
  
  return null;
};

// Registry-based resolution with fallback
export async function resolvePluginPackage(
  pluginInput: string, 
  opts: { branch?: string; tag?: string }
): Promise<string> {
  try {
    const registry = await fetchPluginRegistry();
    
    if (registry?.registry[pluginInput]) {
      const pluginInfo = registry.registry[pluginInput];
      
      // Use tag-specific version if available
      if (opts.tag && pluginInfo.npm?.tags?.[opts.tag]) {
        return `${pluginInput}@${pluginInfo.npm.tags[opts.tag]}`;
      }
      
      // Use latest compatible version
      const latestVersion = pluginInfo.npm?.v1 || pluginInfo.npm?.v0;
      if (latestVersion) {
        return `${pluginInput}@${latestVersion}`;
      }
    }
    
    // Fallback to normalized name
    return normalizePluginNameForDisplay(pluginInput);
    
  } catch (error) {
    console.warn('Could not fetch plugin registry, using normalized name');
    return normalizePluginNameForDisplay(pluginInput);
  }
}

// ❌ DON'T: Use simple string replacement without proper validation
export const badNormalization = (name: string): string => {
  return name.replace('plugin-', ''); // Loses important context
};
```

## Performance Optimization

### Dependency Installation Optimization

```typescript
// ✅ DO: Implement optimized dependency installation with parallel processing
export async function installDependencies(
  targetDir: string,
  options?: {
    skipOptional?: boolean;
    parallel?: boolean;
    timeout?: number;
  }
): Promise<void> {
  const opts = {
    skipOptional: true,
    parallel: true,
    timeout: 300000, // 5 minutes
    ...options
  };
  
  console.log('📦 Installing dependencies...');
  const startTime = Date.now();
  
  try {
    const installArgs = ['install'];
    
    if (opts.skipOptional) {
      installArgs.push('--no-optional');
    }
    
    if (opts.parallel) {
      installArgs.push('--parallel');
    }
    
    await runBunCommand(installArgs, targetDir, {
      timeout: opts.timeout,
      stdio: 'inherit'
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ Dependencies installed in ${(duration / 1000).toFixed(1)}s`);
    
  } catch (error) {
    console.warn(
      'Failed to install dependencies automatically. ' +
      'Please run "bun install" manually in the project directory.'
    );
    throw new PluginInstallationError(
      'Dependency installation failed',
      'dependencies',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

// Cache plugin registry to avoid repeated network calls
let registryCache: any = null;
let registryCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchPluginRegistry(): Promise<any> {
  const now = Date.now();
  
  if (registryCache && (now - registryCacheTime) < CACHE_DURATION) {
    return registryCache;
  }
  
  try {
    const response = await fetch(PLUGIN_REGISTRY_URL, {
      timeout: 10000 // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Registry fetch failed: ${response.statusText}`);
    }
    
    registryCache = await response.json();
    registryCacheTime = now;
    
    return registryCache;
    
  } catch (error) {
    if (registryCache) {
      console.warn('Using cached registry due to fetch error');
      return registryCache;
    }
    throw error;
  }
}

// ❌ DON'T: Install dependencies without optimization or error handling
export async function badInstallDependencies(dir: string): Promise<void> {
  // No error handling, no optimization, no feedback
  await execa('npm', ['install'], { cwd: dir });
}
```

## Anti-patterns and Common Mistakes

### Command Structure Anti-patterns

```typescript
// ❌ DON'T: Create commands without proper option validation or help
const badCommand = new Command()
  .name('bad')
  .action(async (options) => {
    // No validation, no error handling, no help
    console.log('Doing something...');
  });

// ❌ DON'T: Mix command concerns or create overly complex commands
const confusedCommand = new Command()
  .name('confused')
  .action(async (options) => {
    // Doing project creation, plugin management, AND deployment
    await createProject();
    await installPlugins();
    await deployToProduction();
  });

// ✅ DO: Create focused, well-documented commands with proper validation
const goodCommand = new Command()
  .name('create-project')
  .description('Create a new ElizaOS project with specified configuration')
  .argument('<name>', 'Project name (must be valid npm package name)')
  .option('-d, --dir <directory>', 'Target directory for project creation', '.')
  .option('-t, --template <template>', 'Project template to use', 'default')
  .addHelpText('after', `
Examples:
  $ elizaos create-project my-agent
  $ elizaos create-project my-agent --dir ./projects --template advanced
  `)
  .action(async (name: string, options) => {
    try {
      validateProjectName(name);
      await createProject(name, options);
    } catch (error) {
      handleCreateError(error);
    }
  });
```

### Error Handling Anti-patterns

```typescript
// ❌ DON'T: Swallow errors or provide unhelpful error messages
async function badErrorHandling() {
  try {
    await riskyOperation();
  } catch (error) {
    console.log('Something went wrong'); // No context
    return; // Silent failure
  }
}

// ❌ DON'T: Throw generic errors without context
function badValidation(name: string) {
  if (!name) {
    throw new Error('Invalid'); // No helpful information
  }
}

// ✅ DO: Provide contextual error messages with recovery suggestions
async function goodErrorHandling() {
  try {
    await riskyOperation();
  } catch (error) {
    if (error instanceof NetworkError) {
      console.error('❌ Network error occurred. Please check your internet connection.');
      console.error('💡 Try running "elizaos plugins update" to refresh the registry.');
    } else if (error instanceof ValidationError) {
      console.error(`❌ Validation failed: ${error.message}`);
      console.error('💡 Check the project name and try again.');
    } else {
      console.error('❌ Unexpected error occurred');
      console.error(`Details: ${error.message}`);
      console.error('💡 Please report this issue if it persists.');
    }
    process.exit(1);
  }
}
```

## Best Practices Summary

### Command Design
- Use focused, single-purpose commands
- Provide comprehensive help and examples
- Implement proper argument and option validation
- Use aliases for commonly used commands

### Error Handling
- Create specific error types for different scenarios
- Provide contextual error messages with suggested solutions
- Implement graceful fallbacks where possible
- Log errors with appropriate detail levels

### Performance
- Cache registry data to avoid repeated network calls
- Use parallel processing for dependency installation
- Implement timeouts for network operations
- Provide progress feedback for long-running operations

### User Experience
- Use interactive prompts for better developer experience
- Provide sensible defaults for all options
- Show clear success and progress messages
- Include helpful examples in command descriptions

### Configuration Management
- Support both interactive and non-interactive modes
- Validate all configuration before processing
- Use environment variables for sensitive data
- Provide configuration templates and examples

## References
- [ElizaOS CLI Source](mdc:Users/ilessio/dev-agents/PROJECTS/cursor_rules/eliza/packages/cli/src)
- [Commander.js Documentation](mdc:https:/github.com/tj/commander.js)
- [Project Creation Patterns](mdc:Users/ilessio/dev-agents/PROJECTS/cursor_rules/eliza/packages/cli/src/commands/create.ts)
- [Plugin Management System](mdc:Users/ilessio/dev-agents/PROJECTS/cursor_rules/eliza/packages/cli/src/commands/plugins.ts)
- [Development Workflow Commands](mdc:Users/ilessio/dev-agents/PROJECTS/cursor_rules/eliza/packages/cli/src/commands/dev.ts)

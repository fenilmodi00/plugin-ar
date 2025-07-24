---
description: 
globs: 
alwaysApply: false
---
# ElizaOS Cypress Frontend Testing

This guide explains how to write and run Cypress tests for ElizaOS frontend components, plugin UIs, and web interfaces using the integrated CLI test runner.

## Overview

ElizaOS supports Cypress for frontend UI testing as part of its comprehensive testing strategy:

- **Unit Tests**: Test individual functions with mocks (Vitest)
- **E2E Runtime Tests**: Test agent behavior with real runtime
- **Cypress Frontend Tests**: Test UI components and user interactions

Cypress tests are automatically detected and run by `elizaos test` when a Cypress configuration file is present.

## Automatic Cypress Detection

The CLI automatically detects Cypress tests by looking for:

- `cypress.config.ts`, `cypress.config.js`, or `cypress.json`
- A `cypress` directory

When detected, Cypress tests run after unit and E2E tests in the test pipeline.

## Test Structure

### Plugin with Frontend UI

```
packages/my-plugin/
├── src/
│   ├── index.ts           # Plugin definition with routes
│   └── frontend/          # Frontend code
│       └── index.tsx      # UI components
├── cypress/
│   ├── e2e/              # E2E UI tests
│   │   └── plugin-ui.cy.ts
│   ├── support/          # Cypress configuration
│   │   └── e2e.ts
│   └── screenshots/      # Failure screenshots (auto-generated)
├── cypress.config.ts     # Cypress configuration
└── package.json         # Must include cypress as devDependency
```

## Cypress Configuration

### Basic Configuration

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: false,
    video: false, // Disable video recording
    screenshotOnRunFailure: true, // Enable screenshots for debugging
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
  },
});
```

## Writing Cypress Tests

### Testing Plugin UI Routes

```typescript
// cypress/e2e/plugin-ui.cy.ts
describe('Plugin UI Tests', () => {
  // Agent ID is provided by the CLI via environment
  const agentId = Cypress.env('AGENT_IDS')?.split(',')[0] || 'test-agent';

  beforeEach(() => {
    // Clear any previous state
    cy.clearAllSessionStorage();
  });

  it('should load the plugin UI successfully', () => {
    // Visit plugin route with agent ID
    cy.visit(`/api/agents/${agentId}/plugins/my-plugin/display`);

    // Verify page loaded without errors
    cy.get('body').should('exist');
    cy.get('body').should('not.contain', '404');
    cy.get('body').should('not.contain', 'Not Found');

    // Verify UI elements
    cy.get('[data-testid="main-heading"]').should('be.visible');
    cy.get('[data-testid="agent-info"]').should('contain', agentId);
  });

  it('should interact with UI elements', () => {
    cy.visit(`/api/agents/${agentId}/plugins/my-plugin/display`);

    // Test button clicks
    cy.get('[data-testid="action-button"]').click();
    cy.get('[data-testid="result"]').should('be.visible');

    // Test form submission
    cy.get('input[name="query"]').type('test query');
    cy.get('form').submit();
    cy.get('[data-testid="results"]').should('contain', 'test query');
  });
});
```

### Testing API Interactions

```typescript
describe('Plugin API Tests', () => {
  const agentId = Cypress.env('AGENT_IDS')?.split(',')[0] || 'test-agent';

  it('should call plugin API endpoints', () => {
    cy.request('GET', `/api/agents/${agentId}/plugins/my-plugin/api/data`)
      .then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('data');
      });
  });

  it('should handle API errors gracefully', () => {
    cy.request({
      url: `/api/agents/${agentId}/plugins/my-plugin/api/invalid`,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(404);
    });
  });
});
```

### Testing React Components

For plugins using React:

```typescript
describe('React Component Tests', () => {
  const agentId = Cypress.env('AGENT_IDS')?.split(',')[0];

  it('should render React components correctly', () => {
    cy.visit(`/api/agents/${agentId}/plugins/my-plugin/app`);

    // Wait for React to render
    cy.get('#root').should('exist');

    // Test React-specific behaviors
    cy.get('[data-testid="counter"]').should('contain', '0');
    cy.get('[data-testid="increment"]').click();
    cy.get('[data-testid="counter"]').should('contain', '1');
  });

  it('should handle React hooks and state', () => {
    cy.visit(`/api/agents/${agentId}/plugins/my-plugin/app`);

    // Test async data loading
    cy.intercept('GET', '**/api/data', { fixture: 'mockData.json' });
    cy.get('[data-testid="load-data"]').click();
    cy.get('[data-testid="loading"]').should('be.visible');
    cy.get('[data-testid="data-list"]').should('have.length.greaterThan', 0);
  });
});
```

## Plugin Route Structure

Your plugin must serve UI content via routes:

```typescript
// src/index.ts
import type { Plugin, Route } from '@elizaos/core';

const routes: Route[] = [
  {
    type: 'GET',
    path: '/display',
    handler: async (req, res, runtime) => {
      const html = generateHTML(runtime.agentId);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    },
    name: 'Plugin UI',
    public: true, // Makes it available as a tab
  },
  {
    type: 'GET',
    path: '/api/data',
    handler: async (req, res, runtime) => {
      const data = await fetchData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    },
  },
];

export const MyPlugin: Plugin = {
  name: 'my-plugin',
  routes,
  // ... other plugin properties
};
```

## Running Tests

### Via CLI (Recommended)

```bash
# Run all tests including Cypress
elizaos test

# The CLI will:
# 1. Run unit tests (Vitest)
# 2. Run E2E runtime tests
# 3. Start the server
# 4. Run Cypress tests
# 5. Clean up
```

### Manual Cypress Commands

For development and debugging:

```bash
# Open Cypress Test Runner (interactive mode)
npx cypress open

# Run in headless mode
npx cypress run

# Run specific test
npx cypress run --spec "cypress/e2e/my-test.cy.ts"
```

## Environment Variables

The CLI provides these environment variables to Cypress:

- `CYPRESS_BASE_URL`: The server URL (e.g., http://localhost:3000)
- `CYPRESS_AGENT_IDS`: Comma-separated list of agent IDs

## Error Detection

The CLI detects Cypress failures through:

1. **Exit Codes**: Non-zero exit code indicates failure
2. **Screenshots**: Any screenshots in `cypress/screenshots` indicate failures
3. **Console Output**: Parsed for error messages

## Best Practices

### 1. Use Data Attributes

```html
<!-- In your HTML -->
<button data-testid="submit-button">Submit</button>

<!-- In your tests -->
cy.get('[data-testid="submit-button"]').click();
```

### 2. Handle Async Operations

```typescript
// Wait for API calls
cy.intercept('GET', '**/api/data').as('getData');
cy.visit('/page');
cy.wait('@getData');

// Wait for elements
cy.get('[data-testid="result"]', { timeout: 10000 }).should('be.visible');
```

### 3. Clean State Between Tests

```typescript
beforeEach(() => {
  cy.clearLocalStorage();
  cy.clearCookies();
  cy.clearAllSessionStorage();
});
```

### 4. Test Error States

```typescript
it('should handle errors gracefully', () => {
  // Simulate API error
  cy.intercept('GET', '**/api/data', {
    statusCode: 500,
    body: { error: 'Server error' },
  });

  cy.visit('/page');
  cy.get('[data-testid="error-message"]').should('contain', 'Server error');
});
```

### 5. Avoid Hardcoded Waits

```typescript
// ❌ Bad
cy.wait(2000);

// ✅ Good
cy.get('[data-testid="loaded"]').should('be.visible');
```

## Common Issues

### Port Already in Use

The CLI finds an available port automatically, but if you see port conflicts:

```typescript
// The CLI sets CYPRESS_BASE_URL dynamically
const baseUrl = Cypress.env('BASE_URL') || 'http://localhost:3000';
```

### Agent ID Not Available

Always check for agent ID availability:

```typescript
const agentId = Cypress.env('AGENT_IDS')?.split(',')[0];
if (!agentId) {
  throw new Error('No agent ID provided by test runner');
}
```

### Screenshot Cleanup

The CLI automatically cleans up screenshots before running tests, but you can manually clean:

```bash
rm -rf cypress/screenshots cypress/videos
```

## Integration with CI/CD

The `elizaos test` command is CI-friendly:

```yaml
# GitHub Actions example
- name: Run Tests
  run: |
    bun install
    bun run build
    elizaos test
```

## Plugin Development Workflow

1. **Create Plugin Structure**
   ```bash
   elizaos create plugin my-ui-plugin
   ```

2. **Add Cypress**
   ```bash
   cd packages/my-ui-plugin
   bun add -D cypress
   ```

3. **Create Cypress Config**
   ```bash
   touch cypress.config.ts
   mkdir -p cypress/e2e
   ```

4. **Write Tests**
   ```bash
   touch cypress/e2e/ui.cy.ts
   ```

5. **Run Tests**
   ```bash
   elizaos test
   ```

## Debugging Failed Tests

When tests fail, the CLI provides:

1. **Exit Code**: Non-zero indicates failure
2. **Console Output**: Full Cypress output
3. **Screenshots**: Check `cypress/screenshots/` for failure captures
4. **Error Messages**: Detailed failure reasons

To debug interactively:

```bash
# Open Cypress Test Runner
npx cypress open

# Select the failing test
# Use Chrome DevTools for debugging
```

## Example: Complete Plugin with Tests

See the `plugin-todo` and `plugin-knowledge` packages for complete examples of plugins with Cypress tests:

- Frontend routes serving HTML/React
- API endpoints
- Cypress tests verifying functionality
- Integration with the CLI test runner

## Summary

Cypress testing in ElizaOS provides automated frontend testing that integrates seamlessly with the CLI test pipeline. By following these patterns and best practices, you can ensure your plugin UIs work correctly across different environments and agent configurations.

Remember: **Cypress tests run automatically when you run `elizaos test` if Cypress is detected in your project.**

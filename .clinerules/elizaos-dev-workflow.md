---
description: ElizaOS comprehensive development workflow emphasizing research, planning, and thorough testing
globs: **/*
alwaysApply: true
---

> You are an expert developer on the ElizaOS project, following a structured and test-driven development workflow to ensure high-quality contributions.

# ElizaOS Standard Development Workflow

This document outlines the comprehensive process for building, testing, and contributing to the ElizaOS project. Following this workflow ensures consistency, quality, and adherence to architectural principles.

```mermaid
graph TD
    A[1. Research Existing Codebase] --> B[2. Write Detailed PRD];
    B --> C[3. Create Implementation Plan];
    C --> D{Evaluate 3+ Approaches};
    D --> E[Select Optimal Solution];
    E --> F[4. Implement Production Code];
    F --> G[5. Fix Tests Until All Pass];
    G --> H[6. Critical Review];
    H --> I{Code Meets Standards?};
    I -->|No| J[Design New Implementation];
    J --> F;
    I -->|Yes| K[Complete];
```

## Step 1: Research Existing Codebase

Before proposing any changes, thoroughly understand the current system.

- **Codebase Analysis**:

  - Use `grep`, `codebase_search`, and file exploration to understand existing patterns
  - Map out all dependencies and related files
  - Identify existing services, actions, providers, and plugins
  - Study similar implementations already in the codebase
  - Document the current architecture and data flow

- **Pattern Recognition**:
  - How are similar features implemented?
  - What conventions does the project follow?
  - What are the established testing patterns?
  - Which utilities and helpers already exist?

## Step 2: Write Detailed PRD (Product Requirements Document)

Create a comprehensive PRD that goes beyond basic requirements.

### PRD Components:

- **Real-World Scenarios**:

  - Document ALL actual usage paths users will take
  - Include edge cases and error scenarios
  - Provide concrete examples with real data
  - Consider different user personas and their needs

- **UX Review**:

  - How can we make the experience more automated?
  - How can we make it more agentic (self-directed)?
  - How can we make it more passive (requiring less user intervention)?
  - What friction points exist in the current workflow?
  - How can we exceed user expectations?

- **Technical Requirements**:

  - Performance requirements
  - Security considerations
  - Scalability needs
  - Integration points with existing systems

- **Success Criteria**:
  - Measurable outcomes
  - User satisfaction metrics
  - Technical performance benchmarks

## Step 3: Create Detailed Implementation Plan

Design multiple approaches and select the optimal solution.

### Implementation Planning Process:

1. **Design 3+ Different Approaches**:

   - Document each approach comprehensively
   - List ALL files that will be:
     - Added (with complete file paths)
     - Modified (with specific changes)
     - Removed (with justification)
   - Detail what content changes in each file

2. **Evaluate Each Approach**:

   - **Strengths**: What makes this approach good?
   - **Weaknesses**: What are the limitations?
   - **Risks**: What could go wrong?
   - **Complexity**: How difficult to implement and maintain?
   - **Performance**: How will it perform at scale?
   - **User Experience**: How does it affect the end user?

3. **Select Optimal Solution**:
   - Choose the BEST solution, not the average one
   - Document why this approach is superior
   - Accept calculated risks for better outcomes
   - Prioritize long-term maintainability

### Implementation Plan Template:

```markdown
## Approach 1: [Name]

### Files to Add:

- `path/to/new/file.ts` - [Purpose and contents]

### Files to Modify:

- `path/to/existing/file.ts`:
  - Add: [Specific additions]
  - Change: [Specific modifications]
  - Remove: [Specific deletions]

### Files to Remove:

- `path/to/deprecated/file.ts` - [Reason for removal]

### Strengths:

- [List strengths]

### Weaknesses:

- [List weaknesses]

### Risks:

- [List risks and mitigation strategies]
```

## Step 4: Implementation - Production Code Only

Write complete, production-ready code with comprehensive testing.

### Critical Implementation Rules:

- **NO Fake Code**: Never write stubs, examples, or placeholder implementations
- **NO POCs**: Never deliver proof-of-concepts - only finished code
- **NO Demos**: Always write production-ready implementations
- **Complete Implementation**: Write out ALL code, even if complex or lengthy

### Testing Requirements:

- **Unit Tests**: Test individual functions and components in isolation
- **E2E Tests**: Test complete workflows with real runtime
- **Frontend Tests**: Test UI components and user interactions where applicable
- **Integration Tests**: Test interactions between components

### Code Quality Standards:

```typescript
// ✅ DO: Write complete implementations
export async function processTransaction(
  runtime: IAgentRuntime,
  params: TransactionParams
): Promise<TransactionResult> {
  // Full validation logic
  if (!params.amount || params.amount <= 0) {
    throw new Error('Invalid transaction amount');
  }

  // Complete implementation with error handling
  try {
    const service = runtime.getService('transaction-service');
    const result = await service.process(params);

    // Full logging and monitoring
    runtime.logger.info('Transaction processed', {
      transactionId: result.id,
      amount: params.amount,
    });

    return result;
  } catch (error) {
    runtime.logger.error('Transaction failed', { error, params });
    throw new TransactionError('Failed to process transaction', error);
  }
}

// ❌ DON'T: Write stubs or incomplete code
export async function processTransaction(params: any): Promise<any> {
  // TODO: Implement this
  throw new Error('Not implemented');
}
```

## Step 5: Fix Tests Until All Pass

Run comprehensive testing with real-world conditions.

### Testing Philosophy:

- **Real Runtime**: Use live agent runtime, not mocks
- **Real Environment**: Test on mainnet with live API keys
- **Real Data**: Use actual data, not synthetic test data
- **Real Scenarios**: Test actual user workflows

### Testing Process:

1. **Run All Test Suites**:

   ```bash
   # Unit tests
   bun test

   # E2E tests with real runtime
   elizaos test

   # Frontend tests
   bun run test:frontend
   ```

2. **Focus on Meaningful Tests**:

   - ✅ Test that services register correctly
   - ✅ Test that actions execute with real data
   - ✅ Test error handling and edge cases
   - ❌ Don't test trivial getters/setters
   - ❌ Don't test framework functionality

3. **Iterate Until Perfect**:
   - Fix failing tests
   - Add missing test cases
   - Verify edge cases
   - Ensure consistent results

## Step 6: Critical Review and Iteration

Assume the implementation has issues and actively find them.

### Review Process:

1. **Assume It's Wrong**:

   - What assumptions did we make that could be incorrect?
   - What edge cases did we miss?
   - What could break in production?
   - How could users misuse this feature?

2. **Document All Issues**:

   - List every potential problem
   - Identify performance bottlenecks
   - Find security vulnerabilities
   - Note UX friction points

3. **Create Improvement Plan**:

   - Prioritize issues by severity
   - Design solutions for each problem
   - Update implementation plan
   - Revise PRD if necessary

4. **Validation Checklist**:
   - [ ] Does it meet all PRD requirements?
   - [ ] Are all tests comprehensive and passing?
   - [ ] Is the code maintainable?
   - [ ] Is the UX optimal?
   - [ ] Are there any security concerns?
   - [ ] Will it scale appropriately?

## Iteration Loop

After the critical review, loop through these steps until the code is production-ready:

1. **Design New Implementation Plan**: Address all identified issues
2. **Implement All Code and Tests**: Complete production code only
3. **Fix Everything Until Tests Pass**: Real-world testing
4. **Write Another Review**: Assert code correctness or need for revision

### When to Stop Iterating:

- All tests pass consistently (no tests skipped!)
- All features have significant test coverage
- Everything is cleaned up, no dead or useless files, no unnecessary tests
- Code meets or exceeds PRD requirements
- No critical issues in review
- Performance meets benchmarks
- Security review passes
- UX is optimized

### Common Pitfalls:

- **Premature Completion**: Models often think they're done when they aren't
- **Insufficient Testing**: Always err on the side of more testing
- **Ignoring Edge Cases**: Every edge case matters in production
- **Accepting "Good Enough"**: Always strive for optimal, not average

## Summary

This workflow ensures that every contribution to ElizaOS is thoroughly researched, well-planned, properly implemented, and rigorously tested. By following these steps and maintaining high standards throughout, we create robust, user-friendly features that enhance the platform's capabilities while maintaining stability and performance.

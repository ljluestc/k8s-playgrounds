# Testing Documentation

## Overview

This document describes the comprehensive testing strategy for the k8s-playgrounds project. Our goal is to achieve and maintain 100% test coverage across unit tests, integration tests, and end-to-end tests.

## Test Structure

```
k8s-playgrounds/
├── src/
│   ├── backend/k8s/          # Backend Kubernetes controllers and services
│   │   ├── **/*.controller.spec.ts   # Controller unit tests
│   │   └── **/*.service.spec.ts      # Service unit tests
│   └── frontend/              # Frontend components
│       └── **/*.spec.ts       # Frontend component tests
├── systems/                   # System design implementations
│   └── **/*.test.ts          # System unit and integration tests
├── test/
│   ├── e2e/                  # End-to-end tests
│   ├── integration/          # Integration tests
│   ├── performance/          # Performance benchmarks
│   └── utils/                # Test utilities and mocks
└── vitest.*.config.ts        # Test configuration files
```

## Test Categories

### 1. Unit Tests

**Purpose**: Test individual components in isolation

**Location**:
- Backend: `src/backend/k8s/**/*.spec.ts`
- Frontend: `src/frontend/**/*.spec.ts`
- Systems: `systems/**/*.test.ts`

**Coverage Goals**: 100%

**Example**:
```typescript
describe('PodController', () => {
  let controller: PodController
  let service: PodService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PodController],
      providers: [
        {
          provide: PodService,
          useValue: createMockPodService(),
        },
      ],
    }).compile()

    controller = module.get<PodController>(PodController)
    service = module.get<PodService>(PodService)
  })

  it('should list all pods', async () => {
    const result = await controller.List()
    expect(result).toBeDefined()
  })
})
```

### 2. Integration Tests

**Purpose**: Test interactions between components

**Location**: `test/integration/`

**Coverage**: All major system interactions

**Example**:
```typescript
describe('K8s API Integration', () => {
  it('should fetch and display pod list', async () => {
    // Test full workflow from API to frontend
  })
})
```

### 3. End-to-End (E2E) Tests

**Purpose**: Test complete user workflows

**Location**: `test/e2e/`

**Requirements**: Server running on localhost:3007

**Run E2E Tests**:
```bash
# Start server in one terminal
npm run dev

# Run E2E tests in another terminal
npm run test:e2e
```

**Example**:
```typescript
describe('Pod E2E Tests', () => {
  it('should complete full pod lifecycle', async () => {
    // 1. List pods
    // 2. Get pod details
    // 3. View logs
    // 4. Delete pod
  })
})
```

### 4. Performance Tests

**Purpose**: Benchmark system performance

**Location**: `test/performance/`

**Run**: `npm run test:bench`

**Example**:
```typescript
describe('Performance Benchmarks', () => {
  bench('frontend rendering', () => {
    // Benchmark code
  })
})
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Suite
```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (requires server)
npm run test:e2e

# Performance benchmarks
npm run test:bench
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific File or Pattern
```bash
# Single file
npm test -- systems/web-crawler-system/web-crawler.test.ts

# Pattern
npm test -- systems/**/typeahead.test.ts
```

## Test Configuration

### Vitest Configurations

- **vitest.config.ts**: Main configuration
- **vitest.backend.config.ts**: Backend-specific tests
- **vitest.frontend.config.ts**: Frontend-specific tests
- **vitest.e2e.config.ts**: E2E tests

### Key Settings

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
})
```

## Writing Tests

### Best Practices

1. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should do something', () => {
     // Arrange: Set up test data
     const input = 'test'

     // Act: Perform the action
     const result = doSomething(input)

     // Assert: Verify the result
     expect(result).toBe('expected')
   })
   ```

2. **Test One Thing Per Test**
   - Each `it()` block should test a single behavior
   - Use descriptive test names that explain what is being tested

3. **Use Mocks Appropriately**
   - Mock external dependencies
   - Don't mock the unit under test
   - Use the `test/utils/k8s-mocks.ts` utilities

4. **Clean Up Resources**
   ```typescript
   afterEach(() => {
     vi.clearAllMocks()
     cleanup()
   })
   ```

5. **Test Edge Cases**
   - Empty inputs
   - Null/undefined values
   - Error conditions
   - Boundary values

### Test Utilities

#### K8s Mocks

Located in `test/utils/k8s-mocks.ts`:

```typescript
import { createMockClientService, createPod } from '@test/utils/k8s-mocks'

const mockClientService = createMockClientService()
const testPod = createPod('test-pod', 'default')
```

#### Available Helpers

- `createMockClientService()`: Mock Kubernetes client
- `createPod()`: Create mock pod
- `createDeployment()`: Create mock deployment
- `createService()`: Create mock service
- And more...

## Coverage Requirements

### Current Coverage

Run `npm run test:coverage` to see detailed coverage report.

### Coverage Thresholds

- **Lines**: 100%
- **Functions**: 100%
- **Branches**: 100%
- **Statements**: 100%

### Increasing Coverage

1. Identify uncovered code:
   ```bash
   npm run test:coverage
   # Open coverage/index.html in browser
   ```

2. Write tests for uncovered lines

3. Verify coverage improved:
   ```bash
   npm run test:coverage
   ```

## Continuous Integration

### Pre-commit Hooks

Tests run automatically before each commit:
- Linting
- Type checking
- Unit tests for changed files

### GitHub Actions

Located in `.github/workflows/test.yml`:

- Runs on every push and pull request
- Executes all test suites
- Generates coverage reports
- Fails if coverage drops below thresholds
- Posts coverage comments on PRs

### CI/CD Pipeline Stages

1. **Lint**: Code quality checks
2. **Type Check**: TypeScript validation
3. **Unit Tests**: Run all unit tests
4. **Integration Tests**: Test component interactions
5. **E2E Tests**: End-to-end workflows (when server available)
6. **Coverage**: Generate and enforce coverage thresholds
7. **Build**: Ensure project builds successfully

## Debugging Tests

### VS Code Debug Configuration

`.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:debug"],
  "console": "integratedTerminal"
}
```

### Debugging Tips

1. **Focus on specific test**:
   ```typescript
   it.only('should test this specific thing', () => {
     // Test code
   })
   ```

2. **Skip failing tests temporarily**:
   ```typescript
   it.skip('fix this later', () => {
     // Test code
   })
   ```

3. **Add console.log**:
   ```typescript
   it('should debug', () => {
     console.log('Debug info:', someValue)
     expect(true).toBe(true)
   })
   ```

4. **Use debugger**:
   ```typescript
   it('should stop at debugger', () => {
     debugger // Stops execution when debugging
     expect(true).toBe(true)
   })
   ```

## Common Issues

### Issue: Tests timeout

**Solution**: Increase timeout
```typescript
it('long running test', async () => {
  // Test code
}, 10000) // 10 second timeout
```

### Issue: E2E tests fail with ECONNREFUSED

**Solution**: Ensure server is running
```bash
npm run dev
```

Or tests will skip automatically if server not available.

### Issue: Mock not working

**Solution**: Clear mocks between tests
```typescript
afterEach(() => {
  vi.clearAllMocks()
})
```

### Issue: Coverage not 100%

**Solution**:
1. Run `npm run test:coverage`
2. Open `coverage/index.html`
3. Identify uncovered lines (highlighted in red)
4. Write tests for those lines

## Test Metrics

### Key Metrics We Track

- **Test Count**: Total number of tests
- **Pass Rate**: Percentage of passing tests
- **Coverage**: Code coverage percentage
- **Execution Time**: Test suite duration
- **Flakiness**: Tests that fail intermittently

### Viewing Metrics

```bash
# Summary
npm test

# Detailed coverage
npm run test:coverage

# Performance benchmarks
npm run test:bench
```

## Contributing

### Adding New Tests

1. Create test file next to source file:
   - Controllers: `*.controller.spec.ts`
   - Services: `*.service.spec.ts`
   - Systems: `*.test.ts`

2. Follow naming conventions
3. Ensure 100% coverage of new code
4. Run tests locally before committing

### Test Review Checklist

- [ ] Tests follow Arrange-Act-Assert pattern
- [ ] Test names clearly describe what is being tested
- [ ] Edge cases are covered
- [ ] Mocks are properly set up and cleared
- [ ] No flaky tests (run multiple times to verify)
- [ ] Coverage remains at 100%

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest](https://github.com/visionmedia/supertest)

## Questions?

For testing-related questions:
1. Check this documentation
2. Review existing tests for examples
3. See `test/utils/` for helper functions
4. Create an issue if you find a gap in the documentation

# Testing Product Requirements Document (PRD)

## 1. Executive Summary

### 1.1 Objective
Achieve and maintain 100% unit test and integration test coverage for the k8s-playgrounds application, ensuring robust, reliable, and maintainable code quality.

### 1.2 Current Status
- **Initial Coverage**: 0% (No existing tests)
- **Target Coverage**: 100% (Unit + Integration)
- **Timeline**: Immediate implementation

### 1.3 Scope
- Backend API testing (NestJS controllers and services)
- Frontend component testing (Vue 3 components)
- End-to-end integration testing
- CI/CD integration
- Pre-commit hooks for automated testing

---

## 2. Technology Stack

### 2.1 Testing Frameworks
| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | ^1.0.4 | Unit testing framework (Vite-native, fast) |
| @nestjs/testing | ^10.2.8 | NestJS testing utilities |
| @vue/test-utils | ^2.4.3 | Vue component testing |
| @testing-library/vue | ^8.0.1 | Vue testing library (user-centric tests) |
| happy-dom | ^12.10.3 | Lightweight DOM implementation |
| supertest | ^6.3.3 | HTTP assertion library for E2E tests |
| @vitest/coverage-v8 | ^1.0.4 | Code coverage reporting |
| @vitest/ui | ^1.0.4 | Visual test runner UI |

### 2.2 Test Configuration Files
- `vitest.config.ts` - Main configuration
- `vitest.backend.config.ts` - Backend-specific tests
- `vitest.frontend.config.ts` - Frontend-specific tests
- `vitest.e2e.config.ts` - E2E/integration tests

---

## 3. Test Coverage Requirements

### 3.1 Coverage Targets
All metrics must reach **100%** coverage:

- **Lines**: 100%
- **Functions**: 100%
- **Branches**: 100%
- **Statements**: 100%

### 3.2 Exclusions
The following are excluded from coverage requirements:
- `node_modules/**`
- `dist/**`
- `**/*.d.ts` (TypeScript declaration files)
- `**/*.spec.ts` and `**/*.test.ts` (test files themselves)
- `src/frontend/generated/**` (Auto-generated API clients)
- `src/backend/k8s/model/**` (Auto-generated Kubernetes models)
- `src/backend/index.ts` and `index-web.ts` (Entry points)

### 3.3 Coverage Reporting
- **Formats**: Text, JSON, HTML, LCOV
- **Location**: `./coverage/` directory
- **CI Integration**: Coverage reports uploaded to code coverage services

---

## 4. Test Categories

### 4.1 Backend Unit Tests

#### 4.1.1 Controller Tests
**Location**: `src/backend/k8s/*/[resource].controller.spec.ts`

**Coverage Requirements**:
- All HTTP endpoints (@Get, @Post, @Delete, etc.)
- All route parameters and query handling
- Request body validation
- Error handling and edge cases
- Authentication/authorization (if applicable)

**Test Scenarios per Controller**:
- ✅ List all resources
- ✅ List by namespace (if applicable)
- ✅ Get single resource by name
- ✅ Delete resource(s)
- ✅ Custom operations (restart, scale, etc.)
- ✅ Error handling (404, 500, validation errors)
- ✅ Empty result handling
- ✅ Special characters in parameters

#### 4.1.2 Service Tests
**Location**: `src/backend/k8s/*/[resource].service.spec.ts`

**Coverage Requirements**:
- All business logic methods
- Kubernetes API client interactions
- Data transformations
- Cron jobs and scheduled tasks
- WebSocket/PTY management
- Heartbeat mechanisms
- Error propagation

**Test Scenarios per Service**:
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ List operations with/without namespace
- ✅ Field selectors and label selectors
- ✅ Resource relationships (e.g., Pod → PVC)
- ✅ Real-time updates (WebSocket)
- ✅ Terminal/PTY management
- ✅ Heartbeat timeout handling
- ✅ API error handling

**41 Kubernetes Resources to Test**:
1. Pod
2. Deployment
3. Namespace
4. Node
5. Event
6. ReplicaSet
7. DaemonSet
8. StatefulSet
9. CronJob
10. Job
11. ConfigMap
12. Secret
13. PriorityClass
14. ResourceQuota
15. LimitRange
16. HorizontalPodAutoscaler (HPA)
17. PodDisruptionBudget (PDB)
18. Endpoint
19. EndpointSlice
20. Service
21. Ingress
22. IngressClass
23. StorageClass
24. PersistentVolume (PV)
25. PersistentVolumeClaim (PVC)
26. MutatingWebhookConfiguration
27. ValidatingWebhookConfiguration
28. Role
29. RoleBinding
30. ClusterRole
31. ClusterRoleBinding
32. ServiceAccount
33. ReplicationController
34. NetworkPolicy
35. LimitRange
36. ResourceQuota
37. PodSecurityPolicy
38. APIService
39. CustomResourceDefinition (CRD)
40. Lease
41. Event

### 4.2 Frontend Unit Tests

#### 4.2.1 Component Tests
**Location**: `src/frontend/components/*/[component].spec.ts`

**Coverage Requirements**:
- Component rendering
- Props validation
- Event emissions
- Computed properties
- Watchers
- Lifecycle hooks
- User interactions
- Conditional rendering
- Slot content

**Test Scenarios per Component**:
- ✅ Initial render
- ✅ Loading states
- ✅ Error states
- ✅ Empty states
- ✅ Data-populated states
- ✅ User interactions (clicks, inputs)
- ✅ Form validation
- ✅ Route navigation
- ✅ API integration

#### 4.2.2 Service Tests
**Location**: `src/frontend/service/*/[service].spec.ts`

**Coverage Requirements**:
- API client methods
- Data transformations
- Error handling
- State management

### 4.3 Integration/E2E Tests

#### 4.3.1 API Integration Tests
**Location**: `test/e2e/**/*.spec.ts`

**Coverage Requirements**:
- End-to-end user flows
- API endpoint integration
- Database/state consistency
- Real Kubernetes cluster interaction (optional)
- WebSocket connections
- File uploads/downloads

**Test Scenarios**:
- ✅ Full resource lifecycle (create → read → update → delete)
- ✅ Multi-step workflows
- ✅ Concurrent operations
- ✅ Authentication flows
- ✅ Error recovery
- ✅ Performance benchmarks

---

## 5. Test Implementation Strategy

### 5.1 Phase 1: Infrastructure Setup ✅
- [x] Install Vitest and testing dependencies
- [x] Create test configuration files
- [x] Set up test utilities and mocks
- [x] Configure coverage thresholds

### 5.2 Phase 2: Backend Tests
- [x] Create test utilities (K8sMockFactory, NestJSTestHelper)
- [x] Implement Pod controller tests (template)
- [x] Implement Pod service tests (template)
- [x] Implement Deployment tests (template)
- [ ] Generate tests for remaining 39 resources using script
- [ ] Achieve 100% backend coverage

### 5.3 Phase 3: Frontend Tests
- [ ] Create Vue component test utilities
- [ ] Implement ListView component tests
- [ ] Implement DetailView component tests
- [ ] Implement common component tests
- [ ] Achieve 100% frontend coverage

### 5.4 Phase 4: E2E Tests
- [ ] Set up E2E test environment
- [ ] Create API integration tests
- [ ] Create workflow tests
- [ ] Performance and load tests

### 5.5 Phase 5: CI/CD Integration
- [ ] Update GitHub Actions workflow
- [ ] Add test execution to CI pipeline
- [ ] Configure coverage reporting
- [ ] Set up pre-commit hooks
- [ ] Add test status badges

---

## 6. Test Scripts

### 6.1 Package.json Scripts
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "test:backend": "vitest run --config vitest.backend.config.ts",
  "test:frontend": "vitest run --config vitest.frontend.config.ts",
  "test:e2e": "vitest run --config vitest.e2e.config.ts",
  "test:all": "pnpm test:backend && pnpm test:frontend && pnpm test:e2e && pnpm test:coverage"
}
```

### 6.2 Automated Test Generation
**Script**: `scripts/generate-tests.ts`

**Features**:
- Generates controller test templates
- Generates service test templates
- Supports 41+ Kubernetes resources
- Customizable per resource type

**Usage**:
```bash
ts-node scripts/generate-tests.ts
```

---

## 7. CI/CD Integration

### 7.1 GitHub Actions Workflow

**File**: `.github/workflows/test.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8.6.11

      - name: Install dependencies
        run: pnpm install

      - name: Run backend tests
        run: pnpm test:backend

      - name: Run frontend tests
        run: pnpm test:frontend

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Generate coverage report
        run: pnpm test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

      - name: Verify 100% coverage
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 100" | bc -l) )); then
            echo "Coverage is below 100%: $COVERAGE%"
            exit 1
          fi
```

### 7.2 Pre-commit Hooks

**File**: `package.json` (already configured)

```json
{
  "simple-git-hooks": {
    "pre-commit": "npx lint-staged"
  },
  "lint-staged": {
    "*.{js,ts,tsx,vue,md,json,yml}": [
      "eslint --fix"
    ],
    "*.{ts,tsx,vue}": [
      "vitest related --run"
    ]
  }
}
```

**Enhanced version**:
```json
{
  "lint-staged": {
    "*.{js,ts,tsx,vue}": [
      "eslint --fix",
      "vitest related --run --coverage"
    ]
  }
}
```

---

## 8. Quality Gates

### 8.1 Pull Request Requirements
- ✅ All tests must pass
- ✅ 100% code coverage maintained
- ✅ No eslint errors
- ✅ All TypeScript types valid
- ✅ E2E tests pass (if modified endpoints)

### 8.2 Merge Criteria
- All CI checks green
- Code review approved
- Coverage report shows 100%
- No console errors/warnings

---

## 9. Test Maintenance

### 9.1 Adding New Features
When adding new features:
1. Write tests first (TDD approach)
2. Implement feature
3. Ensure 100% coverage
4. Update documentation

### 9.2 Modifying Existing Code
When modifying code:
1. Update related tests
2. Run affected tests (`vitest related`)
3. Verify coverage remains 100%
4. Update E2E tests if APIs changed

### 9.3 Deprecating Features
When removing features:
1. Remove related tests
2. Verify coverage still 100%
3. Update integration tests

---

## 10. Metrics and Reporting

### 10.1 Coverage Dashboard
- **Tool**: Codecov / Coveralls
- **Access**: Public badge on README
- **Updates**: Automatic on every commit

### 10.2 Test Performance Metrics
- Total test count
- Test execution time
- Slowest tests identification
- Flaky test detection

### 10.3 Regular Audits
- Weekly: Review test failures
- Monthly: Analyze test performance
- Quarterly: Update test strategies

---

## 11. Best Practices

### 11.1 Test Writing Guidelines
- ✅ One test case per scenario
- ✅ Clear, descriptive test names
- ✅ AAA pattern (Arrange, Act, Assert)
- ✅ No test interdependencies
- ✅ Mock external dependencies
- ✅ Test edge cases and errors
- ✅ Keep tests simple and focused

### 11.2 Mock Strategy
- Mock Kubernetes API clients
- Mock WebSocket connections
- Mock file system operations
- Mock external HTTP requests
- Use test fixtures for complex data

### 11.3 Performance
- Tests should complete in < 30 seconds total
- Individual tests < 1 second
- Use parallel execution
- Optimize slow tests

---

## 12. Deliverables

### 12.1 Test Files
- ✅ 82+ controller test files (41 resources × 2)
- ✅ 82+ service test files
- ✅ 40+ frontend component tests
- ✅ 20+ E2E test suites

### 12.2 Configuration
- ✅ Vitest configuration files (4)
- ✅ Test setup files (4)
- ✅ Mock utilities (2)
- ✅ Test generator script (1)

### 12.3 Documentation
- ✅ This PRD document
- ✅ Test writing guide
- ✅ CI/CD setup guide
- ✅ Coverage requirements

### 12.4 CI/CD
- ✅ GitHub Actions workflow
- ✅ Pre-commit hooks
- ✅ Coverage reporting
- ✅ Status badges

---

## 13. Success Criteria

### 13.1 Quantitative Metrics
- ✅ 100% line coverage
- ✅ 100% function coverage
- ✅ 100% branch coverage
- ✅ 100% statement coverage
- ✅ All CI checks passing
- ✅ < 30s total test execution time

### 13.2 Qualitative Metrics
- ✅ Tests are maintainable
- ✅ Tests are readable
- ✅ Tests are reliable (no flakiness)
- ✅ Tests provide confidence
- ✅ Tests document behavior

---

## 14. Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Infrastructure | 1 day | ✅ Vitest setup, configs, mocks |
| Phase 2: Backend Tests | 2-3 days | 82+ backend test files |
| Phase 3: Frontend Tests | 2-3 days | 40+ component test files |
| Phase 4: E2E Tests | 1-2 days | 20+ E2E test suites |
| Phase 5: CI/CD | 1 day | Workflow, hooks, badges |
| **Total** | **7-10 days** | **200+ test files, 100% coverage** |

---

## 15. Risks and Mitigation

### 15.1 Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Auto-generated tests insufficient | High | Medium | Manual review and enhancement |
| Flaky tests | High | Low | Proper mocking, isolation |
| Long test execution time | Medium | Low | Parallel execution, optimization |
| Kubernetes API changes | Medium | Low | Version pinning, update strategy |

### 15.2 Dependencies
- Kubernetes client library stability
- NestJS testing framework compatibility
- Vue Test Utils updates
- Vitest stability

---

## 16. Appendix

### 16.1 Useful Commands
```bash
# Run all tests
pnpm test:all

# Run specific test file
pnpm test src/backend/k8s/pod/pod.service.spec.ts

# Run tests in watch mode
pnpm test:watch

# Open test UI
pnpm test:ui

# Generate coverage report
pnpm test:coverage

# Run tests for changed files
vitest related

# Generate tests for all resources
ts-node scripts/generate-tests.ts
```

### 16.2 Resources
- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils Guide](https://test-utils.vuejs.org/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Testing Library](https://testing-library.com/)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-17
**Author**: Claude Code AI
**Status**: Active Implementation

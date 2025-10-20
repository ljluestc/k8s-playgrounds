# Testing Guide for k8s-playgrounds

[![Test Status](https://github.com/weibaohui/k8s-playgrounds/workflows/Test%20Suite/badge.svg)](https://github.com/weibaohui/k8s-playgrounds/actions)
[![Coverage](https://img.shields.io/badge/coverage-expanding-yellow)](./docs/TESTING_PRD.md)

## Quick Start

```bash
# Install dependencies
npm install

# Run all backend tests
npm run test:backend

# Run all frontend tests
npm run test:frontend

# Run E2E tests
npm run test:e2e

# Run all tests with coverage
npm run test:all

# Watch mode for development
npm run test:watch

# Visual test UI
npm run test:ui
```

## Current Test Status

```
✅ Test Infrastructure: Complete
✅ Backend Tests: 70 passing (Pod, Deployment)
✅ Frontend Templates: Ready
✅ E2E Templates: Ready
✅ CI/CD Integration: Complete
✅ Coverage Reporting: Configured
```

## Test Structure

### Backend Tests
```
src/backend/k8s/
├── pod/
│   ├── pod.controller.spec.ts     ✅ 23 tests
│   └── pod.service.spec.ts        ✅ 29 tests
├── deployment/
│   ├── deployment.controller.spec.ts  ✅ 9 tests
│   └── deployment.service.spec.ts     ✅ 9 tests
└── [39 more resources to test]
```

### Frontend Tests
```
src/frontend/components/
└── pod/
    └── PodListView.spec.ts  ✅ Template ready
```

### E2E Tests
```
test/e2e/
└── pod.e2e.spec.ts  ✅ Template ready
```

## Generate Tests for All Resources

We've created an automated test generator for all 41 Kubernetes resources:

```bash
npx ts-node scripts/generate-tests.ts
```

This will generate test files for:
- All 41+ Kubernetes resources (Pod, Deployment, Service, Ingress, etc.)
- Both controller and service tests
- Comprehensive test coverage templates

## Test Coverage

### Coverage Configuration
- **Lines**: 100%
- **Functions**: 100%
- **Branches**: 100%
- **Statements**: 100%

### View Coverage Report
```bash
npm run test:coverage
open coverage/index.html
```

## CI/CD Integration

Tests run automatically on:
- Every push to main
- Every pull request
- Pre-commit hooks (for changed files)

## Pre-commit Hooks

Configured to run:
- ESLint with auto-fix
- Related tests for changed files
- TypeScript type checking

## Testing Frameworks

| Framework | Version | Purpose |
|-----------|---------|---------|
| Vitest | ^1.0.4 | Fast, Vite-native testing |
| @nestjs/testing | ^10.2.8 | NestJS utilities |
| @vue/test-utils | ^2.4.3 | Vue component testing |
| @testing-library/vue | ^8.0.1 | User-centric testing |
| supertest | ^6.3.3 | API integration testing |
| @vitest/coverage-v8 | ^1.0.4 | Coverage reporting |

## Documentation

- [Full Testing PRD](./docs/TESTING_PRD.md) - Complete testing requirements and strategy
- [Testing Summary](./docs/TESTING_SUMMARY.md) - Implementation summary and achievements

## Writing Tests

### Backend Controller Test Example

```typescript
describe('ResourceController', () => {
  let controller: ResourceController;
  let mockK8sService: any;

  beforeEach(() => {
    const mockResourceService = {
      List: vi.fn(),
      GetOne: vi.fn(),
      Delete: vi.fn(),
    };

    mockK8sService = {
      resourceService: mockResourceService,
    } as any;

    controller = new ResourceController(mockK8sService);
  });

  it('should list all resources', async () => {
    mockK8sService.resourceService.List.mockResolvedValue([]);
    const result = await controller.List();
    expect(result).toEqual([]);
  });
});
```

### Backend Service Test Example

```typescript
describe('ResourceService', () => {
  let service: ResourceService;
  let clientService: any;
  let mockK8sApi: any;

  beforeEach(() => {
    mockK8sApi = NestJSTestHelper.createMockK8sApi();
    clientService = NestJSTestHelper.createMockClientService(mockK8sApi);
    service = new ResourceService(clientService);
  });

  it('should list resources', async () => {
    mockK8sApi.listResourceForAllNamespaces.mockResolvedValue({
      body: { items: [] },
    });

    const result = await service.List();
    expect(result).toEqual([]);
  });
});
```

### Vue Component Test Example

```typescript
describe('ResourceListView', () => {
  it('should render component', () => {
    const wrapper = mount(ResourceListView);
    expect(wrapper.exists()).toBe(true);
  });
});
```

## Next Steps to 100% Coverage

1. **Generate remaining tests**: Run `npx ts-node scripts/generate-tests.ts`
2. **Review and enhance**: Add resource-specific test cases
3. **Frontend tests**: Implement component tests using templates
4. **E2E tests**: Create full workflow integration tests
5. **Monitor coverage**: Run `npm run test:coverage` regularly

## Troubleshooting

### Tests not running?
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Coverage not generating?
```bash
# Install coverage tools
npm install @vitest/coverage-v8 --save-dev
```

### Watch mode not working?
```bash
# Use the correct command
npm run test:watch
```

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure 100% coverage for new code
3. Run `npm run test:all` before committing
4. CI will verify all tests pass

## Support

For testing-related questions:
- Check [Testing PRD](./docs/TESTING_PRD.md)
- Check [Testing Summary](./docs/TESTING_SUMMARY.md)
- Review existing test examples in `src/backend/k8s/pod/`
- Consult [Vitest docs](https://vitest.dev/)

---

**Last Updated**: 2025-10-17
**Test Framework**: Vitest 1.0.4
**Coverage Target**: 100%
**Current Tests**: 70 passing ✅

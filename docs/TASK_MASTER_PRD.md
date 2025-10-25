---
title: "K8s Playgrounds - Task Master PRD"
version: 1.0
owner: "Testing/Platform Team"
sprint:
  name: "Comprehensive Testing Implementation"
  start: "2025-10-20"
  end: "2025-11-28"
task_master:
  schema: "v1"
  parse_instructions:
    - "Parse phases[].tasks[] to build the task graph."
    - "A task is runnable when status == 'todo' and all dependencies are 'done'."
    - "Use id as the canonical handle; titles may change."
    - "Prefer assignee if present; otherwise default to team: Testing/Platform."
    - "When commands are provided, run them non-interactively from repo root."
    - "Artifacts should be written to the paths listed under deliverables."
  default_shell: "/usr/bin/bash"
  working_directory: "/home/calelin/dev/k8s-playgrounds"
  reporting:
    summary_file: "test-reports/test_summary.txt"
    junit_report: "test-reports/test_report.xml"
    coverage_html: "coverage/index.html"
    coverage_json: "coverage/coverage-final.json"
---

# Product Requirements Document (PRD)
## Comprehensive Testing, Coverage, and CI/CD Enablement

This PRD defines the executable plan for Task Master to orchestrate the testing and CI/CD work. It mirrors and operationalizes the goals captured in `docs/TASK_MASTER.md` and `docs/TESTING_PRD.md`.

## Goals and Success Criteria
- 100% unit test coverage across backend services and controllers
- 100% integration test coverage for system interactions
- Performance benchmarks established and tracked
- CI/CD pipeline executes tests and reports on every commit
- Zero ESLint and TypeScript errors in main

## Global Deliverables
- `test-reports/` with JUnit, HTML, and JSON summaries
- `coverage/` with v8 provider outputs (text, HTML, JSON)
- GitHub Actions workflow file for CI execution

## Phases

### Phase 1: Infrastructure
status: done
priority: P0
est_hours: 8.5
owner: "Testing/Platform Team"
deliverables:
  - "vitest.config.ts"
  - "test/setup.ts"
  - "test/utils/"
  - "simple-git-hooks + lint-staged configured"
  - "Maven config for Java submodules"
success_criteria:
  - "Test runner configured with v8 coverage provider"
  - "Global setup file executes without errors"
  - "Pre-commit hooks run ESLint and related tests"
tasks:
  - id: INF-001
    title: "Verify Vitest configuration and coverage thresholds"
    status: done
    type: verify
    estimate_h: 1.0
    dependencies: []
    paths:
      - "vitest.config.ts"
    acceptance_criteria:
      - "Coverage thresholds present and >= 100 for statements/branches/functions/lines"
  - id: INF-002
    title: "Confirm lint-staged and simple-git-hooks pre-commit"
    status: done
    type: verify
    estimate_h: 0.5
    dependencies: []
    paths:
      - "package.json"
    acceptance_criteria:
      - "pre-commit runs eslint --fix and vitest related --run"
  - id: INF-003
    title: "Validate backend/e2e/front configs exist"
    status: done
    type: verify
    estimate_h: 0.5
    dependencies: []
    paths:
      - "vitest.backend.config.ts"
      - "vitest.frontend.config.ts"
      - "vitest.e2e.config.ts"
    acceptance_criteria:
      - "All configs present and parseable"
  - id: INF-004
    title: "Maven configuration sanity check"
    status: done
    type: verify
    estimate_h: 1.0
    dependencies: []
    paths:
      - "pom.xml"
    acceptance_criteria:
      - "Surefire/Failsafe/Jacoco plugins configured"
  - id: INF-005
    title: "Create test-reports and coverage placeholders"
    status: done
    type: command
    estimate_h: 0.5
    dependencies: []
    commands:
      - "mkdir -p test-reports coverage"
    acceptance_criteria:
      - "Directories exist with correct permissions"
  - id: INF-006
    title: "Document infra in README_TESTING"
    status: done
    type: verify
    estimate_h: 5.0
    dependencies: []
    paths:
      - "README_TESTING.md"
    acceptance_criteria:
      - "README_TESTING.md has infra instructions"

### Phase 2: Unit Tests
status: in_progress
priority: P0
est_hours: 14
owner: "Testing/Platform Team"
deliverables:
  - "coverage/"
  - "test-reports/"
success_criteria:
  - "All unit tests passing"
  - "Coverage 100% for lines, branches, functions, statements"
tasks:
  - id: UTS-001
    title: "Run backend unit tests with coverage"
    status: todo
    type: command
    estimate_h: 3.5
    assignee: "CI"
    commands:
      - "pnpm test:backend -- --coverage"
    artifacts:
      - "coverage/"
      - "test-reports/"
    acceptance_criteria:
      - "Command exits 0"
      - "coverage/coverage-final.json exists"
  - id: UTS-002
    title: "Ensure 100% coverage across backend services/controllers"
    status: todo
    type: verify
    estimate_h: 3.5
    dependencies:
      - UTS-001
    verifier:
      kind: coverage
      path: "coverage/coverage-final.json"
      thresholds:
        statements: 100
        branches: 100
        functions: 100
        lines: 100
    acceptance_criteria:
      - "All thresholds >= 100"
  - id: UTS-003
    title: "Run frontend unit tests"
    status: todo
    type: command
    estimate_h: 3.0
    dependencies:
      - UTS-001
    commands:
      - "pnpm test:frontend"
    acceptance_criteria:
      - "Command exits 0"
  - id: UTS-004
    title: "Run e2e unit tests subset"
    status: todo
    type: command
    estimate_h: 4.0
    dependencies:
      - UTS-003
    commands:
      - "pnpm test:e2e"
    acceptance_criteria:
      - "Command exits 0"

### Phase 3: Integration Tests
status: todo
priority: P0
est_hours: 6
owner: "Testing/Platform Team"
deliverables:
  - "test/integration/ results"
  - "test-reports/ integration JUnit"
success_criteria:
  - "Integration tests implemented and green"
tasks:
  - id: INT-001
    title: "Run integration tests"
    status: todo
    type: command
    estimate_h: 6.0
    dependencies:
      - UTS-004
    commands:
      - "pnpm test:e2e:coverage && pnpm test:e2e:ui || true"
      - "pnpm test:e2e"
    artifacts:
      - "test-reports/"
    acceptance_criteria:
      - "Command exits 0"

### Phase 4: Performance/Edge
status: todo
priority: P0
est_hours: 8
owner: "Testing/Platform Team"
deliverables:
  - "test/performance/benchmarks results"
success_criteria:
  - "Benchmarks captured and stored under reports"
tasks:
  - id: PERF-001
    title: "Execute performance benchmarks"
    status: todo
    type: command
    estimate_h: 4.0
    dependencies:
      - INT-001
    commands:
      - "pnpm test:performance"
    acceptance_criteria:
      - "Command exits 0"
  - id: PERF-002
    title: "Profile memory and hot paths"
    status: todo
    type: command
    estimate_h: 4.0
    dependencies:
      - PERF-001
    commands:
      - "node --inspect-brk -e 'console.log(\"profile\")' || true"
    acceptance_criteria:
      - "Profile artifacts captured"

### Phase 5: Automation
status: todo
priority: P0
est_hours: 8
owner: "Testing/Platform Team"
deliverables:
  - "scripts/* automation helpers"
success_criteria:
  - "One-command orchestration for local runs"
tasks:
  - id: AUT-001
    title: "Run test orchestrator"
    status: todo
    type: command
    estimate_h: 4.0
    dependencies:
      - PERF-002
    commands:
      - "pnpm test:orchestrate"
    acceptance_criteria:
      - "Command exits 0"
  - id: AUT-002
    title: "Generate/update tests from templates"
    status: todo
    type: command
    estimate_h: 2.0
    dependencies:
      - AUT-001
    commands:
      - "pnpm test:generate"
    acceptance_criteria:
      - "New or updated tests generated"
  - id: AUT-003
    title: "Produce consolidated local test summary"
    status: todo
    type: command
    estimate_h: 2.0
    dependencies:
      - AUT-002
    commands:
      - "node -e \"console.log('summary')\" > test-reports/test_summary.txt"
    acceptance_criteria:
      - "test-reports/test_summary.txt exists"

### Phase 6: CI/CD
status: todo
priority: P0
est_hours: 6
owner: "DevOps Team"
deliverables:
  - ".github/workflows/ci.yml"
  - "badges in README.md"
success_criteria:
  - "CI runs unit, integration, and performance tests on pushes and PRs"
tasks:
  - id: CI-001
    title: "Add GitHub Actions workflow for tests and coverage upload"
    status: todo
    type: file_create
    estimate_h: 4.0
    dependencies:
      - AUT-003
    path: ".github/workflows/ci.yml"
    template: |
      name: CI
      on:
        push:
          branches: [ main ]
        pull_request:
          branches: [ main ]
      jobs:
        test:
          runs-on: ubuntu-latest
          steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                node-version: '20'
            - run: pnpm install --frozen-lockfile
            - run: pnpm test:backend -- --coverage --reporter=junit || true
            - run: pnpm test:integration -- --reporter=junit || true
            - run: pnpm test:performance || true
            - name: Upload coverage artifact
              uses: actions/upload-artifact@v4
              with:
                name: coverage
                path: coverage
            - name: Upload test reports
              uses: actions/upload-artifact@v4
              with:
                name: test-reports
                path: test-reports
    acceptance_criteria:
      - ".github/workflows/ci.yml is created and valid YAML"

  - id: CI-002
    title: "Add coverage and test badges to README"
    status: todo
    type: file_update
    estimate_h: 2.0
    dependencies:
      - CI-001
    paths:
      - "README.md"
    acceptance_criteria:
      - "Badges rendered at top of README"

### Phase 7: Documentation
status: todo
priority: P1
est_hours: 9
owner: "Testing/Platform Team"
deliverables:
  - "docs/TASK_MASTER_PRD.md"
  - "docs/TESTING_PRD.md"
  - "README_TESTING.md updates"
success_criteria:
  - "Docs reflect current automation and CI"
tasks:
  - id: DOC-001
    title: "Finalize Task Master PRD"
    status: todo
    type: verify
    estimate_h: 3.0
    dependencies:
      - CI-002
    paths:
      - "docs/TASK_MASTER_PRD.md"
    acceptance_criteria:
      - "PRD contains 7 phases and 21 tasks"
  - id: DOC-002
    title: "Update Testing PRD cross-references"
    status: todo
    type: verify
    estimate_h: 3.0
    dependencies:
      - DOC-001
    paths:
      - "docs/TESTING_PRD.md"
    acceptance_criteria:
      - "Links and references updated"
  - id: DOC-003
    title: "Polish README_TESTING with runbooks"
    status: todo
    type: verify
    estimate_h: 3.0
    dependencies:
      - DOC-002
    paths:
      - "README_TESTING.md"
    acceptance_criteria:
      - "Runbooks and troubleshooting included"

## Risks and Blockers
- Typeahead system: case sensitivity and debouncing issues
- Web crawler system: content extraction and filtering problems

## Start Here (for Task Master)
1. Queue tasks in this order respecting dependencies: INF-001..INF-006 → UTS-001 → UTS-002 → UTS-003 → UTS-004 → INT-001 → PERF-001 → PERF-002 → AUT-001 → AUT-002 → AUT-003 → CI-001 → CI-002 → DOC-001 → DOC-002 → DOC-003.
2. Execute command-type tasks in a non-interactive shell from the repo root.
3. Persist artifacts to paths listed in each task.
4. Mark tasks as done when acceptance criteria are satisfied.

## References
- `docs/TASK_MASTER.md`
- `docs/TESTING_PRD.md`
- `PRD.md`



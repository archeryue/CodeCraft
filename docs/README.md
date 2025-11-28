# CodeCraft Documentation

This directory contains all project documentation except for the root-level `README.md` and `CLAUDE.md`.

## Quick Links

### Architecture
- **[Pluggable Tools Architecture](PLUGGABLE_TOOLS_ARCHITECTURE.md)** - Core architecture overview
- **[Tools Simplified](TOOLS_SIMPLIFIED.md)** - Philosophy: Simple tools + Smart agent
- **[Tools Optimization Summary](TOOLS_OPTIMIZATION_COMPLETE.md)** - Final implementation summary

### Workflow & Development
- **[Workflow](WORKFLOW.md)** - Agent workflow and execution patterns
- **[Test Plan Template](TEST_PLAN_TEMPLATE.md)** - Template for writing test plans (TDD)

### Testing
- **[E2E Testing Guide](E2E_TESTING_GUIDE.md)** - Comprehensive testing procedures (manual + automated)
- **[Test Results](TEST_RESULTS_FINAL.md)** - Latest test results and statistics

### Evaluation System
- **[Tools Evaluation Implementation Plan](TOOLS_EVALUATION_IMPLEMENTATION_PLAN.md)** - Evaluation framework implementation
- **Test Plans**: `docs/test-plans/` - Individual test plans for evaluation components

### Reference
- **[Bad Cases](BADCASES.md)** - Edge cases and known issues to handle

## Test Commands

```bash
npm test          # Run unit tests (525 tests, excludes E2E)
npm run test:e2e  # Run E2E tests (requires GEMINI_API_KEY)
npm run test:all  # Run both unit and E2E tests
```

## Document Organization

All documentation files must be placed in this directory, with only two exceptions:
- `README.md` - Project overview (stays in repository root)
- `CLAUDE.md` - Instructions for Claude Code (stays in repository root)

## Current Status

**Architecture:** ✅ Pluggable tools architecture complete (17 tools, optimized from 19)
**Test Coverage:** ✅ 525 unit tests passing (100%)
**E2E Tests:** ✅ Separate test infrastructure in `tests/e2e/`
**Evaluation:** ✅ Comprehensive evaluation system (53.7% pass rate)
**Documentation:** ✅ Up to date as of 2025-11-27

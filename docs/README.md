# CodeCraft Documentation

This directory contains all project documentation except for the root-level `README.md` and `CLAUDE.md`.

**Last Updated:** 2025-11-28
**Project Status:** 17 tools, 527 unit tests + 20 E2E tests passing (100%)

---

## Quick Start

- **New to CodeCraft?** Start with [root README.md](../README.md)
- **Contributing code?** Read [CLAUDE.md](../CLAUDE.md) for development rules
- **Running tests?** See [Testing Guide](testing/E2E_TESTING_GUIDE.md)
- **Understanding the architecture?** See [Architecture](#architecture)

---

## Architecture

Core system architecture and design philosophy.

### 📐 [Pluggable Tools Architecture](architecture/PLUGGABLE_TOOLS_ARCHITECTURE.md)
**Status:** ✅ Implemented (17 tools)

Comprehensive overview of the pluggable tools architecture:
- Tool interface design
- Registry and executor pattern
- Context injection and isolation
- Testing infrastructure
- Migration from monolithic system

### 🎯 [Tools Philosophy](architecture/TOOLS_SIMPLIFIED.md)
**Principle:** Simple Tools + Smart Agent = Complex Capabilities

Core design philosophy:
- Why we have 17 tools, not 40+
- Composability over specialization
- Examples of tool orchestration
- Comparison with over-engineered approaches

---

## Development

Guides for developing and contributing to CodeCraft.

### 🔄 [Agent Workflow](development/WORKFLOW.md)
Agent execution patterns and workflows:
- Intent classification
- Task planning
- Execution patterns
- Verification requirements
- Quality standards

### 📋 [Test Plan Template](development/TEST_PLAN_TEMPLATE.md)
Template for writing test plans (TDD methodology):
- Happy path tests
- Edge cases
- Error handling
- Integration tests
- E2E verification steps

### 🐛 [Bad Cases](development/BADCASES.md)
Documented edge cases and known issues:
- BC-001: Empty prompt handling ✅ Fixed
- BC-002: Code search results ✅ Fixed
- BC-003: Project type detection ⚠️ Partially fixed
- BC-004: Tool call loops ✅ Fixed

---

## Testing

Testing infrastructure, guides, and test plans.

### 🎯 [Testing Strategy](testing/TESTING_STRATEGY.md)
**Philosophy:** Test that it works, then measure how well it works

Comprehensive testing strategy and philosophy:
- Unit Tests + E2E: Verify "does it work?" (functional correctness)
- Evaluations: Verify "how well does it work?" (quality/intelligence)
- Decision matrix for choosing test types
- Guidelines for writing each test type
- Current metrics and coverage status

### 🧪 [E2E Testing Guide](testing/E2E_TESTING_GUIDE.md)
Comprehensive end-to-end testing procedures:
- Manual testing scenarios (50+ test cases)
- Automated E2E test infrastructure
- Helper utilities and configuration
- Performance testing
- Debugging guide

### 📊 [E2E Test Coverage Plan](testing/E2E_TEST_COVERAGE_PLAN.md)
**Status:** ✅ 20 tests passing (100%) across 7 files

Current E2E test coverage and roadmap:
- 20/20 tests passing (100% pass rate)
- 12/17 tools covered (71% coverage)
- ~5.2 minutes execution time
- Performance optimizations and lessons learned

### 📝 [Test Plans](testing/test-plans/)
**Active test plans for in-progress features**

Evaluation System (currently at 53.7% tool evals, 65.3% LLM evals):
- `eval-types.test-plan.md` - Type definitions
- `dataset-loader.test-plan.md` - Dataset loading
- `fixture-manager.test-plan.md` - Fixture isolation
- `scorer.test-plan.md` - Result scoring

Completed test plans moved to [archive/](#archive)

---

## Evaluation

Tool evaluation system and results.

### 📊 [Evaluation System Plan](evaluation/TOOLS_EVALUATION_IMPLEMENTATION_PLAN.md)
**Status:** 🚧 Phase 2 Complete (53.7% pass rate)

Comprehensive evaluation framework:
- Phase 1: Core infrastructure ✅ Complete
- Phase 2: Unit tool evaluation ✅ Complete (161/300 passing)
- Phase 3: LLM evaluation 📋 Planned
- Phase 4: Chain & E2E evaluation 📋 Planned
- Phase 5: CLI, reporting, CI 📋 Planned

### 📈 [Evaluation Improvement Summary](evaluation/EVALUATION_IMPROVEMENT_SUMMARY.md)
Results from improving evaluation pass rate:
- Initial: 22.3% → Final: 53.7%
- Key fixes applied
- Results by category
- Known limitations
- Performance metrics

### 🔍 [Failure Analysis](evaluation/FAILURE_ANALYSIS.md)
Detailed analysis of 139 failed tests:
- Path resolution issues (27 failures)
- Background process dependencies (27 failures)
- Validation/edge cases (31 failures)
- Scorer logic issues (15+ failures)
- Priority fix recommendations

---

## Archive

Historical documents and completed work.

### Completed Features & Implementations

**Architecture & Tools:**
- `TOOLS_OPTIMIZATION_HISTORY.md` - Tools optimization (19 → 17 tools)
- `pluggable-tools-architecture.md` - Pluggable tools migration
- `bash-tools.md` - Background process management
- `init-command.md` - /init slash command implementation
- `inspect-symbol.md` - Symbol inspection tool
- `remove-analysis-tools.md` - Tool registry cleanup
- `llm-eval-runner.md` - LLM evaluation infrastructure

**Test Results & Summaries:**
- `TEST_RESULTS_FINAL.md` - Historical test results (references old architecture)
- `IMPLEMENTATION_SUMMARY.md` - Overall implementation summary
- `COMMIT_SUMMARY.md` - Git commit message helper (single-use)

---

## Current Status

**Architecture:** ✅ Pluggable tools complete (17 tools)
**Test Coverage:** ✅ 547 tests passing (100%)
  - Unit Tests: 527 tests
  - E2E Tests: 20 tests (71% tool coverage)
**Evaluation:** 🚧 Tool Evals: 53.7% (161/300) | LLM Evals: 65.3% (47/72)
**Documentation:** ✅ Organized and up-to-date

### Tool Breakdown (17 tools)
- **File Operations (4):** read_file, write_file, edit_file, delete_file
- **Search & Discovery (5):** glob, grep, list_directory, get_codebase_map, search_code
- **AST-Based Tools (4):** inspect_symbol, get_imports_exports, build_dependency_graph, find_references
- **Execution & Process (4):** bash, bash_output, kill_bash, todo_write

**Note:** 3 project analysis tools (detect_project_type, extract_conventions, get_project_overview) exist but are only used by `/init` command, not in LLM registry.

---

## Document Organization Rules

All documentation must be placed in `docs/`, with only two exceptions:
- `README.md` - Project overview (stays in repository root)
- `CLAUDE.md` - Instructions for Claude Code (stays in repository root)

### Directory Structure
```
docs/
├── README.md (this file)
├── architecture/     - System design and architecture
├── development/      - Development guides and workflows
├── testing/          - Testing guides and test plans
├── evaluation/       - Evaluation system and results
└── archive/          - Historical and completed documents
```

---

## Contributing to Documentation

When adding new documentation:
1. Place in appropriate subdirectory
2. Update this README.md index
3. Follow naming convention: lowercase with hyphens
4. Include status and date at top of document
5. Cross-reference related documents

---

**For the most up-to-date project information, see [CLAUDE.md](../CLAUDE.md)**

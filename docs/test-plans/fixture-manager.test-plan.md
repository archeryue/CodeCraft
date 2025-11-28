# Test Plan: Fixture Manager

## Overview
Test the FixtureManager class that creates isolated test environments for evaluation cases. The FixtureManager creates temporary directories with test files and returns isolated ToolContext instances.

## Component Under Test
- `src/eval/fixtures.ts`
  - FixtureManager class
  - Fixture setup and cleanup
  - ToolContext creation

---

## Test Cases

### Category: Inline Fixtures

#### TC-001: Create inline fixture with single file
- **Description:** Create temp directory with one file
- **Setup:** FixtureManager instance
- **Input:** `{ type: 'inline', files: { 'test.txt': 'Hello' } }`
- **Expected Output:**
  - Temp directory created
  - File exists at `{tempDir}/test.txt`
  - File content is 'Hello'
  - Returns ToolContext with cwd = tempDir
- **Verification:** Read file, verify content

#### TC-002: Create inline fixture with multiple files
- **Description:** Create temp directory with multiple files
- **Setup:** FixtureManager instance
- **Input:** `{ type: 'inline', files: { 'a.txt': 'A', 'b.txt': 'B', 'dir/c.txt': 'C' } }`
- **Expected Output:**
  - All files created
  - Nested directory created
  - All content correct
- **Verification:** Read all files, verify structure

#### TC-003: Create inline fixture with directories
- **Description:** Create empty directories
- **Setup:** FixtureManager instance
- **Input:** `{ type: 'inline', files: {}, directories: ['src', 'tests'] }`
- **Expected Output:**
  - Directories created
  - Directories are empty
- **Verification:** Check directory existence with fs.existsSync

#### TC-004: Inline fixture with binary content
- **Description:** Support base64-encoded binary files
- **Setup:** FixtureManager instance
- **Input:** `{ type: 'inline', files: { 'image.png': { content: 'base64data', encoding: 'base64' } } }`
- **Expected Output:**
  - File created with binary content
  - Content properly decoded
- **Verification:** Read file as buffer, verify content

#### TC-005: Inline fixture with file modes
- **Description:** Set Unix file permissions
- **Setup:** FixtureManager instance
- **Input:** `{ type: 'inline', files: { 'script.sh': { content: '#!/bin/bash', mode: 0o755 } } }`
- **Expected Output:**
  - File created with executable permission
- **Verification:** Check file mode with fs.statSync

### Category: Directory Fixtures

#### TC-006: Copy directory fixture
- **Description:** Copy entire directory as fixture
- **Setup:**
  - Create source directory with files
  - FixtureManager instance
- **Input:** `{ type: 'directory', sourcePath: './test-fixtures/example' }`
- **Expected Output:**
  - All files copied to temp directory
  - Directory structure preserved
- **Verification:** Compare file trees

#### TC-007: Directory fixture with include patterns
- **Description:** Copy only matching files
- **Setup:** Source directory with mixed file types
- **Input:** `{ type: 'directory', sourcePath: './test-fixtures', include: ['*.ts', '*.json'] }`
- **Expected Output:**
  - Only .ts and .json files copied
  - Other files excluded
- **Verification:** List files in temp directory

#### TC-008: Directory fixture with exclude patterns
- **Description:** Copy all except matching files
- **Setup:** Source directory with mixed file types
- **Input:** `{ type: 'directory', sourcePath: './test-fixtures', exclude: ['node_modules/**', '*.log'] }`
- **Expected Output:**
  - node_modules excluded
  - .log files excluded
  - Other files included
- **Verification:** Verify excluded files not present

#### TC-009: Directory fixture with non-existent source
- **Description:** Handle missing source directory gracefully
- **Setup:** FixtureManager instance
- **Input:** `{ type: 'directory', sourcePath: './does-not-exist' }`
- **Expected Output:** Error thrown with clear message
- **Verification:** Catch error, check error message

### Category: Preset Fixtures

#### TC-010: Load preset fixture by name
- **Description:** Use pre-built fixture from fixtures directory
- **Setup:**
  - Create preset in `evals/fixtures/simple-project/`
  - FixtureManager instance
- **Input:** `{ type: 'preset', name: 'simple-project' }`
- **Expected Output:**
  - Preset copied to temp directory
  - All files present
- **Verification:** Verify expected files exist

#### TC-011: Preset fixture with overrides
- **Description:** Override specific files in preset
- **Setup:** Preset fixture exists
- **Input:** `{ type: 'preset', name: 'simple-project', overrides: { 'package.json': '{"name":"test"}' } }`
- **Expected Output:**
  - Preset copied
  - package.json contains override content
- **Verification:** Read package.json, verify override

#### TC-012: Non-existent preset
- **Description:** Handle missing preset gracefully
- **Setup:** FixtureManager instance
- **Input:** `{ type: 'preset', name: 'does-not-exist' }`
- **Expected Output:** Error thrown with available presets listed
- **Verification:** Catch error, check error message

### Category: ToolContext Creation

#### TC-013: ToolContext has correct cwd
- **Description:** Context points to temp directory
- **Setup:** Create inline fixture
- **Input:** Any fixture spec
- **Expected Output:** context.cwd === temp directory path
- **Verification:** Check context.cwd value

#### TC-014: ToolContext fs uses real filesystem
- **Description:** Context fs operations work on temp directory
- **Setup:** Create inline fixture
- **Input:** Fixture with file
- **Expected Output:**
  - context.fs.readFileSync works
  - context.fs.writeFileSync works
  - Operations scoped to temp directory
- **Verification:** Read/write using context.fs

#### TC-015: ToolContext includes rustEngine if available
- **Description:** Pass through rust engine reference
- **Setup:** Create fixture with rust engine available
- **Input:** Any fixture spec
- **Expected Output:** context.rustEngine is defined
- **Verification:** Check context.rustEngine exists

#### TC-016: ToolContext logger is provided
- **Description:** Context includes logger for debugging
- **Setup:** Create fixture
- **Input:** Any fixture spec
- **Expected Output:** context.logger is defined
- **Verification:** Call context.logger.info()

### Category: Fixture Cleanup

#### TC-017: Cleanup removes temp directory
- **Description:** Cleanup function removes all created files
- **Setup:** Create fixture
- **Input:** Call cleanup function
- **Expected Output:**
  - Temp directory removed
  - All files deleted
- **Verification:** Check directory no longer exists

#### TC-018: Cleanup works even if files were modified
- **Description:** Cleanup handles modified fixtures
- **Setup:**
  - Create fixture
  - Modify files using context.fs
- **Input:** Call cleanup function
- **Expected Output:** Directory still removed successfully
- **Verification:** Check directory removed

#### TC-019: Cleanup handles already-deleted directories
- **Description:** Gracefully handle manual deletion
- **Setup:**
  - Create fixture
  - Manually delete temp directory
- **Input:** Call cleanup function
- **Expected Output:** No error thrown
- **Verification:** cleanup() completes without error

#### TC-020: cleanupAll removes all fixtures
- **Description:** Cleanup multiple fixtures at once
- **Setup:** Create 3 fixtures
- **Input:** Call cleanupAll()
- **Expected Output:** All temp directories removed
- **Verification:** Check all directories gone

### Category: Isolation

#### TC-021: Multiple fixtures don't interfere
- **Description:** Each fixture gets unique temp directory
- **Setup:** Create 2 fixtures in parallel
- **Input:** Two different fixture specs
- **Expected Output:**
  - Different temp directories
  - Files don't overlap
- **Verification:** Check different cwd values

#### TC-022: Fixture modifications don't affect source
- **Description:** Directory fixtures don't modify source
- **Setup:** Create directory fixture
- **Input:** Modify files via context.fs
- **Expected Output:** Source directory unchanged
- **Verification:** Check source files unchanged

#### TC-023: Fixtures are isolated from cwd
- **Description:** Fixture doesn't access outside temp directory
- **Setup:** Create fixture
- **Input:** Try to access files outside temp dir
- **Expected Output:** File operations scoped to fixture
- **Verification:** Verify path resolution

### Category: Error Handling

#### TC-024: Handle file write errors
- **Description:** Graceful error when file creation fails
- **Setup:** Mock fs.writeFileSync to throw
- **Input:** Inline fixture
- **Expected Output:** Error thrown, partial cleanup
- **Verification:** Check error handling

#### TC-025: Handle permission errors
- **Description:** Clear error on permission denied
- **Setup:** Try to create fixture in read-only location
- **Input:** Fixture spec
- **Expected Output:** Permission error with clear message
- **Verification:** Check error message

#### TC-026: Handle invalid fixture spec
- **Description:** Validate fixture spec before processing
- **Setup:** FixtureManager instance
- **Input:** Invalid fixture spec (wrong type)
- **Expected Output:** Validation error
- **Verification:** Check error is thrown

### Category: Performance

#### TC-027: Large fixture creation is reasonable
- **Description:** Creating 100+ files doesn't take too long
- **Setup:** FixtureManager instance
- **Input:** Inline fixture with 100 files
- **Expected Output:** Completes in < 1 second
- **Verification:** Measure execution time

#### TC-028: Cleanup is fast
- **Description:** Cleanup doesn't block for too long
- **Setup:** Create fixture with many files
- **Input:** Call cleanup
- **Expected Output:** Completes in < 500ms
- **Verification:** Measure cleanup time

### Category: Integration

#### TC-029: Context works with actual tools
- **Description:** ToolContext from fixture works with real tools
- **Setup:**
  - Create fixture
  - Get actual tool (e.g., read_file)
- **Input:** Execute tool with fixture context
- **Expected Output:** Tool executes successfully
- **Verification:** Tool returns expected result

#### TC-030: Fixture with Rust engine integration
- **Description:** Rust engine tools work with fixture context
- **Setup:**
  - Create TypeScript project fixture
  - Get search_code tool
- **Input:** Execute search_code on fixture
- **Expected Output:** Search works on fixture files
- **Verification:** Search returns results from fixture

---

## E2E Verification Steps

### Manual Testing

1. **Create simple inline fixture**
   ```bash
   npx tsx -e "
   import { FixtureManager } from './src/eval/fixtures';
   const fm = new FixtureManager();
   const { context, cleanup } = await fm.setup({
     type: 'inline',
     files: { 'test.txt': 'Hello, World!' }
   });
   console.log('Created at:', context.cwd);
   const content = context.fs.readFileSync('test.txt', 'utf-8');
   console.log('Content:', content);
   await cleanup();
   console.log('Cleaned up');
   "
   ```

2. **Verify isolation**
   ```bash
   # Create two fixtures, verify different directories
   npx tsx -e "
   import { FixtureManager } from './src/eval/fixtures';
   const fm = new FixtureManager();
   const f1 = await fm.setup({ type: 'inline', files: { 'a.txt': 'A' } });
   const f2 = await fm.setup({ type: 'inline', files: { 'b.txt': 'B' } });
   console.log('Dir 1:', f1.context.cwd);
   console.log('Dir 2:', f2.context.cwd);
   console.log('Different?', f1.context.cwd !== f2.context.cwd);
   await f1.cleanup();
   await f2.cleanup();
   "
   ```

3. **Test with real tool**
   ```bash
   npx tsx -e "
   import { FixtureManager } from './src/eval/fixtures';
   import { readFileTool } from './src/tools/read_file';
   const fm = new FixtureManager();
   const { context, cleanup } = await fm.setup({
     type: 'inline',
     files: { 'test.txt': 'Hello from fixture!' }
   });
   const result = await readFileTool.execute({ path: 'test.txt' }, context);
   console.log('Tool result:', result);
   await cleanup();
   "
   ```

---

## Success Criteria

- [ ] All fixture types implemented (inline, directory, preset)
- [ ] ToolContext creation working correctly
- [ ] Cleanup removes all temp directories
- [ ] Fixtures are isolated from each other
- [ ] Error handling is robust
- [ ] Works with real tools
- [ ] Performance is acceptable
- [ ] All tests pass
- [ ] Test coverage > 90%

---

## Notes

- Use `os.tmpdir()` for temp directory location
- Generate unique directory names (e.g., `eval-{timestamp}-{random}`)
- Consider using `fs-extra` for easier directory operations
- Ensure cleanup happens even on errors (try/finally)
- Log fixture creation for debugging
- Track all created temp dirs for cleanupAll()

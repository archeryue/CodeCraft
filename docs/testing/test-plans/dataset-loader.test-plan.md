# Test Plan: Dataset Loader

## Overview
Test the DatasetLoader class that loads evaluation cases from JSON files and directories. The loader validates dataset structure and provides filtering capabilities.

## Component Under Test
- `src/eval/dataset-loader.ts`
  - DatasetLoader class
  - Dataset validation
  - Filtering and loading

---

## Test Cases

### Category: Single File Loading

#### TC-001: Load valid dataset file
- **Description:** Load well-formed dataset JSON
- **Setup:** Create test dataset file
- **Input:** Path to valid dataset JSON
- **Expected Output:**
  - Array of EvalCase objects
  - All fields populated correctly
  - Matches dataset content
- **Verification:** Check returned array length and content

#### TC-002: Load dataset with all field types
- **Description:** Ensure all EvalCase fields are parsed
- **Setup:** Dataset with all possible fields
- **Input:** Path to comprehensive dataset
- **Expected Output:**
  - id, description, tool, category, tags, difficulty all present
  - input object parsed correctly
  - expected object parsed correctly
  - fixtures parsed if present
  - metadata parsed if present
- **Verification:** Check each field on returned cases

#### TC-003: Load empty dataset
- **Description:** Handle dataset with no cases
- **Setup:** Dataset file with empty cases array
- **Input:** `{ "tool": "test", "cases": [] }`
- **Expected Output:** Empty array returned
- **Verification:** Array.length === 0

#### TC-004: Load dataset with single case
- **Description:** Minimum valid dataset
- **Setup:** Dataset with one case
- **Input:** Dataset with 1 case
- **Expected Output:** Array with 1 EvalCase
- **Verification:** Array.length === 1

### Category: File System Operations

#### TC-005: Handle non-existent file
- **Description:** Clear error when file doesn't exist
- **Setup:** No file at path
- **Input:** './datasets/does-not-exist.json'
- **Expected Output:** Error thrown with message "File not found"
- **Verification:** Catch error, check message

#### TC-006: Handle invalid JSON
- **Description:** Parse error for malformed JSON
- **Setup:** File with invalid JSON syntax
- **Input:** File containing `{ invalid json }`
- **Expected Output:** Error thrown with parse error
- **Verification:** Catch error, check it's a JSON parse error

#### TC-007: Handle empty file
- **Description:** Error on empty file
- **Setup:** Empty file
- **Input:** Path to empty file
- **Expected Output:** Error with clear message
- **Verification:** Check error message

#### TC-008: Handle permission denied
- **Description:** Clear error on unreadable file
- **Setup:** File with no read permissions
- **Input:** Path to unreadable file
- **Expected Output:** Permission error
- **Verification:** Check error type

### Category: Dataset Validation

#### TC-009: Validate required fields in dataset
- **Description:** Dataset must have tool, version, cases
- **Setup:** Dataset missing required field
- **Input:** `{ "cases": [] }` (missing tool)
- **Expected Output:** Validation error listing missing fields
- **Verification:** Check validation.valid === false, check errors array

#### TC-010: Validate case structure
- **Description:** Each case must have required fields
- **Setup:** Case missing required field
- **Input:** Case without 'id' field
- **Expected Output:** Validation error for specific case
- **Verification:** Error mentions case index and missing field

#### TC-011: Validate category enum
- **Description:** Category must be valid enum value
- **Setup:** Case with invalid category
- **Input:** Case with category: 'invalid_category'
- **Expected Output:** Validation error
- **Verification:** Error mentions valid categories

#### TC-012: Validate difficulty range
- **Description:** Difficulty must be 1-5
- **Setup:** Case with difficulty: 10
- **Input:** Case with out-of-range difficulty
- **Expected Output:** Validation error
- **Verification:** Error mentions valid range

#### TC-013: Validate input structure
- **Description:** Input must have at least params, query, or chain
- **Setup:** Case with empty input: {}
- **Input:** Case with no input variant
- **Expected Output:** Validation error
- **Verification:** Error explains input requirements

#### TC-014: Validate expected structure
- **Description:** Expected must have at least one matcher
- **Setup:** Case with empty expected: {}
- **Input:** Case with no expectation
- **Expected Output:** Validation error
- **Verification:** Error lists valid matchers

#### TC-015: Accept valid dataset
- **Description:** Well-formed dataset passes validation
- **Setup:** Perfect dataset
- **Input:** Valid dataset with all required fields
- **Expected Output:** validation.valid === true, no errors
- **Verification:** Check validation result

### Category: Directory Loading

#### TC-016: Load all datasets from directory
- **Description:** Find and load all JSON files
- **Setup:** Directory with 3 dataset files
- **Input:** Path to directory
- **Expected Output:**
  - All 3 datasets loaded
  - Cases combined into single array
- **Verification:** Check total case count

#### TC-017: Handle nested directories
- **Description:** Recursively find dataset files
- **Setup:** Nested directory structure with datasets
- **Input:** Root directory path
- **Expected Output:** All nested datasets loaded
- **Verification:** Check files from all levels loaded

#### TC-018: Ignore non-JSON files
- **Description:** Skip .txt, .md, etc.
- **Setup:** Directory with mixed file types
- **Input:** Directory path
- **Expected Output:** Only .json files loaded
- **Verification:** Verify only JSON datasets returned

#### TC-019: Handle empty directory
- **Description:** No error on empty directory
- **Setup:** Empty directory
- **Input:** Path to empty dir
- **Expected Output:** Empty array
- **Verification:** Array.length === 0

#### TC-020: Handle directory with no datasets
- **Description:** Directory exists but has no JSON files
- **Setup:** Directory with only .txt files
- **Input:** Directory path
- **Expected Output:** Empty array or warning
- **Verification:** Check result

#### TC-021: Handle non-existent directory
- **Description:** Clear error when directory doesn't exist
- **Setup:** No directory at path
- **Input:** './does-not-exist'
- **Expected Output:** Error with clear message
- **Verification:** Check error message

### Category: Filtering

#### TC-022: Filter by tool name
- **Description:** Load only cases for specific tool
- **Setup:** Datasets for multiple tools
- **Input:** `loadAll('.', { tool: 'read_file' })`
- **Expected Output:** Only read_file cases returned
- **Verification:** Check all cases have tool === 'read_file'

#### TC-023: Filter by category
- **Description:** Load only specific category
- **Setup:** Datasets with mixed categories
- **Input:** `loadAll('.', { category: 'happy_path' })`
- **Expected Output:** Only happy_path cases
- **Verification:** Check all cases have category === 'happy_path'

#### TC-024: Filter by tags
- **Description:** Load cases with specific tags
- **Setup:** Datasets with various tags
- **Input:** `loadAll('.', { tags: ['read', 'file'] })`
- **Expected Output:** Cases with any of the specified tags
- **Verification:** Check tag membership

#### TC-025: Filter by difficulty
- **Description:** Load cases within difficulty range
- **Setup:** Datasets with various difficulties
- **Input:** `loadAll('.', { minDifficulty: 2, maxDifficulty: 4 })`
- **Expected Output:** Only cases with difficulty 2-4
- **Verification:** Check difficulty range

#### TC-026: Combine multiple filters
- **Description:** Apply multiple filters together
- **Setup:** Large dataset collection
- **Input:** `loadAll('.', { tool: 'grep', category: 'happy_path', tags: ['regex'] })`
- **Expected Output:** Cases matching all filters
- **Verification:** Verify all filter conditions met

#### TC-027: Filter returns empty result
- **Description:** No error when filter matches nothing
- **Setup:** Datasets loaded
- **Input:** Filter that matches no cases
- **Expected Output:** Empty array
- **Verification:** Array.length === 0

### Category: Dataset Metadata

#### TC-028: Preserve dataset metadata
- **Description:** Include tool, version, description in metadata
- **Setup:** Dataset with metadata fields
- **Input:** Load dataset
- **Expected Output:** Metadata accessible on cases
- **Verification:** Check metadata fields

#### TC-029: Handle missing optional metadata
- **Description:** Gracefully handle missing version, description
- **Setup:** Dataset without optional fields
- **Input:** Minimal dataset
- **Expected Output:** Cases loaded, metadata undefined
- **Verification:** Check fields are undefined, not erroring

### Category: Error Recovery

#### TC-030: Skip invalid files in directory load
- **Description:** Continue loading even if one file is invalid
- **Setup:** Directory with 2 valid, 1 invalid dataset
- **Input:** Directory path
- **Expected Output:**
  - 2 valid datasets loaded
  - Warning/error for invalid file
  - Process continues
- **Verification:** Check 2 datasets loaded, error logged

#### TC-031: Collect all validation errors
- **Description:** Report all issues, not just first
- **Setup:** Dataset with multiple validation errors
- **Input:** Invalid dataset
- **Expected Output:** All errors in errors array
- **Verification:** Check errors.length > 1

### Category: Performance

#### TC-032: Load large dataset efficiently
- **Description:** 1000+ cases load quickly
- **Setup:** Dataset with 1000 cases
- **Input:** Path to large dataset
- **Expected Output:** Loads in < 1 second
- **Verification:** Measure load time

#### TC-033: Load many files efficiently
- **Description:** 50+ files load quickly
- **Setup:** Directory with 50 dataset files
- **Input:** Directory path
- **Expected Output:** Loads in < 2 seconds
- **Verification:** Measure total load time

### Category: Integration

#### TC-034: Loaded cases work with EvalRunner
- **Description:** Cases are compatible with runner
- **Setup:** Load dataset, create runner
- **Input:** Loaded cases
- **Expected Output:** Runner accepts and processes cases
- **Verification:** Runner.runCases succeeds

#### TC-035: Loaded fixtures work with FixtureManager
- **Description:** Fixture specs from datasets are valid
- **Setup:** Load dataset with fixtures
- **Input:** Case with fixture
- **Expected Output:** FixtureManager can setup fixture
- **Verification:** Setup fixture from loaded case

---

## E2E Verification Steps

### Manual Testing

1. **Load single dataset**
   ```bash
   npx tsx -e "
   import { DatasetLoader } from './src/eval/dataset-loader';
   const loader = new DatasetLoader();
   const cases = await loader.loadDataset('./evals/datasets/read_file/happy-path.json');
   console.log('Loaded cases:', cases.length);
   console.log('First case:', cases[0]);
   "
   ```

2. **Validate dataset**
   ```bash
   npx tsx -e "
   import { DatasetLoader } from './src/eval/dataset-loader';
   import * as fs from 'fs';
   const loader = new DatasetLoader();
   const data = JSON.parse(fs.readFileSync('./evals/datasets/read_file/happy-path.json', 'utf-8'));
   const validation = loader.validate(data);
   console.log('Valid:', validation.valid);
   if (!validation.valid) {
     console.log('Errors:', validation.errors);
   }
   "
   ```

3. **Load directory with filtering**
   ```bash
   npx tsx -e "
   import { DatasetLoader } from './src/eval/dataset-loader';
   const loader = new DatasetLoader();
   const allCases = await loader.loadAll('./evals/datasets');
   console.log('Total cases:', allCases.length);

   const readCases = await loader.loadAll('./evals/datasets', { tool: 'read_file' });
   console.log('Read file cases:', readCases.length);

   const happyPath = await loader.loadAll('./evals/datasets', { category: 'happy_path' });
   console.log('Happy path cases:', happyPath.length);
   "
   ```

4. **Test error handling**
   ```bash
   npx tsx -e "
   import { DatasetLoader } from './src/eval/dataset-loader';
   const loader = new DatasetLoader();
   try {
     await loader.loadDataset('./does-not-exist.json');
   } catch (err) {
     console.log('Expected error:', err.message);
   }
   "
   ```

---

## Success Criteria

- [ ] Load single dataset files correctly
- [ ] Load all datasets from directory recursively
- [ ] Validate dataset structure thoroughly
- [ ] Filter cases by tool, category, tags, difficulty
- [ ] Handle errors gracefully (file not found, invalid JSON, validation errors)
- [ ] Skip invalid files when loading directories
- [ ] Performance is acceptable for large datasets
- [ ] All tests pass
- [ ] Test coverage > 90%
- [ ] Integration with FixtureManager and EvalRunner works

---

## Notes

- Use JSON Schema for validation (consider ajv library)
- Support both absolute and relative paths
- Cache loaded datasets to avoid re-reading
- Consider streaming for very large datasets
- Log warnings for skipped invalid files
- Provide helpful error messages with file paths and line numbers

# Test Plan Template

Copy this template to `TEST_PLANS.md` when creating a new feature.

---

## Feature: [Feature Name]

**Purpose:** [One sentence describing what this feature does]

**Related Issue/Task:** [Link or reference if applicable]

---

### Test Plan (Written BEFORE Implementation)

#### Happy Path Tests
These test the main functionality when everything works correctly.

1. [ ] **Test Case 1:** [Description]
   - **Input:** [What data/params]
   - **Expected:** [What should happen]

2. [ ] **Test Case 2:** [Description]
   - **Input:** [What data/params]
   - **Expected:** [What should happen]

#### Edge Cases
These test boundary conditions and unusual inputs.

3. [ ] **Test Case 3:** [Description]
   - **Input:** [What data/params]
   - **Expected:** [What should happen]

4. [ ] **Test Case 4:** [Description]
   - **Input:** [What data/params]
   - **Expected:** [What should happen]

#### Error Handling
These test what happens when things go wrong.

5. [ ] **Test Case 5:** [Description]
   - **Input:** [What data/params]
   - **Expected:** [What error/message]

6. [ ] **Test Case 6:** [Description]
   - **Input:** [What data/params]
   - **Expected:** [What error/message]

#### Integration Tests
These test how the feature works with other parts of the system.

7. [ ] **Test Case 7:** [Description]
   - **Setup:** [What needs to be set up]
   - **Expected:** [What should happen across components]

8. [ ] **Test Case 8:** [Description]
   - **Setup:** [What needs to be set up]
   - **Expected:** [What should happen across components]

#### End-to-End Tests
These test real-world usage scenarios.

9. [ ] **E2E Test 1:** [User scenario]
   - **User Action:** [What user does]
   - **Expected Result:** [What user sees]
   - **Verification:** [How to verify it worked]

10. [ ] **E2E Test 2:** [User scenario]
    - **User Action:** [What user does]
    - **Expected Result:** [What user sees]
    - **Verification:** [How to verify it worked]

---

### Implementation Checklist

#### Phase 1: Plan (BEFORE coding)
- [ ] Test plan written and reviewed
- [ ] All test cases documented above
- [ ] Edge cases identified
- [ ] Error scenarios planned

#### Phase 2: Red (Write failing tests)
- [ ] All unit tests written in `tests/[feature].test.ts`
- [ ] Run `npm test` - verify tests FAIL
- [ ] Tests are clear and well-named

#### Phase 3: Green (Make tests pass)
- [ ] Feature implemented in `src/[file].ts`
- [ ] Run `npm test` - verify tests PASS
- [ ] Minimal code to pass tests (no over-engineering)

#### Phase 4: Refactor (Clean up)
- [ ] Code reviewed for clarity
- [ ] Removed duplication
- [ ] Run `npm test` - still passes

#### Phase 5: Verify (E2E testing)
- [ ] Manual testing with `npx tsx index.ts`
- [ ] All E2E scenarios tested
- [ ] No crashes or errors
- [ ] Responses are helpful

#### Phase 6: Document
- [ ] Update `TEST_PLANS.md` with implementation status
- [ ] Update `CLAUDE.md` if architecture changed
- [ ] Update `TESTING.md` if testing process changed
- [ ] Mark all checkboxes ✅

---

### Implementation Status

**Status:** [Not Started | In Progress | Testing | Complete]

**Test Results:**
- Unit Tests: X/Y passing
- Integration Tests: X/Y passing
- E2E Tests: X/Y verified

**Known Issues:**
- [List any known issues or technical debt]

---

### Files

**Tests:**
- `tests/[feature].test.ts` - Unit tests

**Implementation:**
- `src/[file].ts:[lines]` - Main implementation
- `src/[file].ts:[lines]` - Supporting code

**Documentation:**
- `CLAUDE.md:[section]` - Architecture notes
- `TESTING.md:[section]` - Testing instructions

---

### Example Usage

```typescript
// Example of how to use this feature
import { feature } from './src/feature.js';

const result = feature(input);
console.log(result); // Expected output
```

---

### Testing Examples

**Manual E2E Test:**
```bash
npx tsx index.ts
> [User query that triggers this feature]
# Expected: [What should happen]
```

**Unit Test:**
```bash
npm test [feature].test.ts
# Should see: X tests passing
```

---

### Notes

- [Any important notes about implementation]
- [Known limitations]
- [Future improvements]
- [Dependencies or prerequisites]

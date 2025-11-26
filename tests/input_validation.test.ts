import { describe, it, expect } from 'vitest';

/**
 * Validates user input before sending to agent.
 * Returns null if valid, error message if invalid.
 */
export function validateInput(input: string): string | null {
  if (!input.trim()) {
    return 'Please enter a query.';
  }
  return null;
}

describe('Input Validation', () => {
  describe('Happy Path Tests', () => {
    it('should accept non-empty user input', () => {
      const result = validateInput('hello');
      expect(result).toBeNull(); // null means valid
    });

    it('should accept input with leading/trailing spaces', () => {
      const result = validateInput('  hello  ');
      expect(result).toBeNull();
    });

    it('should accept slash commands', () => {
      const result = validateInput('/help');
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should reject empty string', () => {
      const result = validateInput('');
      expect(result).toBe('Please enter a query.');
    });

    it('should reject whitespace-only input', () => {
      const result = validateInput('   ');
      expect(result).toBe('Please enter a query.');
    });

    it('should reject tabs-only input', () => {
      const result = validateInput('\t\t');
      expect(result).toBe('Please enter a query.');
    });

    it('should reject newline-only input', () => {
      const result = validateInput('\n');
      expect(result).toBe('Please enter a query.');
    });

    it('should reject mixed whitespace input', () => {
      const result = validateInput('  \t\n  ');
      expect(result).toBe('Please enter a query.');
    });
  });

  describe('Error Handling', () => {
    it('should show helpful error message', () => {
      const result = validateInput('');
      expect(result).toBe('Please enter a query.');
    });

    it('should return same error for all whitespace types', () => {
      const emptyResult = validateInput('');
      const spaceResult = validateInput('   ');
      const tabResult = validateInput('\t');
      const newlineResult = validateInput('\n');

      expect(emptyResult).toBe(spaceResult);
      expect(spaceResult).toBe(tabResult);
      expect(tabResult).toBe(newlineResult);
    });
  });

  describe('Integration Behavior', () => {
    it('should allow valid input to proceed', () => {
      const validInputs = [
        'hello',
        'show me package.json',
        '/help',
        'what files are in src?',
        'a', // even single character is valid
      ];

      validInputs.forEach(input => {
        const result = validateInput(input);
        expect(result).toBeNull();
      });
    });

    it('should block all forms of empty input', () => {
      const invalidInputs = [
        '',
        ' ',
        '  ',
        '\t',
        '\n',
        '\r\n',
        '  \t  ',
        '\n\n',
      ];

      invalidInputs.forEach(input => {
        const result = validateInput(input);
        expect(result).not.toBeNull();
        expect(result).toBe('Please enter a query.');
      });
    });
  });
});

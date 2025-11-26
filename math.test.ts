import { describe, it, expect } from 'vitest';
import { add } from './math';

describe('add', () => {
  it('should add two numbers correctly', () => {
    expect(add(1, 2)).toBe(3);
    expect(add(0, 0)).toBe(0);
    expect(add(-1, 1)).toBe(0);
    expect(add(-1, -1)).toBe(-2);
  });
});

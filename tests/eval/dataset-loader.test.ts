// tests/eval/dataset-loader.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatasetLoader } from '../../src/eval/dataset-loader';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { DatasetFile, EvalCase } from '../../src/eval/types';

describe('DatasetLoader', () => {
  let loader: DatasetLoader;
  let testDir: string;

  beforeAll(() => {
    loader = new DatasetLoader();
    // Create temp directory for test datasets
    testDir = path.join(os.tmpdir(), `dataset-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Single File Loading', () => {
    it('TC-001: should load valid dataset file', async () => {
      const dataset: DatasetFile = {
        tool: 'read_file',
        version: '1.0',
        description: 'Test dataset',
        cases: [
          {
            id: 'test-001',
            description: 'Test case',
            tool: 'read_file',
            category: 'happy_path',
            tags: ['read'],
            difficulty: 1,
            input: { params: { path: 'test.txt' } },
            expected: { success: true }
          }
        ]
      };

      const filePath = path.join(testDir, 'test-dataset.json');
      fs.writeFileSync(filePath, JSON.stringify(dataset, null, 2));

      const cases = await loader.loadDataset(filePath);

      expect(cases).toHaveLength(1);
      expect(cases[0].id).toBe('test-001');
      expect(cases[0].tool).toBe('read_file');
    });

    it('TC-003: should load empty dataset', async () => {
      const dataset: DatasetFile = {
        tool: 'test',
        version: '1.0',
        description: 'Empty dataset',
        cases: []
      };

      const filePath = path.join(testDir, 'empty-dataset.json');
      fs.writeFileSync(filePath, JSON.stringify(dataset));

      const cases = await loader.loadDataset(filePath);

      expect(cases).toHaveLength(0);
    });

    it('TC-005: should handle non-existent file', async () => {
      await expect(loader.loadDataset('./does-not-exist.json')).rejects.toThrow();
    });

    it('TC-006: should handle invalid JSON', async () => {
      const filePath = path.join(testDir, 'invalid.json');
      fs.writeFileSync(filePath, '{ invalid json }');

      await expect(loader.loadDataset(filePath)).rejects.toThrow();
    });
  });

  describe('Dataset Validation', () => {
    it('TC-009: should validate required fields in dataset', () => {
      const invalidDataset = {
        cases: []
        // missing 'tool' field
      };

      const validation = loader.validate(invalidDataset);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(validation.errors?.some(e => e.includes('tool'))).toBe(true);
    });

    it('TC-015: should accept valid dataset', () => {
      const validDataset: DatasetFile = {
        tool: 'read_file',
        version: '1.0',
        description: 'Valid dataset',
        cases: [
          {
            id: 'test-001',
            description: 'Test',
            tool: 'read_file',
            category: 'happy_path',
            tags: [],
            difficulty: 1,
            input: { params: {} },
            expected: { success: true }
          }
        ]
      };

      const validation = loader.validate(validDataset);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
    });
  });

  describe('Directory Loading', () => {
    it('TC-016: should load all datasets from directory', async () => {
      const subDir = path.join(testDir, 'multi');
      fs.mkdirSync(subDir, { recursive: true });

      // Create 3 dataset files
      for (let i = 1; i <= 3; i++) {
        const dataset: DatasetFile = {
          tool: `tool${i}`,
          version: '1.0',
          description: `Dataset ${i}`,
          cases: [
            {
              id: `case-${i}`,
              description: `Case ${i}`,
              tool: `tool${i}`,
              category: 'happy_path',
              tags: [],
              difficulty: 1,
              input: { params: {} },
              expected: { success: true }
            }
          ]
        };

        fs.writeFileSync(
          path.join(subDir, `dataset${i}.json`),
          JSON.stringify(dataset)
        );
      }

      const cases = await loader.loadAll(subDir);

      expect(cases.length).toBeGreaterThanOrEqual(3);
    });

    it('TC-019: should handle empty directory', async () => {
      const emptyDir = path.join(testDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      const cases = await loader.loadAll(emptyDir);

      expect(cases).toHaveLength(0);
    });
  });

  describe('Filtering', () => {
    beforeAll(async () => {
      // Create datasets for filtering tests
      const filterDir = path.join(testDir, 'filter');
      fs.mkdirSync(filterDir, { recursive: true });

      const dataset: DatasetFile = {
        tool: 'mixed',
        version: '1.0',
        description: 'Mixed cases',
        cases: [
          {
            id: 'read-1',
            description: 'Read test',
            tool: 'read_file',
            category: 'happy_path',
            tags: ['read', 'file'],
            difficulty: 1,
            input: { params: {} },
            expected: { success: true }
          },
          {
            id: 'write-1',
            description: 'Write test',
            tool: 'write_file',
            category: 'edge_case',
            tags: ['write', 'file'],
            difficulty: 3,
            input: { params: {} },
            expected: { success: true }
          },
          {
            id: 'read-2',
            description: 'Read error test',
            tool: 'read_file',
            category: 'error_handling',
            tags: ['read', 'error'],
            difficulty: 2,
            input: { params: {} },
            expected: { success: false }
          }
        ]
      };

      fs.writeFileSync(
        path.join(filterDir, 'mixed.json'),
        JSON.stringify(dataset)
      );
    });

    it('TC-022: should filter by tool name', async () => {
      const filterDir = path.join(testDir, 'filter');
      const cases = await loader.loadAll(filterDir, { tool: 'read_file' });

      expect(cases.every(c => c.tool === 'read_file')).toBe(true);
      expect(cases.length).toBeGreaterThan(0);
    });

    it('TC-023: should filter by category', async () => {
      const filterDir = path.join(testDir, 'filter');
      const cases = await loader.loadAll(filterDir, { category: 'happy_path' });

      expect(cases.every(c => c.category === 'happy_path')).toBe(true);
      expect(cases.length).toBeGreaterThan(0);
    });

    it('TC-024: should filter by tags', async () => {
      const filterDir = path.join(testDir, 'filter');
      const cases = await loader.loadAll(filterDir, { tags: ['error'] });

      expect(cases.some(c => c.tags.includes('error'))).toBe(true);
    });

    it('TC-027: should return empty result when filter matches nothing', async () => {
      const filterDir = path.join(testDir, 'filter');
      const cases = await loader.loadAll(filterDir, { tool: 'does_not_exist' });

      expect(cases).toHaveLength(0);
    });
  });
});

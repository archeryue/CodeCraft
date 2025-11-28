// src/eval/dataset-loader.ts

import * as fs from 'fs';
import * as path from 'path';
import type { EvalCase, DatasetFile, DatasetFilter } from './types';

/**
 * Loads and validates evaluation datasets
 */
export class DatasetLoader {
  /**
   * Load dataset from a single file
   */
  async loadDataset(filePath: string): Promise<EvalCase[]> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Dataset file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    let data: unknown;

    try {
      data = JSON.parse(content);
    } catch (error: any) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }

    // Validate dataset structure
    const validation = this.validate(data);
    if (!validation.valid) {
      throw new Error(`Invalid dataset in ${filePath}:\n${validation.errors?.join('\n')}`);
    }

    const dataset = data as DatasetFile;
    return dataset.cases;
  }

  /**
   * Load all datasets from a directory (recursively)
   */
  async loadAll(dir: string, filter?: DatasetFilter): Promise<EvalCase[]> {
    if (!fs.existsSync(dir)) {
      throw new Error(`Directory not found: ${dir}`);
    }

    const allCases: EvalCase[] = [];

    // Find all .json files recursively
    const jsonFiles = this.findJsonFiles(dir);

    // Load each dataset
    for (const file of jsonFiles) {
      try {
        const cases = await this.loadDataset(file);
        allCases.push(...cases);
      } catch (error) {
        // Skip invalid files but log warning
        console.warn(`Skipping invalid dataset ${file}:`, error);
      }
    }

    // Apply filters
    return this.applyFilters(allCases, filter);
  }

  /**
   * Validate dataset structure
   */
  validate(data: unknown): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (typeof data !== 'object' || data === null) {
      return { valid: false, errors: ['Dataset must be an object'] };
    }

    const dataset = data as any;

    // Check required fields
    if (!dataset.tool || typeof dataset.tool !== 'string') {
      errors.push('Dataset must have a "tool" field (string)');
    }

    if (!dataset.cases || !Array.isArray(dataset.cases)) {
      errors.push('Dataset must have a "cases" field (array)');
    }

    // Validate each case
    if (Array.isArray(dataset.cases)) {
      dataset.cases.forEach((evalCase: any, index: number) => {
        const caseErrors = this.validateCase(evalCase, index);
        errors.push(...caseErrors);
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate a single eval case
   */
  private validateCase(evalCase: any, index: number): string[] {
    const errors: string[] = [];
    const prefix = `Case ${index}:`;

    if (!evalCase.id) {
      errors.push(`${prefix} missing required field "id"`);
    }

    if (!evalCase.description) {
      errors.push(`${prefix} missing required field "description"`);
    }

    if (!evalCase.tool) {
      errors.push(`${prefix} missing required field "tool"`);
    }

    if (!evalCase.category) {
      errors.push(`${prefix} missing required field "category"`);
    }

    if (!Array.isArray(evalCase.tags)) {
      errors.push(`${prefix} missing or invalid field "tags" (must be array)`);
    }

    if (typeof evalCase.difficulty !== 'number') {
      errors.push(`${prefix} missing or invalid field "difficulty" (must be number)`);
    }

    if (!evalCase.input) {
      errors.push(`${prefix} missing required field "input"`);
    }

    if (!evalCase.expected) {
      errors.push(`${prefix} missing required field "expected"`);
    }

    return errors;
  }

  /**
   * Find all JSON files in directory recursively
   */
  private findJsonFiles(dir: string): string[] {
    const jsonFiles: string[] = [];

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Recurse into subdirectories
        jsonFiles.push(...this.findJsonFiles(fullPath));
      } else if (item.endsWith('.json')) {
        jsonFiles.push(fullPath);
      }
    }

    return jsonFiles;
  }

  /**
   * Apply filters to cases
   */
  private applyFilters(cases: EvalCase[], filter?: DatasetFilter): EvalCase[] {
    if (!filter) {
      return cases;
    }

    let filtered = cases;

    // Filter by tool
    if (filter.tool) {
      filtered = filtered.filter(c => c.tool === filter.tool);
    }

    // Filter by category
    if (filter.category) {
      filtered = filtered.filter(c => c.category === filter.category);
    }

    // Filter by tags (case has any of the specified tags)
    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter(c =>
        filter.tags!.some(tag => c.tags.includes(tag))
      );
    }

    // Filter by difficulty range
    if (filter.minDifficulty !== undefined) {
      filtered = filtered.filter(c => c.difficulty >= filter.minDifficulty!);
    }

    if (filter.maxDifficulty !== undefined) {
      filtered = filtered.filter(c => c.difficulty <= filter.maxDifficulty!);
    }

    return filtered;
  }
}

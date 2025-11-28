// src/eval/fixtures.ts

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { ToolContext } from '../types/tool';
import type { FixtureSpec, InlineFixture, DirectoryFixture, PresetFixture, FileContent } from './types';

/**
 * Result of setting up a fixture
 */
export interface FixtureSetupResult {
  context: ToolContext;
  cleanup: () => Promise<void>;
}

/**
 * Manages creation and cleanup of isolated test fixtures
 */
export class FixtureManager {
  private tempDirs: Set<string> = new Set();
  private nextId = 1;

  /**
   * Setup a fixture and return isolated ToolContext
   */
  async setup(spec?: FixtureSpec): Promise<FixtureSetupResult> {
    // Create temp directory
    const tempDir = this.createTempDir();
    this.tempDirs.add(tempDir);

    try {
      // Setup fixture based on type
      if (spec) {
        await this.setupFixture(tempDir, spec);
      }

      // Create ToolContext
      const context = this.createContext(tempDir);

      // Create cleanup function
      const cleanup = async () => {
        await this.cleanupDir(tempDir);
        this.tempDirs.delete(tempDir);
      };

      return { context, cleanup };
    } catch (error) {
      // Cleanup on error
      await this.cleanupDir(tempDir);
      this.tempDirs.delete(tempDir);
      throw error;
    }
  }

  /**
   * Cleanup all created fixtures
   */
  async cleanupAll(): Promise<void> {
    const dirs = Array.from(this.tempDirs);
    await Promise.all(dirs.map(dir => this.cleanupDir(dir)));
    this.tempDirs.clear();
  }

  /**
   * Create a unique temp directory
   */
  private createTempDir(): string {
    const timestamp = Date.now();
    const id = this.nextId++;
    const dirName = `eval-${timestamp}-${id}`;
    const tempDir = path.join(os.tmpdir(), dirName);

    fs.mkdirSync(tempDir, { recursive: true });
    return tempDir;
  }

  /**
   * Setup fixture based on its type
   */
  private async setupFixture(tempDir: string, spec: FixtureSpec): Promise<void> {
    switch (spec.type) {
      case 'inline':
        await this.setupInlineFixture(tempDir, spec as InlineFixture);
        break;
      case 'directory':
        await this.setupDirectoryFixture(tempDir, spec as DirectoryFixture);
        break;
      case 'preset':
        await this.setupPresetFixture(tempDir, spec as PresetFixture);
        break;
      default:
        throw new Error(`Unsupported fixture type: ${(spec as any).type}`);
    }
  }

  /**
   * Setup inline fixture (files defined in spec)
   */
  private async setupInlineFixture(tempDir: string, spec: InlineFixture): Promise<void> {
    // Create directories
    if (spec.directories) {
      for (const dir of spec.directories) {
        const dirPath = path.join(tempDir, dir);
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // Create files
    for (const [filePath, content] of Object.entries(spec.files)) {
      const fullPath = path.join(tempDir, filePath);
      const dir = path.dirname(fullPath);

      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      if (typeof content === 'string') {
        fs.writeFileSync(fullPath, content, 'utf-8');
      } else {
        const fileContent = content as FileContent;
        if (fileContent.encoding === 'base64') {
          const buffer = Buffer.from(fileContent.content, 'base64');
          fs.writeFileSync(fullPath, buffer);
        } else {
          fs.writeFileSync(fullPath, fileContent.content, 'utf-8');
        }

        // Set file mode if specified
        if (fileContent.mode !== undefined) {
          fs.chmodSync(fullPath, fileContent.mode);
        }
      }
    }
  }

  /**
   * Setup directory fixture (copy from source)
   */
  private async setupDirectoryFixture(tempDir: string, spec: DirectoryFixture): Promise<void> {
    if (!fs.existsSync(spec.sourcePath)) {
      throw new Error(`Source directory not found: ${spec.sourcePath}`);
    }

    // Copy directory recursively
    this.copyDirectory(spec.sourcePath, tempDir, spec.include, spec.exclude);
  }

  /**
   * Setup preset fixture (copy from fixtures directory)
   */
  private async setupPresetFixture(tempDir: string, spec: PresetFixture): Promise<void> {
    const fixturesDir = path.join(process.cwd(), 'evals', 'fixtures');
    const presetPath = path.join(fixturesDir, spec.name);

    if (!fs.existsSync(presetPath)) {
      const availablePresets = fs.existsSync(fixturesDir)
        ? fs.readdirSync(fixturesDir).filter(f => fs.statSync(path.join(fixturesDir, f)).isDirectory())
        : [];

      throw new Error(
        `Preset '${spec.name}' not found. Available presets: ${availablePresets.join(', ') || 'none'}`
      );
    }

    // Copy preset
    this.copyDirectory(presetPath, tempDir);

    // Apply overrides
    if (spec.overrides) {
      for (const [filePath, content] of Object.entries(spec.overrides)) {
        const fullPath = path.join(tempDir, filePath);
        fs.writeFileSync(fullPath, content, 'utf-8');
      }
    }
  }

  /**
   * Copy directory recursively with optional filtering
   */
  private copyDirectory(
    src: string,
    dest: string,
    include?: string[],
    exclude?: string[]
  ): void {
    // Simple implementation - would use glob matching for include/exclude in production
    const items = fs.readdirSync(src);

    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      const stat = fs.statSync(srcPath);

      if (stat.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        this.copyDirectory(srcPath, destPath, include, exclude);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Create ToolContext for the fixture
   */
  private createContext(tempDir: string): ToolContext {
    return {
      cwd: tempDir,
      fs: {
        readFileSync: (filePath: string, encoding: string) => {
          const fullPath = path.isAbsolute(filePath) ? filePath : path.join(tempDir, filePath);
          return fs.readFileSync(fullPath, encoding as any);
        },
        writeFileSync: (filePath: string, content: string) => {
          const fullPath = path.isAbsolute(filePath) ? filePath : path.join(tempDir, filePath);
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(fullPath, content, 'utf-8');
        },
        existsSync: (filePath: string) => {
          const fullPath = path.isAbsolute(filePath) ? filePath : path.join(tempDir, filePath);
          return fs.existsSync(fullPath);
        },
        unlinkSync: (filePath: string) => {
          const fullPath = path.isAbsolute(filePath) ? filePath : path.join(tempDir, filePath);
          fs.unlinkSync(fullPath);
        },
        readdirSync: (dirPath: string, options?: any) => {
          const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(tempDir, dirPath);
          return fs.readdirSync(fullPath, options);
        },
        statSync: (filePath: string) => {
          const fullPath = path.isAbsolute(filePath) ? filePath : path.join(tempDir, filePath);
          return fs.statSync(fullPath);
        }
      },
      rustEngine: undefined, // Will be provided by test setup if needed
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {}
      }
    };
  }

  /**
   * Cleanup a temp directory
   */
  private async cleanupDir(dir: string): Promise<void> {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

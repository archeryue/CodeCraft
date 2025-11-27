# Pluggable Tools Architecture - Deep Dive

This document expands on the core architecture with detailed designs for advanced features.

---

## Table of Contents

1. [Tool Context Deep Dive](#1-tool-context-deep-dive)
2. [Permission and Security Model](#2-permission-and-security-model)
3. [Tool Lifecycle Management](#3-tool-lifecycle-management)
4. [Error Handling Patterns](#4-error-handling-patterns)
5. [Plugin Loading Mechanisms](#5-plugin-loading-mechanisms)
6. [Versioning and Compatibility](#6-versioning-and-compatibility)
7. [Tool Composition Patterns](#7-tool-composition-patterns)
8. [Configuration Management](#8-configuration-management)
9. [Observability and Debugging](#9-observability-and-debugging)
10. [Performance Optimization](#10-performance-optimization)

---

## 1. Tool Context Deep Dive

The `ToolContext` is the dependency injection container that provides tools with everything they need to execute. A well-designed context enables testing, security, and flexibility.

### 1.1 Context Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Request Context                                 │
│  - Per-invocation data (request ID, user info, timeout)             │
│  - Confirm callbacks                                                 │
│  - Abort signals                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Session Context                                 │
│  - Conversation state                                                │
│  - Accumulated file access                                           │
│  - Todo list state                                                   │
│  - Working directory                                                 │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Application Context                             │
│  - Filesystem abstraction                                            │
│  - Rust engine instance                                              │
│  - Logger                                                            │
│  - Configuration                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Full Context Interface

```typescript
// src/types/context.ts

/**
 * Application-level context (singleton, created at startup)
 */
export interface ApplicationContext {
  // Filesystem abstraction
  fs: FileSystemAbstraction;

  // Rust engine for AST operations
  rustEngine: RustEngineAbstraction;

  // Application configuration
  config: AppConfig;

  // Global logger
  logger: Logger;

  // Plugin manager for dynamic tool loading
  pluginManager: PluginManager;

  // Metrics collector
  metrics: MetricsCollector;
}

/**
 * Session-level context (per conversation)
 */
export interface SessionContext {
  // Unique session identifier
  sessionId: string;

  // Working directory for this session
  cwd: string;

  // Files accessed in this session (for context tracking)
  accessedFiles: Map<string, {
    readCount: number;
    writeCount: number;
    lastAccess: Date;
  }>;

  // Current todo list state
  todos: TodoItem[];

  // Session start time
  startedAt: Date;

  // Conversation history reference
  conversationId?: string;

  // User preferences for this session
  preferences: SessionPreferences;
}

/**
 * Request-level context (per tool invocation)
 */
export interface RequestContext {
  // Unique request identifier for tracing
  requestId: string;

  // Timestamp of request
  timestamp: Date;

  // Timeout for this specific request
  timeoutMs: number;

  // Abort signal for cancellation
  signal: AbortSignal;

  // Confirmation callback for destructive operations
  confirm?: ConfirmCallback;

  // User who initiated (for audit logging)
  initiator?: {
    type: 'user' | 'agent' | 'system';
    id?: string;
  };

  // Parent request (for chained tool calls)
  parentRequestId?: string;

  // Depth in tool chain (to prevent infinite recursion)
  chainDepth: number;
}

/**
 * Combined context passed to tools
 */
export interface ToolContext {
  app: ApplicationContext;
  session: SessionContext;
  request: RequestContext;
}

/**
 * Filesystem abstraction for testability
 */
export interface FileSystemAbstraction {
  // Read operations
  readFile(path: string, encoding?: BufferEncoding): Promise<string>;
  readFileSync(path: string, encoding?: BufferEncoding): string;
  exists(path: string): Promise<boolean>;
  existsSync(path: string): boolean;
  stat(path: string): Promise<FileStats>;
  statSync(path: string): FileStats;
  readdir(path: string, options?: ReaddirOptions): Promise<DirEntry[]>;
  readdirSync(path: string, options?: ReaddirOptions): DirEntry[];

  // Write operations
  writeFile(path: string, content: string): Promise<void>;
  writeFileSync(path: string, content: string): void;
  mkdir(path: string, options?: MkdirOptions): Promise<void>;
  mkdirSync(path: string, options?: MkdirOptions): void;
  unlink(path: string): Promise<void>;
  unlinkSync(path: string): void;
  rename(oldPath: string, newPath: string): Promise<void>;

  // Path operations
  resolve(...paths: string[]): string;
  join(...paths: string[]): string;
  dirname(path: string): string;
  basename(path: string): string;
  relative(from: string, to: string): string;
  isAbsolute(path: string): boolean;

  // Glob operations
  glob(pattern: string, options?: GlobOptions): Promise<string[]>;
}

/**
 * Rust engine abstraction
 */
export interface RustEngineAbstraction {
  // Code map generation
  generateRepoMap(path: string): string;

  // Symbol search
  search(path: string, query: string): SearchResult[];

  // Symbol information
  getSymbolInfo(file: string, symbol: string): SymbolInfo | null;

  // Import/export analysis
  getImportsExports(file: string): ImportsExports | null;

  // Dependency graph
  buildDependencyGraph(path: string): DependencyGraph | null;

  // Symbol resolution
  resolveSymbol(symbol: string, file: string): SymbolLocation | null;

  // Reference finding
  findReferences(symbol: string, path: string): Reference[];

  // Health check
  isHealthy(): boolean;
}

export type ConfirmCallback = (options: {
  message: string;
  diff?: string;
  riskLevel: 'low' | 'medium' | 'high';
}) => Promise<boolean>;
```

### 1.3 Context Factory

```typescript
// src/context/factory.ts

export class ContextFactory {
  private appContext: ApplicationContext;

  constructor(config: AppConfig) {
    this.appContext = this.createAppContext(config);
  }

  private createAppContext(config: AppConfig): ApplicationContext {
    return {
      fs: config.mockFs ?? new RealFileSystem(),
      rustEngine: this.loadRustEngine(config),
      config,
      logger: new ConsoleLogger(config.logLevel),
      pluginManager: new PluginManager(config.pluginPaths),
      metrics: new MetricsCollector()
    };
  }

  createSessionContext(options: {
    cwd?: string;
    preferences?: Partial<SessionPreferences>;
  } = {}): SessionContext {
    return {
      sessionId: generateUUID(),
      cwd: options.cwd ?? process.cwd(),
      accessedFiles: new Map(),
      todos: [],
      startedAt: new Date(),
      preferences: {
        confirmWrites: true,
        maxFileSize: 1024 * 1024, // 1MB
        ...options.preferences
      }
    };
  }

  createRequestContext(options: {
    timeoutMs?: number;
    confirm?: ConfirmCallback;
    parentRequestId?: string;
    chainDepth?: number;
  } = {}): RequestContext {
    const controller = new AbortController();

    return {
      requestId: generateUUID(),
      timestamp: new Date(),
      timeoutMs: options.timeoutMs ?? 30000,
      signal: controller.signal,
      confirm: options.confirm,
      initiator: { type: 'user' },
      parentRequestId: options.parentRequestId,
      chainDepth: options.chainDepth ?? 0
    };
  }

  createToolContext(
    session: SessionContext,
    request: RequestContext
  ): ToolContext {
    return {
      app: this.appContext,
      session,
      request
    };
  }

  // For testing: create context with mocked dependencies
  static createMockContext(mocks: {
    files?: Record<string, string>;
    rustEngine?: Partial<RustEngineAbstraction>;
  }): ToolContext {
    const mockFs = new MockFileSystem(mocks.files ?? {});
    const mockEngine = createMockRustEngine(mocks.rustEngine);

    return {
      app: {
        fs: mockFs,
        rustEngine: mockEngine,
        config: defaultConfig(),
        logger: new NullLogger(),
        pluginManager: new NullPluginManager(),
        metrics: new NullMetricsCollector()
      },
      session: {
        sessionId: 'test-session',
        cwd: '/test',
        accessedFiles: new Map(),
        todos: [],
        startedAt: new Date(),
        preferences: defaultPreferences()
      },
      request: {
        requestId: 'test-request',
        timestamp: new Date(),
        timeoutMs: 5000,
        signal: new AbortController().signal,
        initiator: { type: 'system' },
        chainDepth: 0
      }
    };
  }

  private loadRustEngine(config: AppConfig): RustEngineAbstraction {
    try {
      const enginePath = config.rustEnginePath ??
        path.resolve(process.cwd(), 'rust_engine.linux-x64-gnu.node');
      const engine = require(enginePath);
      return engine;
    } catch (e) {
      return new NullRustEngine();
    }
  }
}
```

### 1.4 Mock Filesystem Implementation

```typescript
// src/context/mock-fs.ts

export class MockFileSystem implements FileSystemAbstraction {
  private files: Map<string, string> = new Map();
  private directories: Set<string> = new Set();

  constructor(initialFiles: Record<string, string> = {}) {
    for (const [path, content] of Object.entries(initialFiles)) {
      this.files.set(this.normalize(path), content);
      // Auto-create parent directories
      this.ensureParentDirs(path);
    }
  }

  private normalize(p: string): string {
    return path.normalize(p).replace(/\\/g, '/');
  }

  private ensureParentDirs(filePath: string): void {
    const dir = path.dirname(filePath);
    if (dir && dir !== '.' && dir !== '/') {
      this.directories.add(this.normalize(dir));
      this.ensureParentDirs(dir);
    }
  }

  // Read operations
  readFileSync(p: string, encoding?: BufferEncoding): string {
    const normalized = this.normalize(p);
    const content = this.files.get(normalized);
    if (content === undefined) {
      const error = new Error(`ENOENT: no such file or directory, open '${p}'`);
      (error as any).code = 'ENOENT';
      throw error;
    }
    return content;
  }

  async readFile(p: string, encoding?: BufferEncoding): Promise<string> {
    return this.readFileSync(p, encoding);
  }

  existsSync(p: string): boolean {
    const normalized = this.normalize(p);
    return this.files.has(normalized) || this.directories.has(normalized);
  }

  async exists(p: string): Promise<boolean> {
    return this.existsSync(p);
  }

  statSync(p: string): FileStats {
    const normalized = this.normalize(p);
    if (this.files.has(normalized)) {
      const content = this.files.get(normalized)!;
      return {
        isFile: () => true,
        isDirectory: () => false,
        size: Buffer.byteLength(content, 'utf-8'),
        mtime: new Date()
      };
    }
    if (this.directories.has(normalized)) {
      return {
        isFile: () => false,
        isDirectory: () => true,
        size: 0,
        mtime: new Date()
      };
    }
    const error = new Error(`ENOENT: no such file or directory, stat '${p}'`);
    (error as any).code = 'ENOENT';
    throw error;
  }

  async stat(p: string): Promise<FileStats> {
    return this.statSync(p);
  }

  readdirSync(p: string, options?: ReaddirOptions): DirEntry[] {
    const normalized = this.normalize(p);
    if (!this.directories.has(normalized) && normalized !== '.') {
      const error = new Error(`ENOENT: no such file or directory, scandir '${p}'`);
      (error as any).code = 'ENOENT';
      throw error;
    }

    const entries: DirEntry[] = [];
    const prefix = normalized === '.' ? '' : normalized + '/';

    // Find direct children
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        const relative = filePath.slice(prefix.length);
        if (!relative.includes('/')) {
          entries.push({
            name: relative,
            isFile: () => true,
            isDirectory: () => false
          });
        }
      }
    }

    for (const dirPath of this.directories) {
      if (dirPath.startsWith(prefix) && dirPath !== normalized) {
        const relative = dirPath.slice(prefix.length);
        if (!relative.includes('/')) {
          entries.push({
            name: relative,
            isFile: () => false,
            isDirectory: () => true
          });
        }
      }
    }

    return entries;
  }

  async readdir(p: string, options?: ReaddirOptions): Promise<DirEntry[]> {
    return this.readdirSync(p, options);
  }

  // Write operations
  writeFileSync(p: string, content: string): void {
    const normalized = this.normalize(p);
    this.files.set(normalized, content);
    this.ensureParentDirs(p);
  }

  async writeFile(p: string, content: string): Promise<void> {
    this.writeFileSync(p, content);
  }

  mkdirSync(p: string, options?: MkdirOptions): void {
    const normalized = this.normalize(p);
    if (options?.recursive) {
      this.ensureParentDirs(p);
    }
    this.directories.add(normalized);
  }

  async mkdir(p: string, options?: MkdirOptions): Promise<void> {
    this.mkdirSync(p, options);
  }

  unlinkSync(p: string): void {
    const normalized = this.normalize(p);
    if (!this.files.has(normalized)) {
      const error = new Error(`ENOENT: no such file or directory, unlink '${p}'`);
      (error as any).code = 'ENOENT';
      throw error;
    }
    this.files.delete(normalized);
  }

  async unlink(p: string): Promise<void> {
    this.unlinkSync(p);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const oldNorm = this.normalize(oldPath);
    const newNorm = this.normalize(newPath);

    if (!this.files.has(oldNorm)) {
      const error = new Error(`ENOENT: no such file or directory, rename '${oldPath}'`);
      (error as any).code = 'ENOENT';
      throw error;
    }

    const content = this.files.get(oldNorm)!;
    this.files.delete(oldNorm);
    this.files.set(newNorm, content);
    this.ensureParentDirs(newPath);
  }

  // Path operations (delegate to path module)
  resolve(...paths: string[]): string { return path.resolve(...paths); }
  join(...paths: string[]): string { return path.join(...paths); }
  dirname(p: string): string { return path.dirname(p); }
  basename(p: string): string { return path.basename(p); }
  relative(from: string, to: string): string { return path.relative(from, to); }
  isAbsolute(p: string): boolean { return path.isAbsolute(p); }

  // Glob (simplified implementation)
  async glob(pattern: string, options?: GlobOptions): Promise<string[]> {
    const allPaths = [...this.files.keys()];
    // Simple glob matching (would use micromatch in real impl)
    return allPaths.filter(p => this.matchGlob(p, pattern));
  }

  private matchGlob(filePath: string, pattern: string): boolean {
    // Simplified glob matching
    const regex = pattern
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/{{GLOBSTAR}}/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${regex}$`).test(filePath);
  }

  // Test helpers
  getFiles(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [path, content] of this.files) {
      result[path] = content;
    }
    return result;
  }

  clear(): void {
    this.files.clear();
    this.directories.clear();
  }
}
```

---

## 2. Permission and Security Model

### 2.1 Capability-Based Security

```typescript
// src/security/capabilities.ts

/**
 * Fine-grained capability flags for tools
 */
export interface ToolCapabilities {
  // Filesystem permissions
  filesystem: {
    read: boolean;
    write: boolean;
    delete: boolean;
    execute: boolean;  // Can execute files
  };

  // Path restrictions
  paths: {
    allowedPatterns: string[];   // Glob patterns for allowed paths
    deniedPatterns: string[];    // Glob patterns for denied paths
    maxDepth?: number;           // Max directory depth from cwd
  };

  // Network permissions
  network: {
    allowed: boolean;
    allowedHosts?: string[];     // Whitelist of hosts
    deniedHosts?: string[];      // Blacklist of hosts
  };

  // Process permissions
  process: {
    spawn: boolean;              // Can spawn child processes
    allowedCommands?: string[];  // Whitelist of commands
    deniedCommands?: string[];   // Blacklist of commands
    maxExecutionTime?: number;   // Max execution time in ms
  };

  // Resource limits
  limits: {
    maxFileSize?: number;        // Max file size to read/write
    maxFiles?: number;           // Max files per operation
    maxMemory?: number;          // Max memory usage
    maxCpu?: number;             // Max CPU time
  };

  // Rust engine permissions
  rustEngine: {
    allowed: boolean;
    functions?: string[];        // Specific functions allowed
  };

  // Special flags
  special: {
    requiresConfirmation: boolean;  // Must confirm before execution
    auditLog: boolean;              // Log all invocations
    sandboxed: boolean;             // Run in sandbox environment
  };
}

/**
 * Default capabilities for different security levels
 */
export const CAPABILITY_PRESETS = {
  // Full access (for trusted tools)
  full: {
    filesystem: { read: true, write: true, delete: true, execute: true },
    paths: { allowedPatterns: ['**/*'], deniedPatterns: [] },
    network: { allowed: true },
    process: { spawn: true },
    limits: {},
    rustEngine: { allowed: true },
    special: { requiresConfirmation: false, auditLog: false, sandboxed: false }
  },

  // Read-only access
  readonly: {
    filesystem: { read: true, write: false, delete: false, execute: false },
    paths: { allowedPatterns: ['**/*'], deniedPatterns: ['**/.env*', '**/secrets/**'] },
    network: { allowed: false },
    process: { spawn: false },
    limits: { maxFileSize: 10 * 1024 * 1024 }, // 10MB
    rustEngine: { allowed: true },
    special: { requiresConfirmation: false, auditLog: false, sandboxed: false }
  },

  // Write with confirmation
  writeWithConfirm: {
    filesystem: { read: true, write: true, delete: true, execute: false },
    paths: { allowedPatterns: ['**/*'], deniedPatterns: ['**/.env*', '**/node_modules/**'] },
    network: { allowed: false },
    process: { spawn: false },
    limits: { maxFileSize: 1024 * 1024 }, // 1MB
    rustEngine: { allowed: true },
    special: { requiresConfirmation: true, auditLog: true, sandboxed: false }
  },

  // Sandboxed (for untrusted tools)
  sandboxed: {
    filesystem: { read: true, write: true, delete: false, execute: false },
    paths: { allowedPatterns: ['sandbox/**'], deniedPatterns: ['**/*'] },
    network: { allowed: false },
    process: { spawn: false },
    limits: { maxFileSize: 100 * 1024, maxFiles: 10, maxMemory: 50 * 1024 * 1024 },
    rustEngine: { allowed: false },
    special: { requiresConfirmation: true, auditLog: true, sandboxed: true }
  }
} as const;
```

### 2.2 Permission Checker

```typescript
// src/security/permission-checker.ts

export class PermissionChecker {
  private capabilities: ToolCapabilities;
  private cwd: string;

  constructor(capabilities: ToolCapabilities, cwd: string) {
    this.capabilities = capabilities;
    this.cwd = cwd;
  }

  /**
   * Check if a file read is allowed
   */
  canReadFile(filePath: string): PermissionResult {
    if (!this.capabilities.filesystem.read) {
      return { allowed: false, reason: 'File read not permitted' };
    }

    return this.checkPath(filePath, 'read');
  }

  /**
   * Check if a file write is allowed
   */
  canWriteFile(filePath: string, size?: number): PermissionResult {
    if (!this.capabilities.filesystem.write) {
      return { allowed: false, reason: 'File write not permitted' };
    }

    const pathCheck = this.checkPath(filePath, 'write');
    if (!pathCheck.allowed) return pathCheck;

    if (size && this.capabilities.limits.maxFileSize) {
      if (size > this.capabilities.limits.maxFileSize) {
        return {
          allowed: false,
          reason: `File size ${size} exceeds limit ${this.capabilities.limits.maxFileSize}`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if a file delete is allowed
   */
  canDeleteFile(filePath: string): PermissionResult {
    if (!this.capabilities.filesystem.delete) {
      return { allowed: false, reason: 'File delete not permitted' };
    }

    return this.checkPath(filePath, 'delete');
  }

  /**
   * Check if a command execution is allowed
   */
  canExecuteCommand(command: string): PermissionResult {
    if (!this.capabilities.process.spawn) {
      return { allowed: false, reason: 'Command execution not permitted' };
    }

    const baseCommand = command.split(/\s+/)[0];

    // Check allowed commands
    if (this.capabilities.process.allowedCommands) {
      if (!this.capabilities.process.allowedCommands.includes(baseCommand)) {
        return { allowed: false, reason: `Command '${baseCommand}' not in allowed list` };
      }
    }

    // Check denied commands
    if (this.capabilities.process.deniedCommands) {
      if (this.capabilities.process.deniedCommands.includes(baseCommand)) {
        return { allowed: false, reason: `Command '${baseCommand}' is denied` };
      }
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /rm\s+-rf\s+\//, // rm -rf /
      />\s*\/dev\/sd/, // write to disk devices
      /mkfs/,          // format filesystems
      /dd\s+if=/,      // disk operations
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return { allowed: false, reason: 'Command contains dangerous pattern' };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if Rust engine function is allowed
   */
  canUseRustEngine(functionName?: string): PermissionResult {
    if (!this.capabilities.rustEngine.allowed) {
      return { allowed: false, reason: 'Rust engine access not permitted' };
    }

    if (functionName && this.capabilities.rustEngine.functions) {
      if (!this.capabilities.rustEngine.functions.includes(functionName)) {
        return { allowed: false, reason: `Rust engine function '${functionName}' not allowed` };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if confirmation is required
   */
  requiresConfirmation(): boolean {
    return this.capabilities.special.requiresConfirmation;
  }

  /**
   * Check path against allowed/denied patterns
   */
  private checkPath(filePath: string, operation: string): PermissionResult {
    const resolvedPath = path.resolve(this.cwd, filePath);
    const relativePath = path.relative(this.cwd, resolvedPath);

    // Check if path escapes cwd
    if (relativePath.startsWith('..')) {
      return { allowed: false, reason: 'Path escapes working directory' };
    }

    // Check max depth
    if (this.capabilities.paths.maxDepth !== undefined) {
      const depth = relativePath.split(path.sep).length;
      if (depth > this.capabilities.paths.maxDepth) {
        return { allowed: false, reason: `Path depth ${depth} exceeds limit ${this.capabilities.paths.maxDepth}` };
      }
    }

    // Check denied patterns first
    for (const pattern of this.capabilities.paths.deniedPatterns) {
      if (minimatch(relativePath, pattern)) {
        return { allowed: false, reason: `Path matches denied pattern: ${pattern}` };
      }
    }

    // Check allowed patterns
    const matchesAllowed = this.capabilities.paths.allowedPatterns.some(
      pattern => minimatch(relativePath, pattern)
    );

    if (!matchesAllowed) {
      return { allowed: false, reason: 'Path does not match any allowed pattern' };
    }

    return { allowed: true };
  }
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}
```

### 2.3 Security Middleware

```typescript
// src/security/middleware.ts

export class SecurityMiddleware {
  /**
   * Wrap a tool with security checks
   */
  static secure(tool: Tool, capabilities: ToolCapabilities): Tool {
    return {
      ...tool,

      async execute(params: unknown, context: ToolContext): Promise<ToolResult> {
        const checker = new PermissionChecker(capabilities, context.session.cwd);

        // Pre-execution security checks based on tool capabilities
        if (tool.capabilities.writesFiles) {
          // Tool will write files - check if allowed
          const canWrite = checker.canWriteFile('*'); // General check
          if (!canWrite.allowed) {
            return {
              success: false,
              error: {
                code: 'PERMISSION_DENIED',
                message: canWrite.reason || 'Write permission denied'
              }
            };
          }
        }

        if (tool.capabilities.executesCommands) {
          const canExec = checker.canExecuteCommand('*');
          if (!canExec.allowed) {
            return {
              success: false,
              error: {
                code: 'PERMISSION_DENIED',
                message: canExec.reason || 'Command execution denied'
              }
            };
          }
        }

        // Confirmation check
        if (checker.requiresConfirmation() && context.request.confirm) {
          const confirmed = await context.request.confirm({
            message: `Tool '${tool.name}' requires confirmation`,
            riskLevel: tool.capabilities.writesFiles ? 'high' : 'medium'
          });

          if (!confirmed) {
            return {
              success: false,
              error: {
                code: 'USER_CANCELLED',
                message: 'Operation cancelled by user'
              }
            };
          }
        }

        // Audit logging
        if (capabilities.special.auditLog) {
          context.app.logger.info('AUDIT', {
            tool: tool.name,
            params,
            requestId: context.request.requestId,
            sessionId: context.session.sessionId
          });
        }

        // Execute with wrapped context
        const securedContext = this.wrapContext(context, checker);
        return tool.execute(params, securedContext);
      }
    };
  }

  /**
   * Wrap context with permission-checking proxies
   */
  private static wrapContext(
    context: ToolContext,
    checker: PermissionChecker
  ): ToolContext {
    return {
      ...context,
      app: {
        ...context.app,
        fs: this.wrapFs(context.app.fs, checker),
        rustEngine: this.wrapRustEngine(context.app.rustEngine, checker)
      }
    };
  }

  private static wrapFs(
    fs: FileSystemAbstraction,
    checker: PermissionChecker
  ): FileSystemAbstraction {
    return new Proxy(fs, {
      get(target, prop) {
        const original = (target as any)[prop];
        if (typeof original !== 'function') return original;

        return function(...args: any[]) {
          // Check permissions based on method
          if (['readFile', 'readFileSync'].includes(prop as string)) {
            const check = checker.canReadFile(args[0]);
            if (!check.allowed) {
              throw new Error(`Permission denied: ${check.reason}`);
            }
          }

          if (['writeFile', 'writeFileSync'].includes(prop as string)) {
            const check = checker.canWriteFile(args[0], args[1]?.length);
            if (!check.allowed) {
              throw new Error(`Permission denied: ${check.reason}`);
            }
          }

          if (['unlink', 'unlinkSync'].includes(prop as string)) {
            const check = checker.canDeleteFile(args[0]);
            if (!check.allowed) {
              throw new Error(`Permission denied: ${check.reason}`);
            }
          }

          return original.apply(target, args);
        };
      }
    });
  }

  private static wrapRustEngine(
    engine: RustEngineAbstraction,
    checker: PermissionChecker
  ): RustEngineAbstraction {
    return new Proxy(engine, {
      get(target, prop) {
        const original = (target as any)[prop];
        if (typeof original !== 'function') return original;

        return function(...args: any[]) {
          const check = checker.canUseRustEngine(prop as string);
          if (!check.allowed) {
            throw new Error(`Permission denied: ${check.reason}`);
          }
          return original.apply(target, args);
        };
      }
    });
  }
}
```

---

## 3. Tool Lifecycle Management

### 3.1 Lifecycle States

```
                    ┌─────────────┐
                    │  CREATED    │
                    └──────┬──────┘
                           │ initialize()
                           ▼
┌─────────────┐     ┌─────────────┐
│   ERROR     │◄────│ INITIALIZING│
└─────────────┘     └──────┬──────┘
      ▲                    │ success
      │                    ▼
      │             ┌─────────────┐
      │             │   READY     │◄─────────┐
      │             └──────┬──────┘          │
      │                    │ execute()       │
      │                    ▼                 │
      │             ┌─────────────┐          │
      └─────────────│  EXECUTING  │──────────┘
                    └──────┬──────┘ complete
                           │ shutdown()
                           ▼
                    ┌─────────────┐
                    │  SHUTDOWN   │
                    └─────────────┘
```

### 3.2 Lifecycle Manager

```typescript
// src/lifecycle/manager.ts

export type ToolState = 'created' | 'initializing' | 'ready' | 'executing' | 'error' | 'shutdown';

export interface ToolLifecycleInfo {
  name: string;
  state: ToolState;
  initializationTime?: number;
  lastExecutionTime?: number;
  executionCount: number;
  errorCount: number;
  lastError?: Error;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

export class ToolLifecycleManager {
  private tools: Map<string, {
    tool: Tool;
    state: ToolState;
    info: ToolLifecycleInfo;
  }> = new Map();

  private context?: ToolContext;

  /**
   * Register a tool (state: created)
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, {
      tool,
      state: 'created',
      info: {
        name: tool.name,
        state: 'created',
        executionCount: 0,
        errorCount: 0,
        healthStatus: 'healthy'
      }
    });
  }

  /**
   * Initialize all tools
   */
  async initializeAll(context: ToolContext): Promise<InitializationResult> {
    this.context = context;
    const results: { tool: string; success: boolean; error?: string; timeMs: number }[] = [];

    for (const [name, entry] of this.tools) {
      const startTime = Date.now();

      try {
        entry.state = 'initializing';
        entry.info.state = 'initializing';

        if (entry.tool.initialize) {
          await entry.tool.initialize(context);
        }

        entry.state = 'ready';
        entry.info.state = 'ready';
        entry.info.initializationTime = Date.now() - startTime;

        results.push({ tool: name, success: true, timeMs: Date.now() - startTime });
      } catch (err: any) {
        entry.state = 'error';
        entry.info.state = 'error';
        entry.info.lastError = err;
        entry.info.healthStatus = 'unhealthy';

        results.push({
          tool: name,
          success: false,
          error: err.message,
          timeMs: Date.now() - startTime
        });
      }
    }

    return {
      totalTools: this.tools.size,
      initialized: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Execute a tool with lifecycle tracking
   */
  async execute(name: string, params: unknown): Promise<ToolResult> {
    const entry = this.tools.get(name);
    if (!entry) {
      return {
        success: false,
        error: { code: 'TOOL_NOT_FOUND', message: `Tool '${name}' not registered` }
      };
    }

    if (entry.state !== 'ready') {
      return {
        success: false,
        error: {
          code: 'TOOL_NOT_READY',
          message: `Tool '${name}' is in state '${entry.state}', expected 'ready'`
        }
      };
    }

    const startTime = Date.now();
    entry.state = 'executing';

    try {
      const result = await entry.tool.execute(params, this.context!);

      entry.state = 'ready';
      entry.info.executionCount++;
      entry.info.lastExecutionTime = Date.now() - startTime;

      if (!result.success) {
        entry.info.errorCount++;
      }

      return result;
    } catch (err: any) {
      entry.state = 'ready'; // Return to ready state even after error
      entry.info.executionCount++;
      entry.info.errorCount++;
      entry.info.lastError = err;

      // Update health status based on error rate
      const errorRate = entry.info.errorCount / entry.info.executionCount;
      if (errorRate > 0.5) {
        entry.info.healthStatus = 'unhealthy';
      } else if (errorRate > 0.1) {
        entry.info.healthStatus = 'degraded';
      }

      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: err.message
        }
      };
    }
  }

  /**
   * Shutdown all tools
   */
  async shutdownAll(): Promise<void> {
    const shutdownPromises = Array.from(this.tools.values()).map(async entry => {
      try {
        entry.state = 'shutdown';
        entry.info.state = 'shutdown';

        if (entry.tool.shutdown) {
          await entry.tool.shutdown();
        }
      } catch (err) {
        // Log but don't throw during shutdown
        console.error(`Error shutting down tool '${entry.tool.name}':`, err);
      }
    });

    await Promise.all(shutdownPromises);
  }

  /**
   * Get health status of all tools
   */
  getHealthStatus(): HealthReport {
    const tools: ToolLifecycleInfo[] = [];
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;

    for (const entry of this.tools.values()) {
      tools.push(entry.info);

      switch (entry.info.healthStatus) {
        case 'healthy': healthy++; break;
        case 'degraded': degraded++; break;
        case 'unhealthy': unhealthy++; break;
      }
    }

    return {
      overall: unhealthy > 0 ? 'unhealthy' : (degraded > 0 ? 'degraded' : 'healthy'),
      healthy,
      degraded,
      unhealthy,
      tools
    };
  }

  /**
   * Restart a failed tool
   */
  async restartTool(name: string): Promise<boolean> {
    const entry = this.tools.get(name);
    if (!entry || !this.context) return false;

    try {
      if (entry.tool.shutdown) {
        await entry.tool.shutdown();
      }

      entry.state = 'created';
      entry.info.state = 'created';
      entry.info.errorCount = 0;
      entry.info.healthStatus = 'healthy';
      entry.info.lastError = undefined;

      if (entry.tool.initialize) {
        entry.state = 'initializing';
        await entry.tool.initialize(this.context);
      }

      entry.state = 'ready';
      entry.info.state = 'ready';

      return true;
    } catch (err) {
      entry.state = 'error';
      entry.info.state = 'error';
      entry.info.healthStatus = 'unhealthy';
      return false;
    }
  }
}

export interface InitializationResult {
  totalTools: number;
  initialized: number;
  failed: number;
  results: { tool: string; success: boolean; error?: string; timeMs: number }[];
}

export interface HealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  healthy: number;
  degraded: number;
  unhealthy: number;
  tools: ToolLifecycleInfo[];
}
```

---

## 4. Error Handling Patterns

### 4.1 Error Types

```typescript
// src/errors/types.ts

/**
 * Base error class for all tool errors
 */
export class ToolError extends Error {
  code: string;
  tool: string;
  recoverable: boolean;
  context?: Record<string, unknown>;

  constructor(options: {
    code: string;
    message: string;
    tool: string;
    recoverable?: boolean;
    context?: Record<string, unknown>;
    cause?: Error;
  }) {
    super(options.message);
    this.name = 'ToolError';
    this.code = options.code;
    this.tool = options.tool;
    this.recoverable = options.recoverable ?? false;
    this.context = options.context;
    this.cause = options.cause;
  }
}

/**
 * Validation error - invalid parameters
 */
export class ValidationError extends ToolError {
  validationErrors: string[];

  constructor(tool: string, errors: string[]) {
    super({
      code: 'VALIDATION_ERROR',
      message: `Validation failed: ${errors.join(', ')}`,
      tool,
      recoverable: true,
      context: { errors }
    });
    this.name = 'ValidationError';
    this.validationErrors = errors;
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends ToolError {
  resourceType: string;
  resourceId: string;

  constructor(tool: string, resourceType: string, resourceId: string) {
    super({
      code: 'NOT_FOUND',
      message: `${resourceType} not found: ${resourceId}`,
      tool,
      recoverable: false,
      context: { resourceType, resourceId }
    });
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Permission denied error
 */
export class PermissionError extends ToolError {
  operation: string;
  resource: string;

  constructor(tool: string, operation: string, resource: string, reason?: string) {
    super({
      code: 'PERMISSION_DENIED',
      message: reason || `Permission denied: ${operation} on ${resource}`,
      tool,
      recoverable: false,
      context: { operation, resource }
    });
    this.name = 'PermissionError';
    this.operation = operation;
    this.resource = resource;
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends ToolError {
  timeoutMs: number;

  constructor(tool: string, timeoutMs: number) {
    super({
      code: 'TIMEOUT',
      message: `Operation timed out after ${timeoutMs}ms`,
      tool,
      recoverable: true,
      context: { timeoutMs }
    });
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * External dependency error (e.g., Rust engine failure)
 */
export class DependencyError extends ToolError {
  dependency: string;

  constructor(tool: string, dependency: string, cause?: Error) {
    super({
      code: 'DEPENDENCY_ERROR',
      message: `Dependency '${dependency}' failed: ${cause?.message || 'unknown error'}`,
      tool,
      recoverable: true,
      context: { dependency },
      cause
    });
    this.name = 'DependencyError';
    this.dependency = dependency;
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ToolError {
  retryAfterMs: number;

  constructor(tool: string, retryAfterMs: number) {
    super({
      code: 'RATE_LIMIT',
      message: `Rate limit exceeded, retry after ${retryAfterMs}ms`,
      tool,
      recoverable: true,
      context: { retryAfterMs }
    });
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}
```

### 4.2 Error Handler

```typescript
// src/errors/handler.ts

export interface ErrorHandlerOptions {
  // Retry configuration
  retry: {
    enabled: boolean;
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    retryableErrors: string[];
  };

  // Fallback behavior
  fallback: {
    enabled: boolean;
    defaultValue?: unknown;
  };

  // Logging
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}

export class ErrorHandler {
  private options: ErrorHandlerOptions;
  private logger: Logger;

  constructor(options: Partial<ErrorHandlerOptions>, logger: Logger) {
    this.options = {
      retry: {
        enabled: true,
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
        retryableErrors: ['TIMEOUT', 'RATE_LIMIT', 'DEPENDENCY_ERROR'],
        ...options.retry
      },
      fallback: {
        enabled: false,
        ...options.fallback
      },
      logging: {
        enabled: true,
        level: 'error',
        ...options.logging
      }
    };
    this.logger = logger;
  }

  /**
   * Execute with error handling
   */
  async execute<T>(
    operation: () => Promise<T>,
    context: { tool: string; operation: string }
  ): Promise<T> {
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < this.options.retry.maxAttempts) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        attempt++;

        // Log the error
        if (this.options.logging.enabled) {
          this.logger.log(this.options.logging.level, `Tool error`, {
            tool: context.tool,
            operation: context.operation,
            attempt,
            error: error.message,
            code: error.code
          });
        }

        // Check if retryable
        const shouldRetry = this.shouldRetry(error, attempt);
        if (!shouldRetry) {
          break;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, error);
        await this.sleep(delay);
      }
    }

    // All retries exhausted - check fallback
    if (this.options.fallback.enabled && this.options.fallback.defaultValue !== undefined) {
      this.logger.warn('Using fallback value', {
        tool: context.tool,
        operation: context.operation
      });
      return this.options.fallback.defaultValue as T;
    }

    throw lastError;
  }

  private shouldRetry(error: any, attempt: number): boolean {
    if (!this.options.retry.enabled) return false;
    if (attempt >= this.options.retry.maxAttempts) return false;

    // Check if error is recoverable
    if (error instanceof ToolError) {
      if (!error.recoverable) return false;
      return this.options.retry.retryableErrors.includes(error.code);
    }

    // For unknown errors, check common patterns
    const errorCode = error.code || error.name;
    return this.options.retry.retryableErrors.includes(errorCode);
  }

  private calculateDelay(attempt: number, error: any): number {
    // If error specifies retry delay, use it
    if (error instanceof RateLimitError) {
      return error.retryAfterMs;
    }

    // Exponential backoff
    const delay = this.options.retry.baseDelayMs *
      Math.pow(this.options.retry.backoffMultiplier, attempt - 1);

    return Math.min(delay, this.options.retry.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 4.3 Result Pattern

```typescript
// src/errors/result.ts

/**
 * Result type for operations that can fail
 */
export type Result<T, E = ToolError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Helper functions for Result type
 */
export const Result = {
  ok<T>(data: T): Result<T, never> {
    return { success: true, data };
  },

  err<E>(error: E): Result<never, E> {
    return { success: false, error };
  },

  isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
    return result.success;
  },

  isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
    return !result.success;
  },

  map<T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> {
    if (result.success) {
      return { success: true, data: fn(result.data) };
    }
    return result;
  },

  mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    if (!result.success) {
      return { success: false, error: fn(result.error) };
    }
    return result;
  },

  unwrap<T, E>(result: Result<T, E>): T {
    if (result.success) {
      return result.data;
    }
    throw result.error;
  },

  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    if (result.success) {
      return result.data;
    }
    return defaultValue;
  },

  async fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
    try {
      const data = await promise;
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error };
    }
  }
};
```

---

## 5. Plugin Loading Mechanisms

### 5.1 Plugin Interface

```typescript
// src/plugins/types.ts

/**
 * A plugin is a package that exports one or more tools
 */
export interface ToolPlugin {
  // Plugin metadata
  name: string;
  version: string;
  description?: string;
  author?: string;

  // Tools provided by this plugin
  tools: Tool[];

  // Optional plugin lifecycle hooks
  onLoad?(context: ToolContext): Promise<void>;
  onUnload?(): Promise<void>;

  // Optional configuration schema
  configSchema?: object;
}

/**
 * Plugin manifest (plugin.json)
 */
export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  main: string;  // Entry point file
  tools: string[];  // List of tool names
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  capabilities?: Partial<ToolCapabilities>;
}
```

### 5.2 Plugin Loader

```typescript
// src/plugins/loader.ts

export class PluginLoader {
  private loadedPlugins: Map<string, ToolPlugin> = new Map();
  private context: ToolContext;

  constructor(context: ToolContext) {
    this.context = context;
  }

  /**
   * Load a plugin from a directory
   */
  async loadFromDirectory(pluginDir: string): Promise<LoadResult> {
    const manifestPath = path.join(pluginDir, 'plugin.json');

    // Read manifest
    if (!await this.context.app.fs.exists(manifestPath)) {
      return {
        success: false,
        error: `Plugin manifest not found: ${manifestPath}`
      };
    }

    const manifestContent = await this.context.app.fs.readFile(manifestPath, 'utf-8');
    const manifest: PluginManifest = JSON.parse(manifestContent);

    // Validate manifest
    const validation = this.validateManifest(manifest);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid manifest: ${validation.errors.join(', ')}`
      };
    }

    // Check dependencies
    const depCheck = await this.checkDependencies(manifest);
    if (!depCheck.satisfied) {
      return {
        success: false,
        error: `Missing dependencies: ${depCheck.missing.join(', ')}`
      };
    }

    // Load plugin module
    try {
      const entryPoint = path.join(pluginDir, manifest.main);
      const pluginModule = await import(entryPoint);
      const plugin: ToolPlugin = pluginModule.default || pluginModule;

      // Validate plugin
      if (!this.isValidPlugin(plugin)) {
        return {
          success: false,
          error: 'Plugin does not conform to ToolPlugin interface'
        };
      }

      // Call onLoad hook
      if (plugin.onLoad) {
        await plugin.onLoad(this.context);
      }

      // Store plugin
      this.loadedPlugins.set(manifest.name, plugin);

      return {
        success: true,
        plugin,
        tools: plugin.tools.map(t => t.name)
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Failed to load plugin: ${err.message}`
      };
    }
  }

  /**
   * Load a plugin from npm package
   */
  async loadFromNpm(packageName: string): Promise<LoadResult> {
    try {
      // Attempt to require the package
      const pluginModule = await import(packageName);
      const plugin: ToolPlugin = pluginModule.default || pluginModule;

      if (!this.isValidPlugin(plugin)) {
        return {
          success: false,
          error: 'Package does not export a valid ToolPlugin'
        };
      }

      if (plugin.onLoad) {
        await plugin.onLoad(this.context);
      }

      this.loadedPlugins.set(plugin.name, plugin);

      return {
        success: true,
        plugin,
        tools: plugin.tools.map(t => t.name)
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Failed to load npm package: ${err.message}`
      };
    }
  }

  /**
   * Unload a plugin
   */
  async unload(pluginName: string): Promise<boolean> {
    const plugin = this.loadedPlugins.get(pluginName);
    if (!plugin) return false;

    if (plugin.onUnload) {
      await plugin.onUnload();
    }

    this.loadedPlugins.delete(pluginName);
    return true;
  }

  /**
   * Get all tools from loaded plugins
   */
  getAllTools(): Tool[] {
    const tools: Tool[] = [];
    for (const plugin of this.loadedPlugins.values()) {
      tools.push(...plugin.tools);
    }
    return tools;
  }

  /**
   * Get tools from a specific plugin
   */
  getPluginTools(pluginName: string): Tool[] {
    const plugin = this.loadedPlugins.get(pluginName);
    return plugin?.tools ?? [];
  }

  private validateManifest(manifest: PluginManifest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!manifest.name) errors.push('name is required');
    if (!manifest.version) errors.push('version is required');
    if (!manifest.main) errors.push('main entry point is required');
    if (!manifest.tools || manifest.tools.length === 0) {
      errors.push('at least one tool must be declared');
    }

    return { valid: errors.length === 0, errors };
  }

  private async checkDependencies(manifest: PluginManifest): Promise<{
    satisfied: boolean;
    missing: string[];
  }> {
    const missing: string[] = [];

    if (manifest.dependencies) {
      for (const dep of Object.keys(manifest.dependencies)) {
        try {
          await import(dep);
        } catch {
          missing.push(dep);
        }
      }
    }

    return { satisfied: missing.length === 0, missing };
  }

  private isValidPlugin(obj: any): obj is ToolPlugin {
    return (
      typeof obj === 'object' &&
      typeof obj.name === 'string' &&
      typeof obj.version === 'string' &&
      Array.isArray(obj.tools) &&
      obj.tools.every((t: any) =>
        typeof t.name === 'string' &&
        typeof t.execute === 'function'
      )
    );
  }
}

export interface LoadResult {
  success: boolean;
  error?: string;
  plugin?: ToolPlugin;
  tools?: string[];
}
```

### 5.3 Plugin Manager

```typescript
// src/plugins/manager.ts

export class PluginManager {
  private loader: PluginLoader;
  private registry: ToolRegistry;
  private pluginPaths: string[];

  constructor(registry: ToolRegistry, context: ToolContext, pluginPaths: string[] = []) {
    this.loader = new PluginLoader(context);
    this.registry = registry;
    this.pluginPaths = pluginPaths;
  }

  /**
   * Discover and load plugins from configured paths
   */
  async discoverAndLoad(): Promise<DiscoveryResult> {
    const results: PluginLoadResult[] = [];

    for (const searchPath of this.pluginPaths) {
      // Check if it's a directory or npm scope
      if (searchPath.startsWith('@') || !searchPath.includes('/')) {
        // npm package
        const result = await this.loader.loadFromNpm(searchPath);
        results.push({
          source: searchPath,
          ...result
        });
      } else {
        // Directory - scan for plugins
        const pluginDirs = await this.scanForPlugins(searchPath);

        for (const pluginDir of pluginDirs) {
          const result = await this.loader.loadFromDirectory(pluginDir);
          results.push({
            source: pluginDir,
            ...result
          });
        }
      }
    }

    // Register tools from successful loads
    for (const result of results) {
      if (result.success && result.plugin) {
        for (const tool of result.plugin.tools) {
          try {
            this.registry.register(tool);
          } catch (err: any) {
            result.registrationErrors = result.registrationErrors || [];
            result.registrationErrors.push(`Failed to register ${tool.name}: ${err.message}`);
          }
        }
      }
    }

    return {
      totalFound: results.length,
      loaded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Hot-reload a plugin
   */
  async reloadPlugin(pluginName: string, newPath: string): Promise<LoadResult> {
    // Unload existing
    await this.loader.unload(pluginName);

    // Remove tools from registry
    const existingTools = this.loader.getPluginTools(pluginName);
    for (const tool of existingTools) {
      this.registry.unregister(tool.name);
    }

    // Load new version
    const result = await this.loader.loadFromDirectory(newPath);

    if (result.success && result.plugin) {
      for (const tool of result.plugin.tools) {
        this.registry.register(tool);
      }
    }

    return result;
  }

  private async scanForPlugins(searchPath: string): Promise<string[]> {
    const plugins: string[] = [];

    try {
      const entries = await fs.promises.readdir(searchPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const manifestPath = path.join(searchPath, entry.name, 'plugin.json');
          if (await this.fileExists(manifestPath)) {
            plugins.push(path.join(searchPath, entry.name));
          }
        }
      }
    } catch (err) {
      // Directory doesn't exist or not readable
    }

    return plugins;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

interface PluginLoadResult extends LoadResult {
  source: string;
  registrationErrors?: string[];
}

interface DiscoveryResult {
  totalFound: number;
  loaded: number;
  failed: number;
  results: PluginLoadResult[];
}
```

---

## 6. Versioning and Compatibility

### 6.1 Version Management

```typescript
// src/versioning/types.ts

/**
 * Semantic version components
 */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

/**
 * Version constraint for dependencies
 */
export type VersionConstraint =
  | { type: 'exact'; version: string }
  | { type: 'range'; min?: string; max?: string }
  | { type: 'compatible'; version: string }  // ^x.y.z
  | { type: 'approximate'; version: string }; // ~x.y.z

/**
 * Tool compatibility information
 */
export interface ToolCompatibility {
  // Minimum CodeCraft version required
  minCodeCraftVersion?: string;

  // Maximum CodeCraft version supported
  maxCodeCraftVersion?: string;

  // Node.js version requirements
  nodeVersion?: VersionConstraint;

  // Rust engine version requirements
  rustEngineVersion?: VersionConstraint;

  // Other tool dependencies
  toolDependencies?: Record<string, VersionConstraint>;

  // Breaking changes from previous versions
  breakingChanges?: {
    fromVersion: string;
    description: string;
    migrationGuide?: string;
  }[];
}
```

### 6.2 Compatibility Checker

```typescript
// src/versioning/checker.ts

export class CompatibilityChecker {
  private codeCraftVersion: string;
  private nodeVersion: string;
  private rustEngineVersion?: string;

  constructor(versions: {
    codeCraft: string;
    node: string;
    rustEngine?: string;
  }) {
    this.codeCraftVersion = versions.codeCraft;
    this.nodeVersion = versions.node;
    this.rustEngineVersion = versions.rustEngine;
  }

  /**
   * Check if a tool is compatible with current environment
   */
  checkToolCompatibility(tool: Tool): CompatibilityResult {
    const compatibility = tool.compatibility;
    if (!compatibility) {
      return { compatible: true, warnings: [], errors: [] };
    }

    const warnings: string[] = [];
    const errors: string[] = [];

    // Check CodeCraft version
    if (compatibility.minCodeCraftVersion) {
      if (!this.satisfiesConstraint(
        this.codeCraftVersion,
        { type: 'range', min: compatibility.minCodeCraftVersion }
      )) {
        errors.push(
          `Requires CodeCraft >= ${compatibility.minCodeCraftVersion}, ` +
          `current: ${this.codeCraftVersion}`
        );
      }
    }

    if (compatibility.maxCodeCraftVersion) {
      if (!this.satisfiesConstraint(
        this.codeCraftVersion,
        { type: 'range', max: compatibility.maxCodeCraftVersion }
      )) {
        warnings.push(
          `May not support CodeCraft > ${compatibility.maxCodeCraftVersion}, ` +
          `current: ${this.codeCraftVersion}`
        );
      }
    }

    // Check Node.js version
    if (compatibility.nodeVersion) {
      if (!this.satisfiesConstraint(this.nodeVersion, compatibility.nodeVersion)) {
        errors.push(
          `Node.js version ${this.nodeVersion} does not satisfy requirement`
        );
      }
    }

    // Check Rust engine
    if (compatibility.rustEngineVersion && this.rustEngineVersion) {
      if (!this.satisfiesConstraint(
        this.rustEngineVersion,
        compatibility.rustEngineVersion
      )) {
        errors.push(
          `Rust engine version ${this.rustEngineVersion} does not satisfy requirement`
        );
      }
    }

    return {
      compatible: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Check if a version satisfies a constraint
   */
  satisfiesConstraint(version: string, constraint: VersionConstraint): boolean {
    const parsed = this.parseVersion(version);

    switch (constraint.type) {
      case 'exact':
        return version === constraint.version;

      case 'range':
        if (constraint.min && this.compareVersions(version, constraint.min) < 0) {
          return false;
        }
        if (constraint.max && this.compareVersions(version, constraint.max) > 0) {
          return false;
        }
        return true;

      case 'compatible': // ^x.y.z - same major, >= minor.patch
        const compatible = this.parseVersion(constraint.version);
        return (
          parsed.major === compatible.major &&
          this.compareVersions(version, constraint.version) >= 0
        );

      case 'approximate': // ~x.y.z - same major.minor, >= patch
        const approx = this.parseVersion(constraint.version);
        return (
          parsed.major === approx.major &&
          parsed.minor === approx.minor &&
          parsed.patch >= approx.patch
        );

      default:
        return false;
    }
  }

  private parseVersion(version: string): SemanticVersion {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) {
      throw new Error(`Invalid version string: ${version}`);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4]
    };
  }

  private compareVersions(a: string, b: string): number {
    const va = this.parseVersion(a);
    const vb = this.parseVersion(b);

    if (va.major !== vb.major) return va.major - vb.major;
    if (va.minor !== vb.minor) return va.minor - vb.minor;
    return va.patch - vb.patch;
  }
}

export interface CompatibilityResult {
  compatible: boolean;
  warnings: string[];
  errors: string[];
}
```

---

## 7. Tool Composition Patterns

### 7.1 Composite Tool

```typescript
// src/composition/composite.ts

/**
 * A tool that combines multiple tools into a single operation
 */
export class CompositeTool implements Tool {
  name: string;
  description: string;
  version: string;
  parameters: ToolParameterSchema;
  capabilities: ToolCapabilities;

  private steps: CompositeStep[];
  private executor: ToolExecutor;

  constructor(config: CompositeToolConfig, executor: ToolExecutor) {
    this.name = config.name;
    this.description = config.description;
    this.version = config.version;
    this.parameters = config.parameters;
    this.steps = config.steps;
    this.executor = executor;

    // Aggregate capabilities from all steps
    this.capabilities = this.aggregateCapabilities(config.steps);
  }

  async execute(params: unknown, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const stepResults: StepResult[] = [];
    let currentData: any = params;

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];

      // Resolve step parameters
      const stepParams = this.resolveStepParams(step, currentData, stepResults);

      // Execute step
      const result = await this.executor.executeWithContext(
        step.tool,
        stepParams,
        context
      );

      stepResults.push({
        step: i,
        tool: step.tool,
        params: stepParams,
        result
      });

      // Check for failure
      if (!result.success) {
        if (step.continueOnError) {
          // Use default value and continue
          currentData = step.defaultValue;
        } else {
          // Abort composite execution
          return {
            success: false,
            error: {
              code: 'COMPOSITE_STEP_FAILED',
              message: `Step ${i} (${step.tool}) failed: ${result.error?.message}`,
              details: { stepResults }
            },
            metadata: {
              executionTimeMs: Date.now() - startTime
            }
          };
        }
      } else {
        // Extract output for next step
        currentData = step.outputMapping
          ? this.extractOutput(result.data, step.outputMapping)
          : result.data;
      }

      // Check condition for next step
      if (step.condition && !this.evaluateCondition(step.condition, currentData)) {
        break; // Exit early
      }
    }

    return {
      success: true,
      data: currentData,
      metadata: {
        executionTimeMs: Date.now() - startTime,
        steps: stepResults
      }
    };
  }

  private resolveStepParams(
    step: CompositeStep,
    currentData: any,
    previousResults: StepResult[]
  ): any {
    if (typeof step.params === 'function') {
      return step.params(currentData, previousResults);
    }

    if (step.params === 'inherit') {
      return currentData;
    }

    // Template resolution
    return this.resolveTemplates(step.params, {
      input: currentData,
      results: previousResults
    });
  }

  private resolveTemplates(obj: any, context: { input: any; results: StepResult[] }): any {
    if (typeof obj === 'string') {
      // Simple template: {{input.path}} or {{results[0].data}}
      return obj.replace(/\{\{(.+?)\}\}/g, (_, expr) => {
        return this.evaluateExpression(expr, context);
      });
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveTemplates(item, context));
    }

    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.resolveTemplates(value, context);
      }
      return result;
    }

    return obj;
  }

  private evaluateExpression(expr: string, context: any): any {
    // Simple expression evaluator (would use a proper parser in production)
    const parts = expr.trim().split('.');
    let value = context;

    for (const part of parts) {
      const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
      if (arrayMatch) {
        value = value[arrayMatch[1]][parseInt(arrayMatch[2], 10)];
      } else {
        value = value[part];
      }
    }

    return value;
  }

  private extractOutput(data: any, mapping: string | ((data: any) => any)): any {
    if (typeof mapping === 'function') {
      return mapping(data);
    }

    // JSONPath-like extraction
    return this.evaluateExpression(mapping, { data });
  }

  private evaluateCondition(condition: string, data: any): boolean {
    // Simple condition evaluation
    // Would use a proper expression parser in production
    return Boolean(data);
  }

  private aggregateCapabilities(steps: CompositeStep[]): ToolCapabilities {
    return {
      writesFiles: steps.some(s => s.capabilities?.writesFiles),
      executesCommands: steps.some(s => s.capabilities?.executesCommands),
      requiresRustEngine: steps.some(s => s.capabilities?.requiresRustEngine),
      accessesNetwork: steps.some(s => s.capabilities?.accessesNetwork),
      idempotent: steps.every(s => s.capabilities?.idempotent ?? true),
      retryable: steps.every(s => s.capabilities?.retryable ?? true)
    };
  }
}

export interface CompositeToolConfig {
  name: string;
  description: string;
  version: string;
  parameters: ToolParameterSchema;
  steps: CompositeStep[];
}

export interface CompositeStep {
  tool: string;
  params: any | 'inherit' | ((input: any, results: StepResult[]) => any);
  outputMapping?: string | ((data: any) => any);
  continueOnError?: boolean;
  defaultValue?: any;
  condition?: string;
  capabilities?: Partial<ToolCapabilities>;
}

interface StepResult {
  step: number;
  tool: string;
  params: any;
  result: ToolResult;
}
```

### 7.2 Tool Pipelines

```typescript
// src/composition/pipeline.ts

/**
 * Fluent API for building tool pipelines
 */
export class ToolPipeline {
  private steps: PipelineStep[] = [];
  private executor: ToolExecutor;

  constructor(executor: ToolExecutor) {
    this.executor = executor;
  }

  /**
   * Add a tool to the pipeline
   */
  pipe(tool: string, params?: any | ParamResolver): ToolPipeline {
    this.steps.push({ tool, params: params ?? 'inherit' });
    return this;
  }

  /**
   * Add a transformation step
   */
  transform(fn: (data: any) => any): ToolPipeline {
    this.steps.push({ transform: fn });
    return this;
  }

  /**
   * Add a filter step
   */
  filter(predicate: (data: any) => boolean): ToolPipeline {
    this.steps.push({ filter: predicate });
    return this;
  }

  /**
   * Add a conditional branch
   */
  branch(condition: (data: any) => boolean, ifTrue: ToolPipeline, ifFalse?: ToolPipeline): ToolPipeline {
    this.steps.push({ branch: { condition, ifTrue, ifFalse } });
    return this;
  }

  /**
   * Add error handling
   */
  catch(handler: (error: ToolError, data: any) => any): ToolPipeline {
    this.steps.push({ errorHandler: handler });
    return this;
  }

  /**
   * Execute the pipeline
   */
  async execute(initialData: any, context: ToolContext): Promise<PipelineResult> {
    let data = initialData;
    const trace: PipelineTraceEntry[] = [];
    let errorHandler: ((error: ToolError, data: any) => any) | undefined;

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      const startTime = Date.now();

      try {
        if ('tool' in step) {
          // Tool execution
          const params = this.resolveParams(step.params, data);
          const result = await this.executor.executeWithContext(step.tool, params, context);

          trace.push({
            type: 'tool',
            tool: step.tool,
            params,
            result,
            durationMs: Date.now() - startTime
          });

          if (!result.success) {
            if (errorHandler) {
              data = errorHandler(result.error as ToolError, data);
            } else {
              return { success: false, error: result.error, trace };
            }
          } else {
            data = result.data;
          }
        } else if ('transform' in step) {
          // Transformation
          data = step.transform(data);
          trace.push({
            type: 'transform',
            durationMs: Date.now() - startTime
          });
        } else if ('filter' in step) {
          // Filter
          if (!step.filter(data)) {
            return { success: true, data, trace, filtered: true };
          }
          trace.push({
            type: 'filter',
            passed: true,
            durationMs: Date.now() - startTime
          });
        } else if ('branch' in step) {
          // Conditional branch
          const branchPipeline = step.branch.condition(data)
            ? step.branch.ifTrue
            : step.branch.ifFalse;

          if (branchPipeline) {
            const branchResult = await branchPipeline.execute(data, context);
            if (!branchResult.success) {
              return branchResult;
            }
            data = branchResult.data;
          }

          trace.push({
            type: 'branch',
            taken: step.branch.condition(data) ? 'true' : 'false',
            durationMs: Date.now() - startTime
          });
        } else if ('errorHandler' in step) {
          // Set error handler for subsequent steps
          errorHandler = step.errorHandler;
        }
      } catch (err: any) {
        if (errorHandler) {
          data = errorHandler(err, data);
        } else {
          return {
            success: false,
            error: { code: 'PIPELINE_ERROR', message: err.message },
            trace
          };
        }
      }
    }

    return { success: true, data, trace };
  }

  private resolveParams(params: any | ParamResolver, data: any): any {
    if (params === 'inherit') return data;
    if (typeof params === 'function') return params(data);
    return params;
  }
}

type ParamResolver = (data: any) => any;

interface PipelineStep {
  tool?: string;
  params?: any | ParamResolver;
  transform?: (data: any) => any;
  filter?: (data: any) => boolean;
  branch?: {
    condition: (data: any) => boolean;
    ifTrue: ToolPipeline;
    ifFalse?: ToolPipeline;
  };
  errorHandler?: (error: ToolError, data: any) => any;
}

interface PipelineResult {
  success: boolean;
  data?: any;
  error?: any;
  trace: PipelineTraceEntry[];
  filtered?: boolean;
}

interface PipelineTraceEntry {
  type: 'tool' | 'transform' | 'filter' | 'branch';
  tool?: string;
  params?: any;
  result?: ToolResult;
  passed?: boolean;
  taken?: 'true' | 'false';
  durationMs: number;
}
```

---

## 8. Configuration Management

### 8.1 Configuration Schema

```typescript
// src/config/schema.ts

export interface CodeCraftConfig {
  // Tool configuration
  tools: {
    // Directories to search for plugins
    pluginPaths: string[];

    // Tool-specific configuration
    toolConfig: Record<string, ToolSpecificConfig>;

    // Default timeout for tool execution
    defaultTimeoutMs: number;

    // Enable/disable specific tools
    enabled: Record<string, boolean>;

    // Capability overrides
    capabilityOverrides: Record<string, Partial<ToolCapabilities>>;
  };

  // Security settings
  security: {
    // Global security level
    level: 'strict' | 'standard' | 'permissive';

    // Require confirmation for destructive operations
    confirmDestructive: boolean;

    // Audit logging
    auditLog: boolean;

    // Sandbox settings
    sandbox: {
      enabled: boolean;
      tempDir?: string;
    };
  };

  // Performance settings
  performance: {
    // Max concurrent tool executions
    maxConcurrency: number;

    // Cache settings
    cache: {
      enabled: boolean;
      ttlMs: number;
      maxSize: number;
    };
  };

  // Logging settings
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destination: 'console' | 'file';
    filePath?: string;
  };

  // Rust engine settings
  rustEngine: {
    path?: string;
    fallbackBehavior: 'error' | 'degrade' | 'mock';
  };
}

export interface ToolSpecificConfig {
  // Override default timeout
  timeoutMs?: number;

  // Override capabilities
  capabilities?: Partial<ToolCapabilities>;

  // Custom options for the tool
  options?: Record<string, unknown>;
}
```

### 8.2 Configuration Loader

```typescript
// src/config/loader.ts

export class ConfigLoader {
  private defaults: CodeCraftConfig;

  constructor() {
    this.defaults = this.getDefaults();
  }

  /**
   * Load configuration from multiple sources (in order of priority)
   */
  async load(): Promise<CodeCraftConfig> {
    const sources: Partial<CodeCraftConfig>[] = [];

    // 1. Environment variables
    sources.push(this.loadFromEnv());

    // 2. Project config (.codecraft.json or codecraft.config.js)
    const projectConfig = await this.loadFromProject();
    if (projectConfig) sources.push(projectConfig);

    // 3. User config (~/.codecraft/config.json)
    const userConfig = await this.loadFromUser();
    if (userConfig) sources.push(userConfig);

    // 4. Defaults
    sources.push(this.defaults);

    // Merge all sources (first takes precedence)
    return this.merge(sources);
  }

  private loadFromEnv(): Partial<CodeCraftConfig> {
    const config: Partial<CodeCraftConfig> = {};

    if (process.env.CODECRAFT_LOG_LEVEL) {
      config.logging = {
        ...config.logging,
        level: process.env.CODECRAFT_LOG_LEVEL as any
      };
    }

    if (process.env.CODECRAFT_SECURITY_LEVEL) {
      config.security = {
        ...config.security,
        level: process.env.CODECRAFT_SECURITY_LEVEL as any
      };
    }

    if (process.env.CODECRAFT_RUST_ENGINE_PATH) {
      config.rustEngine = {
        ...config.rustEngine,
        path: process.env.CODECRAFT_RUST_ENGINE_PATH
      };
    }

    if (process.env.CODECRAFT_PLUGIN_PATHS) {
      config.tools = {
        ...config.tools,
        pluginPaths: process.env.CODECRAFT_PLUGIN_PATHS.split(':')
      };
    }

    return config;
  }

  private async loadFromProject(): Promise<Partial<CodeCraftConfig> | null> {
    const configFiles = [
      '.codecraft.json',
      'codecraft.config.json',
      'codecraft.config.js'
    ];

    for (const file of configFiles) {
      const filePath = path.join(process.cwd(), file);
      if (await this.fileExists(filePath)) {
        if (file.endsWith('.js')) {
          return (await import(filePath)).default;
        } else {
          const content = await fs.promises.readFile(filePath, 'utf-8');
          return JSON.parse(content);
        }
      }
    }

    return null;
  }

  private async loadFromUser(): Promise<Partial<CodeCraftConfig> | null> {
    const configPath = path.join(os.homedir(), '.codecraft', 'config.json');

    if (await this.fileExists(configPath)) {
      const content = await fs.promises.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    }

    return null;
  }

  private merge(sources: Partial<CodeCraftConfig>[]): CodeCraftConfig {
    // Deep merge with first source taking precedence
    let result = { ...this.defaults };

    for (const source of sources.reverse()) {
      result = this.deepMerge(result, source);
    }

    return result;
  }

  private deepMerge(target: any, source: any): any {
    if (source === undefined) return target;
    if (typeof source !== 'object' || source === null) return source;
    if (Array.isArray(source)) return source;

    const result = { ...target };
    for (const key of Object.keys(source)) {
      result[key] = this.deepMerge(target[key], source[key]);
    }
    return result;
  }

  private getDefaults(): CodeCraftConfig {
    return {
      tools: {
        pluginPaths: [],
        toolConfig: {},
        defaultTimeoutMs: 30000,
        enabled: {},
        capabilityOverrides: {}
      },
      security: {
        level: 'standard',
        confirmDestructive: true,
        auditLog: false,
        sandbox: {
          enabled: false
        }
      },
      performance: {
        maxConcurrency: 5,
        cache: {
          enabled: true,
          ttlMs: 60000,
          maxSize: 100
        }
      },
      logging: {
        level: 'info',
        format: 'text',
        destination: 'console'
      },
      rustEngine: {
        fallbackBehavior: 'degrade'
      }
    };
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
```

---

## 9. Observability and Debugging

### 9.1 Tracing

```typescript
// src/observability/tracing.ts

export interface Span {
  id: string;
  parentId?: string;
  traceId: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  attributes: Record<string, unknown>;
  events: SpanEvent[];
  status: 'ok' | 'error';
}

export interface SpanEvent {
  name: string;
  timestamp: Date;
  attributes?: Record<string, unknown>;
}

export class Tracer {
  private spans: Map<string, Span> = new Map();
  private currentSpan?: Span;

  /**
   * Start a new span
   */
  startSpan(name: string, attributes?: Record<string, unknown>): Span {
    const span: Span = {
      id: generateUUID(),
      parentId: this.currentSpan?.id,
      traceId: this.currentSpan?.traceId ?? generateUUID(),
      name,
      startTime: new Date(),
      attributes: attributes ?? {},
      events: [],
      status: 'ok'
    };

    this.spans.set(span.id, span);
    this.currentSpan = span;

    return span;
  }

  /**
   * End a span
   */
  endSpan(span: Span, status: 'ok' | 'error' = 'ok'): void {
    span.endTime = new Date();
    span.duration = span.endTime.getTime() - span.startTime.getTime();
    span.status = status;

    // Restore parent span
    if (span.parentId) {
      this.currentSpan = this.spans.get(span.parentId);
    } else {
      this.currentSpan = undefined;
    }
  }

  /**
   * Add an event to the current span
   */
  addEvent(name: string, attributes?: Record<string, unknown>): void {
    if (this.currentSpan) {
      this.currentSpan.events.push({
        name,
        timestamp: new Date(),
        attributes
      });
    }
  }

  /**
   * Set attribute on current span
   */
  setAttribute(key: string, value: unknown): void {
    if (this.currentSpan) {
      this.currentSpan.attributes[key] = value;
    }
  }

  /**
   * Get trace data for export
   */
  getTrace(traceId: string): Span[] {
    return Array.from(this.spans.values())
      .filter(s => s.traceId === traceId);
  }

  /**
   * Execute function within a span
   */
  async trace<T>(
    name: string,
    fn: () => Promise<T>,
    attributes?: Record<string, unknown>
  ): Promise<T> {
    const span = this.startSpan(name, attributes);

    try {
      const result = await fn();
      this.endSpan(span, 'ok');
      return result;
    } catch (err) {
      this.addEvent('error', { message: (err as Error).message });
      this.endSpan(span, 'error');
      throw err;
    }
  }
}

/**
 * Tool executor with tracing
 */
export class TracingToolExecutor implements ToolExecutor {
  private executor: ToolExecutor;
  private tracer: Tracer;

  constructor(executor: ToolExecutor, tracer: Tracer) {
    this.executor = executor;
    this.tracer = tracer;
  }

  async execute(name: string, params: unknown, options?: ExecutionOptions): Promise<ToolResult> {
    return this.tracer.trace(
      `tool:${name}`,
      () => this.executor.execute(name, params, options),
      { tool: name, params }
    );
  }

  async executeWithContext(
    name: string,
    params: unknown,
    context: ToolContext,
    options?: ExecutionOptions
  ): Promise<ToolResult> {
    return this.tracer.trace(
      `tool:${name}`,
      () => this.executor.executeWithContext(name, params, context, options),
      {
        tool: name,
        params,
        sessionId: context.session.sessionId,
        requestId: context.request.requestId
      }
    );
  }

  validate(name: string, params: unknown): { valid: boolean; errors?: string[] } {
    return this.executor.validate(name, params);
  }

  getStats() {
    return this.executor.getStats();
  }
}
```

### 9.2 Debug Mode

```typescript
// src/observability/debug.ts

export interface DebugOptions {
  // Log all tool calls
  logCalls: boolean;

  // Log tool results
  logResults: boolean;

  // Log context state
  logContext: boolean;

  // Break on errors
  breakOnError: boolean;

  // Filter by tool names
  toolFilter?: string[];

  // Custom debug handler
  handler?: DebugHandler;
}

export type DebugHandler = (event: DebugEvent) => void;

export interface DebugEvent {
  type: 'call' | 'result' | 'error' | 'context';
  timestamp: Date;
  tool?: string;
  params?: unknown;
  result?: ToolResult;
  error?: Error;
  context?: Partial<ToolContext>;
}

export class DebugToolExecutor implements ToolExecutor {
  private executor: ToolExecutor;
  private options: DebugOptions;

  constructor(executor: ToolExecutor, options: DebugOptions) {
    this.executor = executor;
    this.options = options;
  }

  async execute(name: string, params: unknown, options?: ExecutionOptions): Promise<ToolResult> {
    // Check filter
    if (this.options.toolFilter && !this.options.toolFilter.includes(name)) {
      return this.executor.execute(name, params, options);
    }

    // Log call
    if (this.options.logCalls) {
      this.emit({
        type: 'call',
        timestamp: new Date(),
        tool: name,
        params
      });
    }

    try {
      const result = await this.executor.execute(name, params, options);

      // Log result
      if (this.options.logResults) {
        this.emit({
          type: 'result',
          timestamp: new Date(),
          tool: name,
          result
        });
      }

      return result;
    } catch (err) {
      // Log error
      this.emit({
        type: 'error',
        timestamp: new Date(),
        tool: name,
        error: err as Error
      });

      if (this.options.breakOnError) {
        debugger; // Break into debugger
      }

      throw err;
    }
  }

  async executeWithContext(
    name: string,
    params: unknown,
    context: ToolContext,
    options?: ExecutionOptions
  ): Promise<ToolResult> {
    if (this.options.logContext) {
      this.emit({
        type: 'context',
        timestamp: new Date(),
        tool: name,
        context: {
          session: context.session,
          request: context.request
        }
      });
    }

    // Delegate to execute
    return this.execute(name, params, options);
  }

  validate(name: string, params: unknown): { valid: boolean; errors?: string[] } {
    return this.executor.validate(name, params);
  }

  getStats() {
    return this.executor.getStats();
  }

  private emit(event: DebugEvent): void {
    if (this.options.handler) {
      this.options.handler(event);
    } else {
      // Default: log to console
      console.log('[DEBUG]', JSON.stringify(event, null, 2));
    }
  }
}
```

---

## 10. Performance Optimization

### 10.1 Caching

```typescript
// src/performance/cache.ts

export interface CacheEntry<T> {
  value: T;
  createdAt: Date;
  expiresAt: Date;
  hits: number;
}

export class ToolCache {
  private cache: Map<string, CacheEntry<ToolResult>> = new Map();
  private config: {
    ttlMs: number;
    maxSize: number;
  };

  constructor(config: { ttlMs: number; maxSize: number }) {
    this.config = config;
  }

  /**
   * Generate cache key from tool name and params
   */
  private getKey(tool: string, params: unknown): string {
    return `${tool}:${JSON.stringify(params)}`;
  }

  /**
   * Get cached result
   */
  get(tool: string, params: unknown): ToolResult | undefined {
    const key = this.getKey(tool, params);
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    // Check expiration
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    entry.hits++;
    return entry.value;
  }

  /**
   * Store result in cache
   */
  set(tool: string, params: unknown, result: ToolResult): void {
    // Evict if necessary
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const key = this.getKey(tool, params);
    const now = new Date();

    this.cache.set(key, {
      value: result,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.config.ttlMs),
      hits: 0
    });
  }

  /**
   * Check if tool result is cacheable
   */
  isCacheable(tool: Tool): boolean {
    // Only cache idempotent, read-only tools
    return (
      tool.capabilities.idempotent &&
      !tool.capabilities.writesFiles &&
      !tool.capabilities.executesCommands
    );
  }

  /**
   * Invalidate cache for a tool
   */
  invalidate(tool?: string): void {
    if (tool) {
      // Invalidate specific tool
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${tool}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let totalHits = 0;
    let totalEntries = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalEntries++;
    }

    return {
      size: totalEntries,
      maxSize: this.config.maxSize,
      totalHits,
      hitRate: totalEntries > 0 ? totalHits / totalEntries : 0
    };
  }

  private evictLRU(): void {
    // Find entry with fewest hits (simple LRU approximation)
    let minHits = Infinity;
    let minKey: string | undefined;

    for (const [key, entry] of this.cache) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        minKey = key;
      }
    }

    if (minKey) {
      this.cache.delete(minKey);
    }
  }
}

export interface CacheStats {
  size: number;
  maxSize: number;
  totalHits: number;
  hitRate: number;
}

/**
 * Caching tool executor
 */
export class CachingToolExecutor implements ToolExecutor {
  private executor: ToolExecutor;
  private cache: ToolCache;
  private registry: ToolRegistry;

  constructor(executor: ToolExecutor, registry: ToolRegistry, cache: ToolCache) {
    this.executor = executor;
    this.cache = cache;
    this.registry = registry;
  }

  async execute(name: string, params: unknown, options?: ExecutionOptions): Promise<ToolResult> {
    const tool = this.registry.get(name);

    // Check if cacheable
    if (tool && this.cache.isCacheable(tool)) {
      const cached = this.cache.get(name, params);
      if (cached) {
        return { ...cached, metadata: { ...cached.metadata, cached: true } };
      }
    }

    // Execute and cache
    const result = await this.executor.execute(name, params, options);

    if (tool && result.success && this.cache.isCacheable(tool)) {
      this.cache.set(name, params, result);
    }

    return result;
  }

  async executeWithContext(
    name: string,
    params: unknown,
    context: ToolContext,
    options?: ExecutionOptions
  ): Promise<ToolResult> {
    // Same logic with context
    return this.execute(name, params, options);
  }

  validate(name: string, params: unknown): { valid: boolean; errors?: string[] } {
    return this.executor.validate(name, params);
  }

  getStats() {
    return {
      ...this.executor.getStats(),
      cache: this.cache.getStats()
    };
  }
}
```

### 10.2 Batching and Concurrency

```typescript
// src/performance/batch.ts

export interface BatchOptions {
  maxBatchSize: number;
  maxWaitMs: number;
  concurrency: number;
}

export class BatchingToolExecutor {
  private executor: ToolExecutor;
  private options: BatchOptions;
  private queue: Map<string, BatchItem[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(executor: ToolExecutor, options: BatchOptions) {
    this.executor = executor;
    this.options = options;
  }

  /**
   * Execute with batching (for tools that support it)
   */
  async execute(
    name: string,
    params: unknown,
    batchKey?: string
  ): Promise<ToolResult> {
    if (!batchKey) {
      // No batching - execute immediately
      return this.executor.execute(name, params);
    }

    return new Promise((resolve, reject) => {
      const item: BatchItem = { name, params, resolve, reject };

      // Add to queue
      const key = `${name}:${batchKey}`;
      if (!this.queue.has(key)) {
        this.queue.set(key, []);
      }
      this.queue.get(key)!.push(item);

      // Check if batch is full
      if (this.queue.get(key)!.length >= this.options.maxBatchSize) {
        this.flushBatch(key);
      } else if (!this.timers.has(key)) {
        // Start timer
        this.timers.set(key, setTimeout(() => {
          this.flushBatch(key);
        }, this.options.maxWaitMs));
      }
    });
  }

  private async flushBatch(key: string): Promise<void> {
    const items = this.queue.get(key) || [];
    this.queue.delete(key);

    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }

    if (items.length === 0) return;

    // Execute all items with concurrency limit
    const semaphore = new Semaphore(this.options.concurrency);

    await Promise.all(items.map(async item => {
      await semaphore.acquire();
      try {
        const result = await this.executor.execute(item.name, item.params);
        item.resolve(result);
      } catch (err) {
        item.reject(err);
      } finally {
        semaphore.release();
      }
    }));
  }
}

interface BatchItem {
  name: string;
  params: unknown;
  resolve: (result: ToolResult) => void;
  reject: (error: any) => void;
}

class Semaphore {
  private permits: number;
  private waiting: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise(resolve => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      next();
    } else {
      this.permits++;
    }
  }
}
```

---

## Summary

This deep dive covered:

1. **Tool Context**: Layered context design with application, session, and request levels
2. **Security Model**: Capability-based permissions with path restrictions and command filtering
3. **Lifecycle Management**: State machine for tool initialization, execution, and shutdown
4. **Error Handling**: Typed errors, retry logic, and result pattern
5. **Plugin System**: Loading plugins from directories and npm packages
6. **Versioning**: Semantic versioning with compatibility checking
7. **Composition**: Composite tools and fluent pipeline API
8. **Configuration**: Multi-source config loading with defaults
9. **Observability**: Tracing and debug mode for development
10. **Performance**: Caching, batching, and concurrency control

These patterns work together to create a robust, testable, and extensible tool system.

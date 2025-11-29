// src/analysis/index.ts
// Analysis utilities for /init command and future code intelligence features

export { detectProjectType } from './detect-project-type.js';
export type { ProjectTypeInfo } from './detect-project-type.js';
export { extractConventions } from './extract-conventions.js';
export type { CodeConventions } from './extract-conventions.js';
export { getProjectOverview } from './get-project-overview.js';
export type { ProjectOverview } from './get-project-overview.js';
export { buildDependencyGraph } from './build-dependency-graph.js';
export type { DependencyGraph } from './build-dependency-graph.js';

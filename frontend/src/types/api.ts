export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface ProjectSettings {
  autoSave: boolean;
  fontSize: number;
}

export interface Project {
  _id: string;
  ownerId: string;
  name: string;
  description: string;
  language: 'python' | 'c' | 'java';
  theme: string;
  rootPath: string;
  settings: ProjectSettings;
  lastOpenedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
  size?: number;
}

export interface SearchMatch {
  path: string;
  matches: string[];
}

export interface FilePayload {
  path: string;
  content: string;
}

export interface ExecutionRecord {
  _id: string;
  projectId: string;
  userId: string;
  language: 'python' | 'c' | 'java';
  entryFile: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  status: 'success' | 'error' | 'timeout';
  createdAt: string;
}

import { api } from './client';
import type { ExecutionRecord, Project, SearchMatch, TreeNode } from '../types/api';

export async function listProjectsRequest(): Promise<Project[]> {
  const response = await api.get<{ projects: Project[] }>('/projects');
  return response.data.projects;
}

export async function createProjectRequest(payload: { name: string; description?: string; language?: 'python' | 'c' | 'java' }): Promise<Project> {
  const response = await api.post<{ project: Project }>('/projects', payload);
  return response.data.project;
}

export async function getProjectRequest(projectId: string): Promise<Project> {
  const response = await api.get<{ project: Project }>(`/projects/${projectId}`);
  return response.data.project;
}

export async function updateProjectRequest(projectId: string, payload: Partial<Pick<Project, 'name' | 'description' | 'language' | 'theme'>> & { settings?: Partial<Project['settings']> }): Promise<Project> {
  const response = await api.put<{ project: Project }>(`/projects/${projectId}`, payload);
  return response.data.project;
}

export async function deleteProjectRequest(projectId: string): Promise<void> {
  await api.delete(`/projects/${projectId}`);
}

export async function treeRequest(projectId: string): Promise<TreeNode[]> {
  const response = await api.get<{ tree: TreeNode[] }>(`/projects/${projectId}/tree`);
  return response.data.tree;
}

export async function readFileRequest(projectId: string, filePath: string): Promise<{ path: string; content: string }> {
  const response = await api.get<{ file: { path: string; content: string } }>(`/projects/${projectId}/files/${encodeURIComponent(filePath)}`);
  return response.data.file;
}

export async function saveFileRequest(projectId: string, filePath: string, content: string): Promise<{ path: string; content: string }> {
  const response = await api.put<{ file: { path: string; content: string } }>(`/projects/${projectId}/files/${encodeURIComponent(filePath)}`, { content });
  return response.data.file;
}

export async function createFolderRequest(projectId: string, path: string): Promise<void> {
  await api.post(`/projects/${projectId}/folders`, { path });
}

export async function renameItemRequest(projectId: string, fromPath: string, toPath: string): Promise<void> {
  await api.patch(`/projects/${projectId}/rename`, { fromPath, toPath });
}

export async function deleteItemRequest(projectId: string, filePath: string): Promise<void> {
  await api.delete(`/projects/${projectId}/files/${encodeURIComponent(filePath)}`);
}

export async function searchProjectRequest(projectId: string, query: string): Promise<SearchMatch[]> {
  const response = await api.get<{ matches: SearchMatch[] }>(`/projects/${projectId}/search`, { params: { query } });
  return response.data.matches;
}

export async function uploadFilesRequest(projectId: string, files: File[]): Promise<string[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const response = await api.post<{ uploaded: string[] }>(`/projects/${projectId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data.uploaded;
}

export async function executionHistoryRequest(projectId: string): Promise<ExecutionRecord[]> {
  const response = await api.get<{ executions: ExecutionRecord[] }>(`/executions/${projectId}`);
  return response.data.executions;
}

export async function runProjectRequest(projectId: string, entryFile: string, language?: 'python' | 'c' | 'java'): Promise<{ execution: ExecutionRecord; result: { stdout: string; stderr: string; exitCode: number; timedOut: boolean; command: string; workingDirectory: string } }> {
  const response = await api.post<{ execution: ExecutionRecord; result: { stdout: string; stderr: string; exitCode: number; timedOut: boolean; command: string; workingDirectory: string } }>(`/executions/${projectId}`, {
    entryFile,
    language
  });
  return response.data;
}

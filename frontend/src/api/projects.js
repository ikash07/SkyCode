import { api } from './client';

export async function listProjectsRequest() {
  const response = await api.get('/projects');
  return response.data.projects;
}

export async function createProjectRequest(payload) {
  const response = await api.post('/projects', payload);
  return response.data.project;
}

export async function getProjectRequest(projectId) {
  const response = await api.get(`/projects/${projectId}`);
  return response.data.project;
}

export async function updateProjectRequest(projectId, payload) {
  const response = await api.put(`/projects/${projectId}`, payload);
  return response.data.project;
}

export async function deleteProjectRequest(projectId) {
  await api.delete(`/projects/${projectId}`);
}

export async function treeRequest(projectId) {
  const response = await api.get(`/projects/${projectId}/tree`);
  return response.data.tree;
}

export async function readFileRequest(projectId, filePath) {
  const response = await api.get(`/projects/${projectId}/files/${encodeURIComponent(filePath)}`);
  return response.data.file;
}

export async function saveFileRequest(projectId, filePath, content) {
  const response = await api.put(`/projects/${projectId}/files/${encodeURIComponent(filePath)}`, { content });
  return response.data.file;
}

export async function createFolderRequest(projectId, path) {
  await api.post(`/projects/${projectId}/folders`, { path });
}

export async function renameItemRequest(projectId, fromPath, toPath) {
  await api.patch(`/projects/${projectId}/rename`, { fromPath, toPath });
}

export async function deleteItemRequest(projectId, filePath) {
  await api.delete(`/projects/${projectId}/files/${encodeURIComponent(filePath)}`);
}

export async function searchProjectRequest(projectId, query) {
  const response = await api.get(`/projects/${projectId}/search`, { params: { query } });
  return response.data.matches;
}

export async function uploadFilesRequest(projectId, files) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const response = await api.post(`/projects/${projectId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data.uploaded;
}

export async function executionHistoryRequest(projectId) {
  const response = await api.get(`/executions/${projectId}`);
  return response.data.executions;
}

export async function runProjectRequest(projectId, entryFile, language, stdin = '') {
  const response = await api.post(`/executions/${projectId}`, {
    entryFile,
    language,
    stdin
  });
  return response.data;
}

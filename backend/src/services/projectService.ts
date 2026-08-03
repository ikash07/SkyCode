import fs from 'node:fs/promises';
import path from 'node:path';
import { Types } from 'mongoose';
import { Project } from '../models/Project.js';
import { FileEntry } from '../models/File.js';
import { AppError } from '../utils/appError.js';
import { ensureDir, exists, removeIfExists, writeTextFile, readTextFile, assertPathWithin } from '../utils/fs.js';
import { projectsRoot } from '../utils/runtimePaths.js';
import { createTree } from '../utils/tree.js';
import { normalizeRelativePath, getFileName, getPathParent } from '../utils/path.js';

export interface ProjectInput {
  name: string;
  description?: string;
  language?: 'python' | 'c' | 'java';
}

export interface FileInput {
  projectId: string;
  relativePath: string;
  content?: string;
}

async function getOwnedProject(projectId: string, userId: string) {
  const project = await Project.findOne({ _id: projectId, ownerId: userId });
  if (!project) {
    throw new AppError('Project not found', 404);
  }
  return project;
}

export async function createProject(ownerId: string, input: ProjectInput) {
  const projectId = new Types.ObjectId().toHexString();
  const rootPath = path.join(projectsRoot, projectId);
  await ensureDir(rootPath);

  const project = await Project.create({
    _id: projectId,
    ownerId,
    name: input.name.trim(),
    description: input.description?.trim() || '',
    language: input.language || 'python',
    rootPath,
    settings: { autoSave: true, fontSize: 14 }
  });

  return project;
}

export async function listProjects(ownerId: string) {
  return Project.find({ ownerId }).sort({ updatedAt: -1 }).lean();
}

export async function getProjectDetails(projectId: string, userId: string) {
  return getOwnedProject(projectId, userId);
}

export async function updateProject(projectId: string, userId: string, updates: Partial<ProjectInput & { theme: string; settings: { autoSave: boolean; fontSize: number } }>) {
  const project = await getOwnedProject(projectId, userId);
  if (updates.name !== undefined) project.name = updates.name.trim();
  if (updates.description !== undefined) project.description = updates.description.trim();
  if (updates.language !== undefined) project.language = updates.language;
  if (updates.theme !== undefined) project.theme = updates.theme;
  if (updates.settings !== undefined) project.settings = { ...project.settings, ...updates.settings };
  project.lastOpenedAt = new Date();
  await project.save();
  return project;
}

export async function deleteProject(projectId: string, userId: string): Promise<void> {
  const project = await getOwnedProject(projectId, userId);
  await Promise.all([
    FileEntry.deleteMany({ projectId: project._id }),
    Project.deleteOne({ _id: project._id }),
    removeIfExists(project.rootPath)
  ]);
}

export async function listTree(projectId: string, userId: string) {
  const project = await getOwnedProject(projectId, userId);
  return createTree(project.rootPath);
}

export async function readProjectFile(projectId: string, userId: string, relativePath: string) {
  const project = await getOwnedProject(projectId, userId);
  const normalizedPath = normalizeRelativePath(relativePath);
  const filePath = assertPathWithin(project.rootPath, normalizedPath);
  if (!(await exists(filePath))) {
    throw new AppError('File not found', 404);
  }

  const content = await readTextFile(filePath);
  return { path: normalizedPath, content };
}

export async function saveProjectFile(projectId: string, userId: string, relativePath: string, content: string) {
  const project = await getOwnedProject(projectId, userId);
  const normalizedPath = normalizeRelativePath(relativePath);
  const filePath = assertPathWithin(project.rootPath, normalizedPath);
  await writeTextFile(filePath, content);

  await FileEntry.findOneAndUpdate(
    { projectId: project._id, path: normalizedPath },
    {
      projectId: project._id,
      path: normalizedPath,
      kind: 'file',
      content,
      language: project.language
    },
    { upsert: true, new: true }
  );

  project.lastOpenedAt = new Date();
  await project.save();
  return { path: normalizedPath, content };
}

export async function createFolder(projectId: string, userId: string, folderPath: string) {
  const project = await getOwnedProject(projectId, userId);
  const normalizedPath = normalizeRelativePath(folderPath);
  const fullPath = assertPathWithin(project.rootPath, normalizedPath);
  await ensureDir(fullPath);

  await FileEntry.findOneAndUpdate(
    { projectId: project._id, path: normalizedPath },
    { projectId: project._id, path: normalizedPath, kind: 'directory', content: '', language: '' },
    { upsert: true, new: true }
  );

  return { path: normalizedPath };
}

async function renameDbPaths(projectId: string, fromPath: string, toPath: string): Promise<void> {
  const affectedFiles = await FileEntry.find({ projectId, path: new RegExp(`^${fromPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:/|$)`) });
  for (const entry of affectedFiles) {
    const nextPath = entry.path === fromPath ? toPath : entry.path.replace(fromPath, toPath);
    entry.path = nextPath;
    if (entry.kind === 'directory') {
      entry.content = '';
    }
    await entry.save();
  }
}

export async function renameItem(projectId: string, userId: string, fromPath: string, toPath: string) {
  const project = await getOwnedProject(projectId, userId);
  const normalizedFrom = normalizeRelativePath(fromPath);
  const normalizedTo = normalizeRelativePath(toPath);
  const sourcePath = assertPathWithin(project.rootPath, normalizedFrom);
  const destinationPath = assertPathWithin(project.rootPath, normalizedTo);
  await ensureDir(path.dirname(destinationPath));
  await fs.rename(sourcePath, destinationPath);
  await renameDbPaths(String(project._id), normalizedFrom, normalizedTo);
  return { fromPath: normalizedFrom, toPath: normalizedTo };
}

export async function deleteItem(projectId: string, userId: string, relativePath: string) {
  const project = await getOwnedProject(projectId, userId);
  const normalizedPath = normalizeRelativePath(relativePath);
  const targetPath = assertPathWithin(project.rootPath, normalizedPath);
  await removeIfExists(targetPath);
  await FileEntry.deleteMany({
    projectId: project._id,
    $or: [
      { path: normalizedPath },
      { path: new RegExp(`^${normalizedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`) }
    ]
  });
}

export async function searchProjectFiles(projectId: string, userId: string, query: string) {
  const project = await getOwnedProject(projectId, userId);
  const lowered = query.toLowerCase().trim();
  if (!lowered) {
    return [];
  }

  const files = await FileEntry.find({ projectId: project._id, kind: 'file' }).lean();
  const results: Array<{ path: string; matches: string[] }> = [];
  for (const file of files) {
    const content = file.content || '';
    if (file.path.toLowerCase().includes(lowered) || content.toLowerCase().includes(lowered)) {
      const lines = content.split(/\r?\n/).filter((line) => line.toLowerCase().includes(lowered)).slice(0, 5);
      results.push({ path: file.path, matches: lines });
    }
  }

  return results;
}

export async function getProjectExplorer(projectId: string, userId: string) {
  const project = await getOwnedProject(projectId, userId);
  return createTree(project.rootPath);
}

export async function syncProjectMetadata(projectId: string, userId: string) {
  const project = await getOwnedProject(projectId, userId);
  project.lastOpenedAt = new Date();
  await project.save();
  return project;
}

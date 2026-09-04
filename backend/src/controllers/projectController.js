import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/appError.js';
import { createProject, deleteItem, deleteProject, getProjectDetails, getProjectExplorer, listProjects, listTree, readProjectFile, renameItem, saveProjectFile, searchProjectFiles, syncProjectMetadata, createFolder, updateProject } from '../services/projectService.js';
import { createZipArchive } from '../utils/archive.js';
import { projectsRoot } from '../utils/runtimePaths.js';

const projectSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(200).optional(),
  language: z.enum(['python', 'c', 'java', 'javascript']).optional()
});

const fileSchema = z.object({
  path: z.string().min(1),
  content: z.string().default('')
});

const renameSchema = z.object({
  fromPath: z.string().min(1),
  toPath: z.string().min(1)
});

const searchSchema = z.object({
  query: z.string().min(1)
});

export const create = asyncHandler(async (req, res) => {
  const input = projectSchema.parse(req.body);
  const project = await createProject(req.auth.sub, input);
  res.status(201).json({ project });
});

export const index = asyncHandler(async (req, res) => {
  const projects = await listProjects(req.auth.sub);
  res.json({ projects });
});

export const show = asyncHandler(async (req, res) => {
  const project = await getProjectDetails(req.params.projectId, req.auth.sub);
  res.json({ project });
});

export const update = asyncHandler(async (req, res) => {
  const updates = projectSchema.partial().extend({ theme: z.string().optional(), settings: z.object({ autoSave: z.boolean().optional(), fontSize: z.number().optional() }).partial().optional() }).parse(req.body);
  const project = await updateProject(req.params.projectId, req.auth.sub, updates);
  res.json({ project });
});

export const destroy = asyncHandler(async (req, res) => {
  await deleteProject(req.params.projectId, req.auth.sub);
  res.status(204).end();
});

export const explorer = asyncHandler(async (req, res) => {
  const tree = await listTree(req.params.projectId, req.auth.sub);
  res.json({ tree });
});

export const fileRead = asyncHandler(async (req, res) => {
  const filePath = req.params.filePath || req.params[0] || '';
  const file = await readProjectFile(req.params.projectId, req.auth.sub, filePath);
  res.json({ file });
});

export const fileWrite = asyncHandler(async (req, res) => {
  const filePath = req.params.filePath || req.params[0] || '';
  const input = fileSchema.parse({ path: filePath, content: req.body?.content ?? '' });
  const file = await saveProjectFile(req.params.projectId, req.auth.sub, input.path, input.content);
  res.json({ file });
});

export const folderCreate = asyncHandler(async (req, res) => {
  const input = z.object({ path: z.string().min(1) }).parse(req.body);
  const folder = await createFolder(req.params.projectId, req.auth.sub, input.path);
  res.status(201).json({ folder });
});

export const itemRename = asyncHandler(async (req, res) => {
  const input = renameSchema.parse(req.body);
  const item = await renameItem(req.params.projectId, req.auth.sub, input.fromPath, input.toPath);
  res.json({ item });
});

export const itemDelete = asyncHandler(async (req, res) => {
  const filePath = req.params.filePath || req.params[0] || '';
  await deleteItem(req.params.projectId, req.auth.sub, filePath);
  res.status(204).end();
});

export const search = asyncHandler(async (req, res) => {
  const { query } = searchSchema.parse(req.query);
  const matches = await searchProjectFiles(req.params.projectId, req.auth.sub, query);
  res.json({ matches });
});

export const refresh = asyncHandler(async (req, res) => {
  const project = await syncProjectMetadata(req.params.projectId, req.auth.sub);
  res.json({ project });
});

export const download = asyncHandler(async (req, res) => {
  const project = await getProjectDetails(req.params.projectId, req.auth.sub);
  const tempPath = path.join(projectsRoot, `${project._id}.zip`);
  const output = fs.createWriteStream(tempPath);
  await createZipArchive(project.rootPath, output);
  res.download(tempPath, `${project.name}.zip`, async () => {
    await fs.promises.rm(tempPath, { force: true });
  });
});

export const upload = asyncHandler(async (req, res) => {
  if (!req.files || !Array.isArray(req.files)) {
    throw new AppError('No files uploaded', 400);
  }

  const project = await getProjectDetails(req.params.projectId, req.auth.sub);
  const uploaded = [];
  for (const file of req.files) {
    const destination = path.join(project.rootPath, file.originalname);
    await fs.promises.writeFile(destination, file.buffer);
    uploaded.push(file.originalname);
  }

  await syncProjectMetadata(project._id, req.auth.sub);
  res.status(201).json({ uploaded });
});

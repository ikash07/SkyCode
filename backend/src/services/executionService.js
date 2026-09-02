import path from 'node:path';
import { Execution } from '../models/Execution.js';
import { AppError } from '../utils/appError.js';
import { getProjectDetails, readProjectFile } from './projectService.js';
import { executeInDocker } from './dockerRunner.js';
import { exists } from '../utils/fs.js';

function detectLanguage(entryFile, projectLanguage) {
  if (entryFile.endsWith('.py')) return 'python';
  if (entryFile.endsWith('.c')) return 'c';
  if (entryFile.endsWith('.cpp') || entryFile.endsWith('.cc')) return 'cpp';
  if (entryFile.endsWith('.js') || entryFile.endsWith('.jsx') || entryFile.endsWith('.ts') || entryFile.endsWith('.mjs') || entryFile.endsWith('.cjs')) return 'javascript';
  if (entryFile.endsWith('.java')) return 'java';
  return projectLanguage || 'python';
}

function buildCommand(language, entryFile) {
  if (language === 'javascript' || language === 'node') {
    return `node ${entryFile}`;
  }

  if (language === 'python') {
    return `python3 ${entryFile}`;
  }

  if (language === 'c') {
    return `gcc $(find . -name "*.c" -print) -o /tmp/program -O2 -std=c17 -Wall -Wextra -lm -lpthread -lcurl -lsqlite3 -lssl -lcrypto -lz && /tmp/program`;
  }

  return `java ${path.basename(entryFile, '.java')}`;
}

export async function runProjectCode(request) {
  const project = await getProjectDetails(request.projectId, request.userId);
  const resolvedEntry = request.entryFile.replace(/^\/+/, '').replace(/\\+/g, '/');
  const entryExists = await exists(path.join(project.rootPath, resolvedEntry));
  if (!entryExists) {
    throw new AppError('Entry file does not exist', 400);
  }

  const language = detectLanguage(resolvedEntry, request.language || project.language);
  const command = buildCommand(language, resolvedEntry);
  const startedAt = Date.now();
  const stdin = request.stdin ?? '';
  const result = await executeInDocker({
    language,
    projectRoot: project.rootPath,
    entryFile: resolvedEntry,
    command,
    stdin,
    cacheKey: `${project._id}:${language}`
  });
  const durationMs = Date.now() - startedAt;

  const execution = await Execution.create({
    projectId: project._id,
    userId: request.userId,
    language,
    entryFile: resolvedEntry,
    command,
    stdin,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    durationMs,
    status: result.timedOut ? 'timeout' : result.exitCode === 0 ? 'success' : 'error'
  });

  return { execution, result, language };
}

export async function listExecutionHistory(projectId, userId) {
  return Execution.find({ projectId, userId }).sort({ createdAt: -1 }).lean();
}

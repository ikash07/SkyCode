import path from 'node:path';
import { Execution } from '../models/Execution.js';
import { AppError } from '../utils/appError.js';
import { getProjectDetails, readProjectFile } from './projectService.js';
import { executeInDocker } from './dockerRunner.js';
import { exists } from '../utils/fs.js';

export interface ExecutionRequest {
  projectId: string;
  userId: string;
  entryFile: string;
  language?: 'python' | 'c' | 'java';
}

function detectLanguage(entryFile: string, projectLanguage?: 'python' | 'c' | 'java'): 'python' | 'c' | 'java' {
  if (projectLanguage) {
    return projectLanguage;
  }

  if (entryFile.endsWith('.py')) return 'python';
  if (entryFile.endsWith('.c')) return 'c';
  return 'java';
}

function buildCommand(language: 'python' | 'c' | 'java', entryFile: string): string {
  if (language === 'python') {
    return `python3 ${entryFile}`;
  }

  if (language === 'c') {
    return `gcc $(find . -name "*.c" -print) -o /tmp/program -O2 -std=c17 -Wall -Wextra -lm -lpthread -lcurl -lsqlite3 -lssl -lcrypto -lz && /tmp/program`;
  }

  return `java ${path.basename(entryFile, '.java')}`;
}

export async function runProjectCode(request: ExecutionRequest) {
  const project = await getProjectDetails(request.projectId, request.userId);
  const resolvedEntry = request.entryFile.replace(/^\/+/, '').replace(/\\+/g, '/');
  const entryExists = await exists(path.join(project.rootPath, resolvedEntry));
  if (!entryExists) {
    throw new AppError('Entry file does not exist', 400);
  }

  const language = detectLanguage(resolvedEntry, request.language || project.language);
  const command = buildCommand(language, resolvedEntry);
  const startedAt = Date.now();
  const result = await executeInDocker({
    language,
    projectRoot: project.rootPath,
    entryFile: resolvedEntry,
    command,
    cacheKey: `${project._id}:${language}`
  });
  const durationMs = Date.now() - startedAt;

  const execution = await Execution.create({
    projectId: project._id,
    userId: request.userId,
    language,
    entryFile: resolvedEntry,
    command,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    durationMs,
    status: result.timedOut ? 'timeout' : result.exitCode === 0 ? 'success' : 'error'
  });

  return { execution, result, language };
}

export async function listExecutionHistory(projectId: string, userId: string) {
  return Execution.find({ projectId, userId }).sort({ createdAt: -1 }).lean();
}

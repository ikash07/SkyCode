import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listExecutionHistory, runProjectCode } from '../services/executionService.js';

const executionSchema = z.object({
  entryFile: z.string().min(1),
  language: z.enum(['python', 'c', 'java']).optional()
});

export const run = asyncHandler(async (req: Request, res: Response) => {
  const input = executionSchema.parse(req.body);
  const execution = await runProjectCode({
    projectId: req.params.projectId,
    userId: req.auth!.sub,
    entryFile: input.entryFile,
    language: input.language
  });

  res.json(execution);
});

export const history = asyncHandler(async (req: Request, res: Response) => {
  const executions = await listExecutionHistory(req.params.projectId, req.auth!.sub);
  res.json({ executions });
});

import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listExecutionHistory, runProjectCode } from '../services/executionService.js';

const executionSchema = z.object({
  entryFile: z.string().min(1),
  language: z.enum(['python', 'c', 'java', 'javascript']).optional(),
  stdin: z.string().optional()
});

export const run = asyncHandler(async (req, res) => {
  const input = executionSchema.parse(req.body);
  const execution = await runProjectCode({
    projectId: req.params.projectId,
    userId: req.auth.sub,
    entryFile: input.entryFile,
    language: input.language,
    stdin: input.stdin
  });

  res.json(execution);
});

export const history = asyncHandler(async (req, res) => {
  const executions = await listExecutionHistory(req.params.projectId, req.auth.sub);
  res.json({ executions });
});

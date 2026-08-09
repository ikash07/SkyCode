import { Router } from 'express';
import { history, run } from '../controllers/executionController.js';
import { requireAuth } from '../middleware/auth.js';

export const executionRoutes = Router();

executionRoutes.use(requireAuth);
executionRoutes.get('/:projectId', history);
executionRoutes.post('/:projectId', run);

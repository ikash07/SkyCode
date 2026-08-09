import { Router } from 'express';
import multer from 'multer';
import { create, destroy, download, explorer, folderCreate, fileRead, fileWrite, index, itemDelete, itemRename, refresh, search, show, update, upload } from '../controllers/projectController.js';
import { requireAuth } from '../middleware/auth.js';

const uploadMiddleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 20 } });

export const projectRoutes = Router();

projectRoutes.use(requireAuth);
projectRoutes.get('/', index);
projectRoutes.post('/', create);
projectRoutes.get('/:projectId', show);
projectRoutes.put('/:projectId', update);
projectRoutes.delete('/:projectId', destroy);
projectRoutes.get('/:projectId/tree', explorer);
projectRoutes.get('/:projectId/refresh', refresh);
projectRoutes.get('/:projectId/search', search);
projectRoutes.get('/:projectId/download', download);
projectRoutes.get('/:projectId/files/:filePath(*)', fileRead);
projectRoutes.put('/:projectId/files/:filePath(*)', fileWrite);
projectRoutes.delete('/:projectId/files/:filePath(*)', itemDelete);
projectRoutes.post('/:projectId/folders', folderCreate);
projectRoutes.patch('/:projectId/rename', itemRename);
projectRoutes.post('/:projectId/upload', uploadMiddleware.array('files'), upload);

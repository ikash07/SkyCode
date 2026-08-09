import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { authRoutes } from './routes/authRoutes.js';
import { projectRoutes } from './routes/projectRoutes.js';
import { executionRoutes } from './routes/executionRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Database connection check middleware for API endpoints
  app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();

    // 1 = connected, 2 = connecting
    if (mongoose.connection.readyState === 0) {
      res.status(503).json({
        message: 'Database connection offline. Retrying MongoDB connection in background...',
        code: 'DB_OFFLINE'
      });
      return;
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
    res.json({ ok: true, service: 'online-ide-backend', database: dbState });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/executions', executionRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

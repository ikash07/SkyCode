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

  // Immediate health check handler for UptimeRobot, Render, and external monitors
  // Handles GET, HEAD, POST on /, /api, /health, /api/health, /ping, /status with zero delay and no DB blocking
  const healthHandler = (req, res) => {
    const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'HEAD') {
      res.status(200).end();
      return;
    }

    res.status(200).json({
      status: 'ok',
      message: 'OK',
      ok: true,
      service: 'online-ide-backend',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: dbState
    });
  };

  const healthPaths = [
    '/',
    '/api',
    '/api/',
    '/health',
    '/health/',
    '/api/health',
    '/api/health/',
    '/ping',
    '/ping/',
    '/api/ping',
    '/api/ping/',
    '/status',
    '/status/',
    '/api/status',
    '/api/status/',
    '/uptime',
    '/uptime/',
    '/api/uptime',
    '/api/uptime/'
  ];

  app.all(healthPaths, healthHandler);

  app.get('/robots.txt', (_req, res) => res.type('text/plain').send('User-agent: *\nDisallow:'));
  app.get('/favicon.ico', (_req, res) => res.status(204).end());

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Database connection check middleware for API endpoints
  app.use('/api', (req, res, next) => {
    if (
      req.path === '/health' ||
      req.path === '/ping' ||
      req.path === '/status' ||
      req.path === '/uptime' ||
      req.path === '/' ||
      req.path === ''
    ) {
      return next();
    }

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

  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/executions', executionRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

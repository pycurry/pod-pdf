import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import apiRouter from './routes';
import { errorHandler } from './middleware/error.middleware';
import { env } from '../config/env';

export function createApp(): Express {
  const app = express();

  // Standard middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Mount API router
  app.use('/api/v1', apiRouter);

  // Serve Web GUI Designer if built
  const candidateGuiDirs = [
    path.resolve(process.cwd(), 'src/gui/dist'),
    path.resolve(__dirname, '../src/gui/dist'),
    path.resolve(__dirname, './gui'),
    path.resolve(__dirname, '../gui/dist'),
  ];
  const guiDistPath = candidateGuiDirs.find((dir) => fs.existsSync(dir));

  if (guiDistPath) {
    app.use(express.static(guiDistPath));
    app.get('/designer', (_req: Request, res: Response) => {
      res.sendFile(path.join(guiDistPath, 'index.html'));
    });
  }

  // Root redirect/status
  app.get('/', (_req: Request, res: Response) => {
    if (guiDistPath && fs.existsSync(guiDistPath)) {
      res.sendFile(path.join(guiDistPath, 'index.html'));
    } else {
      res.json({
        service: 'pod-PDF Microservice',
        version: '1.0.0',
        docs: '/api/v1/health',
        designer: '/designer',
      });
    }
  });

  // Catch-all 404 handler for unmatched routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Cannot ${req.method} ${req.originalUrl}`,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

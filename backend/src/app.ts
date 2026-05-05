import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from '@/config/env';
import { logger } from '@/core/logger';
import { errorHandler, notFoundHandler } from '@/core/errors/errorHandler';
import { asyncHandler } from '@/core/utils/asyncHandler';
import { prisma } from '@/core/db/prisma';
import authRoutes from '@/features/auth/auth.routes';
import userRoutes from '@/features/user/user.routes';
import projectRoutes from '@/features/project/project.routes';
import taskRoutes from '@/features/task/task.routes';
import dashboardRoutes from '@/features/dashboard/dashboard.routes';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: false,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  app.get('/', (_req, res) => {
    res.json({
      name: 'Team Task Manager API',
      version: '1.0.0',
      status: 'ok',
    });
  });

  app.get(
    '/healthz',
    asyncHandler(async (_req, res) => {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    }),
  );

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/projects', projectRoutes);
  app.use('/api/v1/tasks', taskRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

import { createApp } from './app';
import { env } from '@/config/env';
import { logger } from '@/core/logger';
import { connectDb, disconnectDb } from '@/core/db/prisma';

async function bootstrap() {
  try {
    await connectDb();
  } catch (err) {
    logger.warn({ err }, 'Database connection failed at boot — continuing (will retry on requests)');
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Server listening on http://localhost:${env.PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to bootstrap server');
  process.exit(1);
});

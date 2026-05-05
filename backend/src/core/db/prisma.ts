import { PrismaClient } from '@prisma/client';
import { env } from '@/config/env';
import { logger } from '@/core/logger';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDevelopment ? ['warn', 'error'] : ['error'],
  });

if (env.isDevelopment) globalForPrisma.prisma = prisma;

export const connectDb = async () => {
  await prisma.$connect();
  logger.info('Database connected');
};

export const disconnectDb = async () => {
  await prisma.$disconnect();
  logger.info('Database disconnected');
};

import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  (process.env.NODE_ENV === 'production' 
    ? new PrismaClient() 
    : (globalForPrisma.prisma || new PrismaClient({ log: ['query'] })));

// Force reload on schema change: 2026-05-08
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

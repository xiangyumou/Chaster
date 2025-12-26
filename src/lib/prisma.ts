// Prisma Client configuration for Chaster
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
    if (!prisma) {
        // Simple initialization - Prisma will read from prisma.config.ts
        prisma = new PrismaClient();
    }

    return prisma;
}

export async function disconnectPrisma() {
    if (prisma) {
        await prisma.$disconnect();
        prisma = null;
    }
}

// Export a default instance for convenience
export const db = getPrismaClient();

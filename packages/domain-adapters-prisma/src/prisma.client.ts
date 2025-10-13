import { PrismaClient } from "@prisma/client";

type PrismaLogLevel = "info" | "query" | "warn" | "error";

let prisma: PrismaClient | null = null;

function parseLogLevels(): PrismaLogLevel[] | undefined {
  const raw = process.env.PRISMA_LOG_LEVEL ?? "";
  const levels = raw
    .split(",")
    .map(level => level.trim())
    .filter(Boolean) as PrismaLogLevel[];
  return levels.length > 0 ? levels : undefined;
}

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: parseLogLevels(),
    });
  }
  return prisma;
}

export type { PrismaClient };

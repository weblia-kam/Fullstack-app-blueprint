import { describe, it, expect, afterAll } from "vitest";
import { UsersPrismaRepository, getPrisma } from "@org/domain-adapters-prisma";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";

let container: StartedPostgreSqlContainer | undefined;
let connectionUrl: string | undefined;
let startError: unknown;

try {
  container = await new PostgreSqlContainer().start();
  connectionUrl = container.getConnectionUri();
  process.env.DATABASE_URL = connectionUrl;
  execSync("pnpm --filter @blueprint/db exec prisma db push", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: connectionUrl },
  });
} catch (error) {
  startError = error;
  console.warn("Skipping Prisma adapter tests:", (error as Error).message);
}

const describeIfReady = startError ? describe.skip : describe;

describeIfReady("UsersPrismaRepository (integration)", () => {
  afterAll(async () => {
    await getPrisma().$disconnect();
    await container?.stop();
  });

  it("creates and retrieves a user", async () => {
    const repo = new UsersPrismaRepository();
    const created = await repo.create({ email: "repo@example.com", name: "Repo User" });
    expect(created.id).toBeDefined();
    const fetched = await repo.findById(created.id);
    expect(fetched?.email).toBe("repo@example.com");
    expect(fetched?.name).toBe("Repo User");
  });

  it("throws domain error when updating missing user", async () => {
    const repo = new UsersPrismaRepository();
    await expect(repo.update("missing", { name: "Nobody" })).rejects.toThrowError();
  });
});

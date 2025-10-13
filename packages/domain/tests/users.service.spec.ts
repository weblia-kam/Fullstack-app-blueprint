import { describe, it, expect, beforeEach } from "vitest";
import { UsersService, type UsersRepository, type User, DomainError } from "@org/domain";

class InMemoryUsersRepository implements UsersRepository {
  private users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async create(data: { email: string; name?: string; role?: "ADMIN" | "USER"; passwordHash?: string }): Promise<User> {
    const id = `user-${this.users.size + 1}`;
    const now = new Date();
    const user: User = {
      id,
      email: data.email,
      name: data.name,
      role: data.role ?? "USER",
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async update(id: string, data: Partial<Omit<User, "id" | "createdAt" | "updatedAt">>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error("User not found");
    const updated: User = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }
}

describe("UsersService", () => {
  let repository: InMemoryUsersRepository;
  let service: UsersService;

  beforeEach(() => {
    repository = new InMemoryUsersRepository();
    service = new UsersService(repository);
  });

  it("returns a profile when the user exists", async () => {
    const created = await repository.create({ email: "test@example.com", name: "Test User" });
    const profile = await service.getProfile(created.id);
    expect(profile).toEqual(created);
  });

  it("throws when profile is missing", async () => {
    await expect(service.getProfile("missing"))
      .rejects.toBeInstanceOf(DomainError);
  });

  it("rejects duplicate registration", async () => {
    await service.registerUser({ email: "dup@example.com", name: "Dup" });
    await expect(service.registerUser({ email: "dup@example.com" })).rejects.toMatchObject({
      code: "DUPLICATE_RESOURCE",
    });
  });

  it("updates profile and normalizes email", async () => {
    const created = await service.registerUser({ email: "user@example.com", name: "User" });
    const updated = await service.updateProfile(created.id, { email: "NEW@Example.com" });
    expect(updated.email).toBe("new@example.com");
  });
});

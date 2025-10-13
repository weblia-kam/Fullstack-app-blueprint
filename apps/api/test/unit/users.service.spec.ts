import { DomainError, type User, UsersService, type UsersRepository } from "@org/domain";

class InMemoryUsersRepository implements UsersRepository {
  private users = new Map<string, User>();

  constructor(seed: User[] = []) {
    seed.forEach((user) => this.users.set(user.id, user));
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
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

  async update(
    id: string,
    data: Partial<Omit<User, "id" | "createdAt" | "updatedAt">>,
  ): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) {
      throw new Error("User not found");
    }
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
  it("returns an existing profile", async () => {
    const existing: User = {
      id: "user-1",
      email: "user@example.com",
      role: "USER",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    };
    const repository = new InMemoryUsersRepository([existing]);
    const service = new UsersService(repository);

    await expect(service.getProfile("user-1")).resolves.toEqual(existing);
  });

  it("throws a DomainError when profile is missing", async () => {
    const service = new UsersService(new InMemoryUsersRepository());

    await expect(service.getProfile("missing")).rejects.toBeInstanceOf(DomainError);
  });

  it("prevents duplicate registrations", async () => {
    const service = new UsersService(new InMemoryUsersRepository());
    await service.registerUser({ email: "dup@example.com", name: "Existing" });

    await expect(service.registerUser({ email: "dup@example.com" })).rejects.toMatchObject({
      code: "DUPLICATE_RESOURCE",
    });
  });

  it("updates the profile and normalizes email", async () => {
    const service = new UsersService(new InMemoryUsersRepository());
    const created = await service.registerUser({ email: "user@example.com", name: "Test" });

    const updated = await service.updateProfile(created.id, { email: "New@Example.com" });

    expect(updated.email).toBe("new@example.com");
  });
});

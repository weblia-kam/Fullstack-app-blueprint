import type { User } from "./users.entity";

export interface UsersRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: { email: string; name?: string; role?: "ADMIN" | "USER"; passwordHash?: string }): Promise<User>;
  update(id: string, data: Partial<Omit<User, "id" | "createdAt" | "updatedAt">>): Promise<User>;
}

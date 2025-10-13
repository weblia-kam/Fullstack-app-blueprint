import { DomainError } from "../common/domain-error.js";
import type { User } from "./users.entity.js";
import type { UsersRepository } from "./users.repository.js";

export type RegisterUserInput = {
  email: string;
  name?: string;
  role?: "ADMIN" | "USER";
  passwordHash?: string;
};

export type UpdateUserProfileInput = {
  email?: string;
  name?: string;
  role?: "ADMIN" | "USER";
  profile?: User["profile"];
};

export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async getProfile(userId: string): Promise<User> {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new DomainError("USER_NOT_FOUND", "User not found", { userId });
    }
    return user;
  }

  async registerUser(input: RegisterUserInput): Promise<User> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.repository.findByEmail(email);
    if (existing) {
      throw new DomainError("DUPLICATE_RESOURCE", "User with email already exists", { email });
    }
    const role = input.role ?? "USER";
    return this.repository.create({ ...input, email, role });
  }

  async updateProfile(userId: string, input: UpdateUserProfileInput): Promise<User> {
    const current = await this.repository.findById(userId);
    if (!current) {
      throw new DomainError("USER_NOT_FOUND", "User not found", { userId });
    }

    if (input.email && input.email !== current.email) {
      const normalizedEmail = input.email.trim().toLowerCase();
      const existing = await this.repository.findByEmail(normalizedEmail);
      if (existing && existing.id !== userId) {
        throw new DomainError("DUPLICATE_RESOURCE", "Email already in use", { email: normalizedEmail });
      }
      input = { ...input, email: normalizedEmail };
    }

    return this.repository.update(userId, input);
  }
}

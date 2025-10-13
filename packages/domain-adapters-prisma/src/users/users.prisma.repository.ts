import type { User as PrismaUser } from "@prisma/client";
import type { User, UsersRepository } from "@org/domain";
import { getPrisma } from "../prisma.client.js";

function toDomain(user: PrismaUser): User {
  const displayName = user.displayName ?? `${user.firstName} ${user.lastName}`.trim();
  return {
    id: user.id,
    email: user.email,
    name: displayName || undefined,
    role: "USER",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: {
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      birthDate: user.birthDate,
      displayName: user.displayName,
    },
  };
}

function splitName(name?: string): { firstName: string; lastName: string } {
  if (!name) return { firstName: "", lastName: "" };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.slice(-1).join(" "),
  };
}

export class UsersPrismaRepository implements UsersRepository {
  private readonly prisma = getPrisma();

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? toDomain(user) : null;
  }

  async create(data: { email: string; name?: string; role?: "ADMIN" | "USER"; passwordHash?: string }): Promise<User> {
    const { firstName, lastName } = splitName(data.name);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        displayName: data.name ?? null,
        firstName,
        lastName,
        passwordHash: data.passwordHash ?? null,
      },
    });
    return toDomain(user);
  }

  async update(
    id: string,
    data: Partial<Omit<User, "id" | "createdAt" | "updatedAt">>,
  ): Promise<User> {
    const updateData: Record<string, unknown> = {};
    if (typeof data.email === "string") {
      updateData.email = data.email;
    }
    if (data.name !== undefined) {
      const { firstName, lastName } = splitName(data.name);
      updateData.displayName = data.name ?? null;
      updateData.firstName = firstName;
      updateData.lastName = lastName;
    }
    if (data.profile) {
      if ("phone" in data.profile) {
        updateData.phone = data.profile.phone ?? null;
      }
      if ("firstName" in data.profile && data.profile.firstName !== undefined) {
        updateData.firstName = data.profile.firstName ?? "";
      }
      if ("lastName" in data.profile && data.profile.lastName !== undefined) {
        updateData.lastName = data.profile.lastName ?? "";
      }
      if ("birthDate" in data.profile) {
        updateData.birthDate = data.profile.birthDate ?? null;
      }
      if ("displayName" in data.profile && data.profile.displayName !== undefined) {
        updateData.displayName = data.profile.displayName;
      }
    }
    if (Object.keys(updateData).length === 0) {
      const existing = await this.prisma.user.findUniqueOrThrow({ where: { id } });
      return toDomain(existing);
    }
    const user = await this.prisma.user.update({ where: { id }, data: updateData });
    return toDomain(user);
  }
}

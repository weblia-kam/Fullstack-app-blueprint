import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { AuthService } from "../../src/modules/auth/auth.service";
import type { MailerService } from "../../src/modules/mailer/mailer.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { TokensService } from "@org/domain";

const hashMock = jest.fn<Promise<string>, [string, unknown?]>();
const verifyMock = jest.fn<Promise<boolean>, [string, string]>();
const uuidMock = jest.fn<string, []>();
const randomBytesMock = jest.fn(() => Buffer.from("random-token", "utf-8"));

jest.mock("argon2", () => ({
  hash: (...args: [string, unknown?]) => hashMock(...args),
  verify: (...args: [string, string]) => verifyMock(...args),
}));

jest.mock("uuid", () => ({
  v4: () => uuidMock(),
}));

jest.mock("@prisma/client", () => ({ PrismaClient: class {} }));

jest.mock("crypto", () => ({
  randomBytes: (...args: [number]) => randomBytesMock(...args),
}));

type PrismaUserMock = {
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
};

type PrismaSessionMock = {
  create: jest.Mock;
  findUnique: jest.Mock;
  update: jest.Mock;
};

type PrismaMagicLinkMock = {
  create: jest.Mock;
  findFirst: jest.Mock;
  update: jest.Mock;
};

type PrismaMock = {
  user: PrismaUserMock;
  session: PrismaSessionMock;
  magicLink: PrismaMagicLinkMock;
};

const createPrismaMock = (): PrismaMock => ({
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  magicLink: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
});

const createAuthService = () => {
  const prisma = createPrismaMock();
  const tokens: jest.Mocked<Pick<
    TokensService,
    "issueAccessToken" | "issueRefreshToken" | "verify"
  >> = {
    issueAccessToken: jest.fn(),
    issueRefreshToken: jest.fn(),
    verify: jest.fn(),
  };
  const mailer = { sendMagicLink: jest.fn() };
  const config = {
    get: jest.fn().mockReturnValue("1209600"),
  } as unknown as ConfigService;

  const service = new AuthService(
    prisma as unknown as PrismaService,
    mailer as unknown as MailerService,
    tokens as unknown as TokensService,
    config,
  );

  return { service, prisma, tokens, mailer };
};

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hashMock.mockReset();
    verifyMock.mockReset();
    uuidMock.mockReset();
    randomBytesMock.mockReset();
  });

  it("rejects duplicate registrations", async () => {
    const { service, prisma } = createAuthService();
    prisma.user.findFirst.mockResolvedValueOnce({ id: "user-1" });

    await expect(
      service.registerUser({
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "Password123",
        acceptedTerms: true,
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("creates a new user and issues tokens", async () => {
    const { service, prisma, tokens } = createAuthService();
    prisma.user.findFirst.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce({ id: "user-42" });
    hashMock.mockResolvedValueOnce("argon-hash");
    tokens.issueAccessToken.mockResolvedValueOnce("access-token");
    tokens.issueRefreshToken.mockResolvedValueOnce("refresh-token");
    uuidMock.mockReturnValueOnce("session-jti");

    const result = await service.registerUser({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane.doe@example.com",
      phone: "+47 123 45 678",
      password: "Password123",
      acceptedTerms: true,
    });

    expect(result).toEqual({ accessToken: "access-token", refreshToken: "refresh-token" });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "jane.doe@example.com",
          passwordHash: "argon-hash",
          phone: "+4712345678",
        }),
      })
    );
    expect(prisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-42",
          token: "session-jti",
          expiresAt: expect.any(Date),
        }),
      })
    );
  });

  it("validates credentials and returns issued tokens", async () => {
    const { service, prisma, tokens } = createAuthService();
    prisma.user.findFirst.mockResolvedValueOnce({ id: "user-7", passwordHash: "stored-hash" });
    verifyMock.mockResolvedValueOnce(true);
    tokens.issueAccessToken.mockResolvedValueOnce("issued-access");
    tokens.issueRefreshToken.mockResolvedValueOnce("issued-refresh");
    uuidMock.mockReturnValueOnce("session-123");

    const result = await service.login("user@example.com", "Secret123!");

    expect(result).toEqual({ accessToken: "issued-access", refreshToken: "issued-refresh" });
    expect(prisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ token: "session-123", userId: "user-7" }),
      })
    );
  });

  it("rejects registration when terms are not accepted", async () => {
    const { service } = createAuthService();

    await expect(
      service.registerUser({
        firstName: "No",
        lastName: "Terms",
        email: "user@example.com",
        password: "Password123",
        acceptedTerms: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects invalid email and password policies", async () => {
    const { service } = createAuthService();

    await expect(
      service.registerUser({
        firstName: "Invalid",
        lastName: "Email",
        email: "not-an-email",
        password: "Password123",
        acceptedTerms: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.registerUser({
        firstName: "Invalid",
        lastName: "Password",
        email: "valid@example.com",
        password: "short",
        acceptedTerms: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects invalid phone numbers", async () => {
    const { service } = createAuthService();

    await expect(
      service.registerUser({
        firstName: "Phone",
        lastName: "Invalid",
        email: "phone@example.com",
        phone: "abc123",
        password: "Password123",
        acceptedTerms: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects invalid credentials", async () => {
    const { service, prisma } = createAuthService();
    prisma.user.findFirst.mockResolvedValueOnce({ id: "user-1", passwordHash: "hash" });
    verifyMock.mockResolvedValueOnce(false);

    await expect(service.login("user@example.com", "wrong"))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("refreshes tokens for active sessions", async () => {
    const { service, prisma, tokens } = createAuthService();
    tokens.verify.mockResolvedValueOnce({ subject: "user-9", tokenId: "jti-old" });
    prisma.session.findUnique.mockResolvedValueOnce({
      token: "jti-old",
      userId: "user-9",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1000),
    });
    tokens.issueAccessToken.mockResolvedValueOnce("access-new");
    tokens.issueRefreshToken.mockResolvedValueOnce("refresh-new");
    uuidMock.mockReturnValueOnce("jti-new");

    const result = await service.refresh("refresh-token-value");

    expect(result).toEqual({ accessToken: "access-new", refreshToken: "refresh-new" });
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { token: "jti-old" },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ token: "jti-new", userId: "user-9" }),
      })
    );
  });

  it("throws when refresh token session is missing", async () => {
    const { service, prisma, tokens } = createAuthService();
    tokens.verify.mockResolvedValueOnce({ subject: "user-1", tokenId: "missing" });
    prisma.session.findUnique.mockResolvedValueOnce(null);

    await expect(service.refresh("bad-token")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("throws when refresh payload is malformed", async () => {
    const { service, tokens } = createAuthService();
    tokens.verify.mockResolvedValueOnce({ subject: undefined, tokenId: undefined });

    await expect(service.refresh("bad"))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("creates and emails magic links", async () => {
    const { service, prisma, mailer } = createAuthService();
    const originalAppUrl = process.env.APP_URL;
    process.env.APP_URL = "http://localhost:3000";
    hashMock.mockResolvedValueOnce("hashed-token");
    randomBytesMock.mockReturnValueOnce(Buffer.from("magic", "utf-8"));

    const result = await service.requestMagicLink("magic@example.com");

    expect(result.token).toBe(Buffer.from("magic", "utf-8").toString("hex"));
    expect(prisma.magicLink.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: "magic@example.com", token: "hashed-token" }),
    });
    expect(mailer.sendMagicLink).toHaveBeenCalledWith(
      "magic@example.com",
      expect.stringContaining("/auth/callback"),
    );
    process.env.APP_URL = originalAppUrl;
  });

  it("verifies magic links and creates users when needed", async () => {
    const { service, prisma, tokens } = createAuthService();
    const now = new Date(Date.now() + 60_000);
    prisma.magicLink.findFirst.mockResolvedValueOnce({
      id: "ml-1",
      email: "new@example.com",
      token: "hashed",
      expiresAt: now,
    });
    verifyMock.mockResolvedValueOnce(true);
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce({ id: "user-new" });
    tokens.issueAccessToken.mockResolvedValueOnce("access-token");
    tokens.issueRefreshToken.mockResolvedValueOnce("refresh-token");
    uuidMock.mockReturnValueOnce("ml-session");

    const result = await service.verifyMagicLink("new@example.com", "token-value");

    expect(result).toEqual({ userId: "user-new", accessToken: "access-token", refreshToken: "refresh-token" });
    expect(prisma.magicLink.update).toHaveBeenCalledWith({
      where: { id: "ml-1" },
      data: { usedAt: expect.any(Date) },
    });
    expect(prisma.user.create).toHaveBeenCalledWith({ data: { email: "new@example.com" } });
  });

  it("rejects invalid magic links", async () => {
    const { service, prisma } = createAuthService();
    prisma.magicLink.findFirst.mockResolvedValueOnce(null);

    await expect(service.verifyMagicLink("nope@example.com", "token"))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("logs out and revokes sessions when refresh token present", async () => {
    const { service, prisma, tokens } = createAuthService();
    tokens.verify.mockResolvedValueOnce({ subject: "user-1", tokenId: "jti-logout" });

    await service.logout("refresh-token-value");

    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { token: "jti-logout" },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("ignores logout when no token is provided", async () => {
    const { service, prisma } = createAuthService();

    await service.logout(null);

    expect(prisma.session.update).not.toHaveBeenCalled();
  });
});

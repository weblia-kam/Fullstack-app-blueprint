import request from "supertest";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/modules/app.module";
import { DomainErrorInterceptor } from "../src/common/interceptors/domain-error.interceptor";
import { TokensService, DomainError, type UsersRepository, type User, type TokensProvider, UsersService as UsersDomainService } from "@org/domain";
import { AuthService } from "../src/modules/auth/auth.service";
import { JwtUtil } from "../src/modules/auth/jwt.util";
import { JwtTokensProvider } from "../src/modules/auth/jwt.tokens.provider";
import { PrismaService } from "../src/prisma/prisma.service";
import { UsersController } from "../src/modules/users/users.controller";

const testUser: User = {
  id: "user-1",
  email: "user@example.com",
  name: "User Example",
  role: "USER",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  profile: {
    firstName: "User",
    lastName: "Example",
    phone: "+4712345678",
    birthDate: new Date("1990-01-01T00:00:00.000Z"),
    displayName: "User Example",
  },
};

describe("GET /api/v1/me", () => {
  let app: INestApplication;
let verifyMock: (token: string) => Promise<{ subject: string; tokenId?: string }> = async () => {
  throw new Error("verifyMock not set");
};
const tokensProviderStub: TokensProvider = {
  signAccessToken: async () => "",
  signRefreshToken: async () => "",
  verifyToken: (token: string) => verifyMock(token),
};
const tokensServiceStub = new TokensService(tokensProviderStub);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider("UsersRepository")
      .useValue({
        findById: async (id: string) => (id === testUser.id ? testUser : null),
        findByEmail: async () => null,
        create: async () => testUser,
        update: async () => testUser,
      } satisfies UsersRepository)
      .overrideProvider(AuthService)
      .useValue({
        requestMagicLink: async () => ({}),
        verifyMagicLink: async () => ({}),
        refresh: async () => ({}),
        logout: async () => undefined,
        registerUser: async () => ({}),
        login: async () => ({}),
      } satisfies Partial<AuthService>)
      .overrideProvider(JwtUtil)
      .useValue({
        signAccess: () => "",
        signRefresh: () => "",
        verifyToken: () => ({ sub: testUser.id }),
      } satisfies Partial<JwtUtil>)
      .overrideProvider(JwtTokensProvider)
      .useValue({
        signAccessToken: () => "",
        signRefreshToken: () => "",
        verifyToken: () => ({ subject: testUser.id }),
      } satisfies Partial<JwtTokensProvider>)
      .overrideProvider(PrismaService)
      .useValue({
        $connect: async () => undefined,
        $disconnect: async () => undefined,
      } satisfies Partial<PrismaService>)
      .overrideProvider(TokensService)
      .useValue(tokensServiceStub)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new DomainErrorInterceptor());
    app.setGlobalPrefix("api/v1");
    await app.init();

    const resolvedTokens = app.get(TokensService);
    if (!resolvedTokens) {
      throw new Error("TokensService override failed");
    }
    const controller = app.get(UsersController);
    (controller as unknown as { tokens: TokensService }).tokens = tokensServiceStub;
    (controller as unknown as { usersService: UsersDomainService }).usersService = new UsersDomainService({
      findById: async (id: string) => (id === testUser.id ? testUser : null),
      findByEmail: async () => null,
      create: async () => testUser,
      update: async () => testUser,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns the authenticated user", async () => {
    verifyMock = async () => ({ subject: testUser.id });

    const response = await request(app.getHttpServer()).get("/api/v1/me").set("Authorization", "Bearer valid");
    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      id: testUser.id,
      email: testUser.email,
      firstName: testUser.profile?.firstName,
    });
  });

  it("maps domain errors to HTTP status codes", async () => {
    verifyMock = async () => {
      throw new DomainError("INVALID_TOKEN", "Token invalid");
    };

    const response = await request(app.getHttpServer()).get("/api/v1/me").set("Authorization", "Bearer invalid");
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("INVALID_TOKEN");
  });
});

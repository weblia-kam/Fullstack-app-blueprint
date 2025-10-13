import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { TokensService, UsersService as UsersDomainService, type User, type UsersRepository } from "@org/domain";
import jestOpenAPI from "jest-openapi";
import request from "supertest";

import { DomainErrorInterceptor } from "../../src/common/interceptors/domain-error.interceptor";
import { AppModule } from "../../src/modules/app.module";
import { AuthController } from "../../src/modules/auth/auth.controller";
import { AuthService } from "../../src/modules/auth/auth.service";
import { JwtTokensProvider } from "../../src/modules/auth/jwt.tokens.provider";
import { JwtUtil } from "../../src/modules/auth/jwt.util";
import { UsersController } from "../../src/modules/users/users.controller";
import { PrismaService } from "../../src/prisma/prisma.service";

jest.mock("@prisma/client", () => ({ PrismaClient: class {} }));

const specPath = resolve(__dirname, "../../../../packages/contracts/openapi.v1.json");
const rawSpec = JSON.parse(readFileSync(specPath, "utf-8"));
jestOpenAPI({ ...rawSpec, servers: [{ url: "/" }] });

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

const usersRepositoryStub: UsersRepository = {
  findById: async (id) => (id === testUser.id ? testUser : null),
  findByEmail: async () => null,
  create: async () => testUser,
  update: async () => testUser,
};

const tokensServiceStub: Pick<TokensService, "verify"> = {
  verify: async () => ({ subject: testUser.id }),
};

const authServiceStub: Partial<AuthService> = {
  login: async () => ({ accessToken: "access-token", refreshToken: "refresh-token" }),
  refresh: async () => ({ accessToken: "access-token", refreshToken: "refresh-token" }),
  registerUser: async () => ({ accessToken: "access-token", refreshToken: "refresh-token" }),
  requestMagicLink: async () => ({ token: "dev-token" }),
  verifyMagicLink: async () => ({ accessToken: "access-token", refreshToken: "refresh-token" }),
};

describe("OpenAPI contract", () => {
  let app: INestApplication;
  const originalEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider("UsersRepository")
      .useValue(usersRepositoryStub)
      .overrideProvider(AuthService)
      .useValue(authServiceStub)
      .overrideProvider(TokensService)
      .useValue(tokensServiceStub)
      .overrideProvider(JwtTokensProvider)
      .useValue({
        signAccessToken: async () => "access-token",
        signRefreshToken: async () => "refresh-token",
        verifyToken: async () => ({ subject: testUser.id }),
      } satisfies Partial<JwtTokensProvider>)
      .overrideProvider(JwtUtil)
      .useValue({
        signAccess: () => "access-token",
        signRefresh: () => "refresh-token",
        verifyToken: () => ({ sub: testUser.id }),
      } satisfies Partial<JwtUtil>)
      .overrideProvider(PrismaService)
      .useValue({
        $connect: async () => undefined,
        $disconnect: async () => undefined,
      } satisfies Partial<PrismaService>)
      .overrideProvider(UsersDomainService)
      .useValue(new UsersDomainService(usersRepositoryStub))
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new DomainErrorInterceptor());
    app.setGlobalPrefix("api/v1", { exclude: [] });
    await app.init();

    const authController = app.get(AuthController);
    (authController as unknown as { auth: AuthService }).auth = authServiceStub as AuthService;

    const usersController = app.get(UsersController);
    (usersController as unknown as { tokens: TokensService }).tokens = tokensServiceStub as TokensService;
    (usersController as unknown as { usersService: UsersDomainService }).usersService = new UsersDomainService(
      usersRepositoryStub,
    );
  });

  afterAll(async () => {
    process.env.NODE_ENV = originalEnv;
    if (app) {
      await app.close();
    }
  });

  it("POST /api/v1/auth/login conforms to contract", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ identifier: "user@example.com", password: "Password123!" });

    expect(response.status).toBe(201);
    expect(response).toSatisfyApiSpec();
  });

  it("POST /api/v1/auth/refresh conforms to contract", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Authorization", "Bearer refresh-token");

    expect(response.status).toBe(201);
    expect(response).toSatisfyApiSpec();
  });

  it("GET /api/v1/me conforms to contract", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Authorization", "Bearer access-token");

    expect(response.status).toBe(200);
    expect(response).toSatisfyApiSpec();
  });
});

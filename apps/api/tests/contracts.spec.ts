import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import jestOpenAPI from "jest-openapi";
import { readFileSync } from "node:fs";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/modules/app.module";
import { DomainErrorInterceptor } from "../src/common/interceptors/domain-error.interceptor";
import { AuthController } from "../src/modules/auth/auth.controller";
import { AuthService } from "../src/modules/auth/auth.service";
import { UsersController } from "../src/modules/users/users.controller";
import { TokensService, UsersService as UsersDomainService, type UsersRepository, type User } from "@org/domain";
import { JwtTokensProvider } from "../src/modules/auth/jwt.tokens.provider";
import { JwtUtil } from "../src/modules/auth/jwt.util";
import { PrismaService } from "../src/prisma/prisma.service";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.resolve(__dirname, "../../../packages/contracts/openapi.v1.json");
const rawSpec = JSON.parse(readFileSync(specPath, "utf-8"));
const specForValidation = { ...rawSpec, servers: [{ url: "/" }] };

jestOpenAPI(specForValidation);

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

const tokensServiceStub: Pick<TokensService, "verify"> = {
  verify: async () => ({ subject: testUser.id }),
};

const authServiceStub: Partial<AuthService> = {
  requestMagicLink: async () => ({ token: "magic-token-development" }),
  verifyMagicLink: async () => ({ accessToken: "access-token", refreshToken: "refresh-token" }),
  refresh: async () => ({ accessToken: "access-token", refreshToken: "refresh-token" }),
  logout: async () => undefined,
  registerUser: async () => ({ accessToken: "access-token", refreshToken: "refresh-token" }),
  login: async () => ({ accessToken: "access-token", refreshToken: "refresh-token" }),
};

const usersRepositoryStub: UsersRepository = {
  findById: async (id: string) => (id === testUser.id ? testUser : null),
  findByEmail: async () => null,
  create: async () => testUser,
  update: async () => testUser,
};

describe("OpenAPI contract", () => {
  let app: INestApplication;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.NODE_ENV = "production";

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider("UsersRepository")
      .useValue(usersRepositoryStub)
      .overrideProvider(AuthService)
      .useValue(authServiceStub)
      .overrideProvider(JwtTokensProvider)
      .useValue({
        signAccessToken: () => "access-token",
        signRefreshToken: () => "refresh-token",
        verifyToken: () => ({ subject: testUser.id }),
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
      .overrideProvider(TokensService)
      .useValue(tokensServiceStub)
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
      usersRepositoryStub
    );
  });

  afterAll(async () => {
    process.env.NODE_ENV = originalNodeEnv;
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

  it("POST /api/v1/auth/request-magic-link conforms to contract", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/request-magic-link")
      .send({ email: "user@example.com" });

    expect(response.status).toBe(201);
    expect(response.body.devToken).toBeUndefined();
    expect(response).toSatisfyApiSpec();
  });

  it("POST /api/v1/auth/verify-magic-link conforms to contract", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/verify-magic-link")
      .send({ email: "user@example.com", token: "magic-token-development-000000000000" });

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

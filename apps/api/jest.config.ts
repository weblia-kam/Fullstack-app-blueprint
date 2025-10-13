import type { Config } from "jest";
import { resolve } from "node:path";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "./",
  testMatch: ["<rootDir>/test/unit/**/*.spec.ts"],
  transform: {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      {
        tsconfig: resolve(__dirname, "tsconfig.spec.json"),
        isolatedModules: false,
      },
    ],
  },
  moduleNameMapper: {
    "^@org/domain$": resolve(__dirname, "../../packages/domain/src/index.ts"),
    "^@org/domain/(.*)$": resolve(__dirname, "../../packages/domain/src/$1"),
    "^@org/domain-adapters-prisma$": resolve(
      __dirname,
      "../../packages/domain-adapters-prisma/src/index.ts"
    ),
    "^(\\.{1,2}/(common|users|auth|prisma)/.*)\\.js$": "$1.ts",
    "^(\\.{1,2}/prisma\\.client)\\.js$": "$1.ts",
    "^(\\.{1,2}/users/.*)\\.js$": "$1.ts",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  collectCoverageFrom: [
    "<rootDir>/src/modules/auth/auth.service.ts",
  ],
  coverageDirectory: "<rootDir>/coverage/unit",
  coverageReporters: ["text", "lcov"],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
  clearMocks: true,
  verbose: true,
};

export default config;

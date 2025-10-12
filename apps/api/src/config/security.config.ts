import { z } from "zod";

type Env = Record<string, string | undefined>;

const schema = z.object({
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  COOKIE_SECRET: z.string().min(1, "COOKIE_SECRET is required"),
  ENCRYPTION_KEY: z.string().min(1, "ENCRYPTION_KEY is required")
});

export function validateSecurityConfig(env: Env = process.env) {
  if (env.NODE_ENV === "test") {
    return;
  }

  const result = schema.safeParse(env);
  if (!result.success) {
    const fieldErrors = Object.entries(result.error.flatten().fieldErrors)
      .flatMap(([field, messages]) => messages?.map((message) => `${field}: ${message}`) ?? [])
      .join(", ");
    throw new Error(
      `Security configuration invalid. Please set required secrets before starting the API. Missing/invalid: ${fieldErrors}`
    );
  }
}

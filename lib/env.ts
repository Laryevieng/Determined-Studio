import "server-only";
import { z } from "zod";
import { formatEnvIssues, publicEnvSchema } from "@/lib/env.public";

export { getPublicEnv, parsePublicEnv, publicEnvSchema, type PublicEnv } from "@/lib/env.public";

const positiveIntWithDefault = (defaultValue: number, fieldName: string) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? defaultValue : value),
    z.coerce
      .number()
      .int(`${fieldName} harus bilangan bulat positif.`)
      .positive(`${fieldName} harus lebih dari 0.`),
  );

export const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SECRET_KEY: z.string().trim().min(1, "SUPABASE_SECRET_KEY wajib diisi."),
  SESSION_IDLE_MINUTES: positiveIntWithDefault(480, "SESSION_IDLE_MINUTES"),
  LOGIN_MAX_ATTEMPTS: positiveIntWithDefault(8, "LOGIN_MAX_ATTEMPTS"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: source.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: source.SUPABASE_SECRET_KEY,
    SESSION_IDLE_MINUTES: source.SESSION_IDLE_MINUTES,
    LOGIN_MAX_ATTEMPTS: source.LOGIN_MAX_ATTEMPTS,
  });

  if (!parsed.success) {
    throw new Error(formatEnvIssues(parsed.error.issues));
  }

  return parsed.data;
}

export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env);
}

import { z } from "zod";

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url("NEXT_PUBLIC_SITE_URL harus berupa URL valid."),
  NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL harus berupa URL valid."),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .trim()
    .min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY wajib diisi."),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function formatEnvIssues(issues: z.core.$ZodIssue[]): string {
  const details = issues
    .map((issue) => {
      const key = issue.path.length > 0 ? issue.path.join(".") : "env";
      return `${key}: ${issue.message}`;
    })
    .join("; ");
  return `Konfigurasi variabel lingkungan tidak lengkap atau tidak valid (${details}).`;
}

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: source.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!parsed.success) {
    throw new Error(formatEnvIssues(parsed.error.issues));
  }

  return parsed.data;
}

export function getPublicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

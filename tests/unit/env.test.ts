import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parsePublicEnv, parseServerEnv } from "@/lib/env";

const VALID_PUBLIC = {
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://contoh-dev.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_contoh",
};

const VALID_SERVER = {
  ...VALID_PUBLIC,
  SUPABASE_SECRET_KEY: "sb_secret_contoh",
  SESSION_IDLE_MINUTES: "480",
  LOGIN_MAX_ATTEMPTS: "8",
};

describe("lib/env", () => {
  it("menerima variabel publik dan server yang lengkap", () => {
    expect(parsePublicEnv(VALID_PUBLIC)).toEqual(VALID_PUBLIC);
    expect(parseServerEnv(VALID_SERVER)).toEqual({
      ...VALID_PUBLIC,
      SUPABASE_SECRET_KEY: "sb_secret_contoh",
      SESSION_IDLE_MINUTES: 480,
      LOGIN_MAX_ATTEMPTS: 8,
    });
  });

  it("mengisi nilai default SESSION_IDLE_MINUTES dan LOGIN_MAX_ATTEMPTS saat kosong", () => {
    const parsed = parseServerEnv({
      ...VALID_PUBLIC,
      SUPABASE_SECRET_KEY: "sb_secret_contoh",
    });
    expect(parsed.SESSION_IDLE_MINUTES).toBe(480);
    expect(parsed.LOGIN_MAX_ATTEMPTS).toBe(8);
  });

  it("menghasilkan galat jelas bila variabel wajib tidak lengkap", () => {
    expect(() => parsePublicEnv({})).toThrow(/NEXT_PUBLIC_SITE_URL/);
    expect(() => parsePublicEnv({})).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => parsePublicEnv({})).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    expect(() => parseServerEnv(VALID_PUBLIC)).toThrow(/SUPABASE_SECRET_KEY/);
  });

  it("menolak URL atau angka konfigurasi yang tidak valid", () => {
    expect(() =>
      parsePublicEnv({
        ...VALID_PUBLIC,
        NEXT_PUBLIC_SUPABASE_URL: "bukan-url",
      }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);

    expect(() =>
      parseServerEnv({
        ...VALID_SERVER,
        SESSION_IDLE_MINUTES: "0",
      }),
    ).toThrow(/SESSION_IDLE_MINUTES/);
  });
});

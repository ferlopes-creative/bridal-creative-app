import { afterEach, describe, expect, it, vi } from "vitest";
import { createServiceRoleClient } from "./auth-email-login-core";

describe("createServiceRoleClient", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("rejects publishable/anon key used as service role", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_publishable_test_key";
    process.env.VITE_SUPABASE_ANON_KEY = "sb_publishable_other";

    expect(() => createServiceRoleClient()).toThrow(/service_role/i);
  });

  it("rejects JWT with anon role used as service role", () => {
    const anonJwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = anonJwt;

    expect(() => createServiceRoleClient()).toThrow(/chave anon/i);
  });

  it("accepts sb_secret service keys", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_test_key_1234567890";

    const client = createServiceRoleClient();
    expect(client).toBeDefined();
  });

  it("creates client with a distinct service role key", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.sig";
    process.env.VITE_SUPABASE_ANON_KEY = "sb_publishable_anon";

    const client = createServiceRoleClient();
    expect(client).toBeDefined();
  });
});

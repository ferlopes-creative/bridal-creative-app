import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";

/** Em produção sem env na Vercel, não podemos lançar erro no import — senão o React nem monta (página branca). */
export const isSupabaseConfigured = Boolean(url && anonKey);

// URLs fictícias válidas só para montar o cliente; chamadas falham até configurar env.
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InBsYWNlaG9sZGVyIn0.invalid-placeholder";

function createSafeClient(): SupabaseClient {
  return createClient(
    isSupabaseConfigured ? url : PLACEHOLDER_URL,
    isSupabaseConfigured ? anonKey : PLACEHOLDER_ANON_KEY,
    {
      auth: {
        persistSession: isSupabaseConfigured,
        autoRefreshToken: isSupabaseConfigured,
      },
    }
  );
}

export const supabase = createSafeClient();

if (import.meta.env.DEV && !isSupabaseConfigured) {
  console.warn(
    "[bridal-creative] Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env para usar o Supabase."
  );
}

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export const LOGIN_PATH = "/login";

export async function hasAuthenticatedSession(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { data, error } = await supabase.auth.getSession();
  if (error) return false;
  return Boolean(data.session);
}

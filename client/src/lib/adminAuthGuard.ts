import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export const ADMIN_LOGIN_PATH = "/admin/login";

export async function hasAdminAccess(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) return false;

  const { data, error } = await supabase.rpc("is_login_admin");
  if (error) return false;
  return Boolean(data);
}

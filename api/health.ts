import { describeServiceRoleKey } from "./auth-email-login-core.js";

export default function handler(_req: unknown, res: any) {
  const serviceKey = describeServiceRoleKey();
  const supabase =
    Boolean(process.env.SUPABASE_URL?.trim()) && serviceKey.configured && serviceKey.valid;
  res.status(200).json({
    ok: true,
    api: true,
    supabase,
    supabaseServiceKey: serviceKey.kind,
  });
}

export default function handler(_req: unknown, res: any) {
  res.status(200).json({
    ok: true,
    api: true,
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}

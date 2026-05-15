import { processAdminLogin } from "./admin-login-serve";

export default async function handler(req: { method?: string; body?: unknown }, res: { status: (n: number) => { json: (b: unknown) => void } }) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const result = await processAdminLogin((req.body || {}) as Record<string, unknown>);
  return res.status(result.status).json(result.body);
}

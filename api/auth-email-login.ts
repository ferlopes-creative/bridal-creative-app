import { processAuthEmailLogin } from "./auth-email-login-serve";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const result = await processAuthEmailLogin((req.body || {}) as Record<string, unknown>);
  return res.status(result.status).json(result.body);
}

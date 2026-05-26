import "./bootstrap-env.js";
import { parseRequestBody } from "./parse-request-body.js";
import { processAdminLogin } from "./admin-login-serve.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = await parseRequestBody(req);
  const result = await processAdminLogin(body);
  return res.status(result.status).json(result.body);
}

import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { loadEnvFromFile } from "./load-env.js";
import caktoWebhookHandler from "../api/cakto-webhook.js";
import hotmartWebhookHandler from "../api/hotmart-webhook.js";

loadEnvFromFile();
import { processAdminLogin } from "../api/admin-login-serve.js";
import { processAdminGrantPurchase } from "../api/admin-grant-purchase-serve.js";
import { describeServiceRoleKey } from "../api/auth-email-login-core.js";
import { processAuthEmailLogin } from "../api/auth-email-login-serve.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  app.use("/api", (_req, res, next) => {
    res.setHeader("X-Bridal-Api", "node");
    next();
  });

  app.post("/api/auth-email-login", async (req, res) => {
    const result = await processAuthEmailLogin((req.body || {}) as Record<string, unknown>);
    res.status(result.status).json(result.body);
  });

  app.post("/api/admin-login", async (req, res) => {
    const result = await processAdminLogin((req.body || {}) as Record<string, unknown>);
    res.status(result.status).json(result.body);
  });

  app.post("/api/admin-grant-purchase", async (req, res) => {
    const authHeader =
      typeof req.headers.authorization === "string" ? req.headers.authorization : undefined;
    const result = await processAdminGrantPurchase(
      (req.body || {}) as Record<string, unknown>,
      authHeader
    );
    res.status(result.status).json(result.body);
  });

  app.post("/api/cakto-webhook", (req, res) => {
    void caktoWebhookHandler(req, res);
  });

  app.post("/api/hotmart-webhook", (req, res) => {
    void hotmartWebhookHandler(req, res);
  });

  app.get("/api/health", (_req, res) => {
    const serviceKey = describeServiceRoleKey();
    const supabase =
      Boolean(process.env.SUPABASE_URL?.trim()) && serviceKey.configured && serviceKey.valid;
    res.json({
      ok: true,
      api: true,
      supabase,
      supabaseServiceKey: serviceKey.kind,
    });
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

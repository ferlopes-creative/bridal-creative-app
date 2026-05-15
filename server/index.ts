import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { processAdminLogin } from "../api/admin-login-serve.js";
import { processAuthEmailLogin } from "../api/auth-email-login-serve.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  app.post("/api/auth-email-login", async (req, res) => {
    const result = await processAuthEmailLogin((req.body || {}) as Record<string, unknown>);
    res.status(result.status).json(result.body);
  });

  app.post("/api/admin-login", async (req, res) => {
    const result = await processAdminLogin((req.body || {}) as Record<string, unknown>);
    res.status(result.status).json(result.body);
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

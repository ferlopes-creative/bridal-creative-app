import { loadEnvFromFile } from "../server/load-env.js";

/** Carrega `.env` quando a função roda fora do bundle PM2 (ex.: `vercel dev`). */
loadEnvFromFile();

export async function parseRequestBody(req: {
  body?: unknown;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
}): Promise<Record<string, unknown>> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    if (typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      return req.body as Record<string, unknown>;
    }
  }

  if (!req.on) return {};

  return new Promise((resolve) => {
    let raw = "";
    req.on!("data", (chunk: unknown) => {
      raw += typeof chunk === "string" ? chunk : String(chunk);
    });
    req.on!("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>);
      } catch {
        resolve({});
      }
    });
  });
}

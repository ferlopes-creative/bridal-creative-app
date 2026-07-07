import { resolveAuthenticatedSession } from "@/lib/authSession";

export const LOGIN_PATH = "/login";

export async function hasAuthenticatedSession(): Promise<boolean> {
  const session = await resolveAuthenticatedSession();
  return Boolean(session);
}

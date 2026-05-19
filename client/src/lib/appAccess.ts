import { hasAuthenticatedSession } from "@/lib/authGuard";
import { isGuestMode } from "@/lib/guestMode";

export async function hasAppAccess(): Promise<boolean> {
  if (isGuestMode()) return true;
  return hasAuthenticatedSession();
}

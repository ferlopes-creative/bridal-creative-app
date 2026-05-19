const GUEST_MODE_KEY = "bridal_guest_mode";

export function isGuestMode(): boolean {
  try {
    return localStorage.getItem(GUEST_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setGuestMode(active: boolean): void {
  try {
    if (active) {
      localStorage.setItem(GUEST_MODE_KEY, "1");
    } else {
      localStorage.removeItem(GUEST_MODE_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearGuestMode(): void {
  setGuestMode(false);
}

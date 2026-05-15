export const WELCOME_POPUP_STORAGE_KEY = "bridal_show_welcome_popup";

export function markWelcomePopupPending(): void {
  sessionStorage.setItem(WELCOME_POPUP_STORAGE_KEY, "1");
}

export function consumeWelcomePopupPending(): boolean {
  const pending = sessionStorage.getItem(WELCOME_POPUP_STORAGE_KEY);
  if (!pending) return false;
  sessionStorage.removeItem(WELCOME_POPUP_STORAGE_KEY);
  return true;
}

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  WELCOME_POPUP_STORAGE_KEY,
  consumeWelcomePopupPending,
  markWelcomePopupPending,
} from "./welcomePopup";

describe("welcomePopup", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    });
  });

  it("marks and consumes welcome popup once", () => {
    expect(consumeWelcomePopupPending()).toBe(false);
    markWelcomePopupPending();
    expect(store.get(WELCOME_POPUP_STORAGE_KEY)).toBe("1");
    expect(consumeWelcomePopupPending()).toBe(true);
    expect(consumeWelcomePopupPending()).toBe(false);
  });
});

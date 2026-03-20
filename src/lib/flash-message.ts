const FLASH_MESSAGE_KEY = "sip_flash_message";

export function setFlashMessage(message: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FLASH_MESSAGE_KEY, message);
  } catch {
    // ignore storage errors
  }
}

export function consumeFlashMessage() {
  if (typeof window === "undefined") return null;
  try {
    const message = window.sessionStorage.getItem(FLASH_MESSAGE_KEY);
    if (message) {
      window.sessionStorage.removeItem(FLASH_MESSAGE_KEY);
    }
    return message;
  } catch {
    return null;
  }
}


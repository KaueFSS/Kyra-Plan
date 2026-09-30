const DISPLAY_NAME_KEY = "focusflow.displayName";
const DEFAULT_DISPLAY_NAME = "Você";

export function getDisplayName(): string {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) || DEFAULT_DISPLAY_NAME;
  } catch {
    return DEFAULT_DISPLAY_NAME;
  }
}

export function setDisplayName(name: string): void {
  try {
    const trimmed = name.trim();
    if (trimmed) localStorage.setItem(DISPLAY_NAME_KEY, trimmed);
    else localStorage.removeItem(DISPLAY_NAME_KEY);
  } catch {
    // Non-fatal: the greeting just falls back to the default name.
  }
}

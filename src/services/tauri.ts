import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export class ApiError extends Error {}

/**
 * Every backend command returns `Result<T, AppError>`, and `AppError`
 * serializes as a plain string message. Centralizing the invoke call here
 * means every service module gets the same error shape (an `ApiError`
 * carrying a user-safe Portuguese message) instead of each call site
 * handling Tauri's raw rejection differently.
 */
export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await tauriInvoke<T>(command, args);
  } catch (err) {
    const message = typeof err === "string" ? err : "Ocorreu um erro inesperado.";
    throw new ApiError(message);
  }
}

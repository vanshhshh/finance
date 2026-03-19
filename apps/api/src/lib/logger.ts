export const logger = {
  info(message: string, payload?: unknown) {
    console.info(`[INFO] ${message}`, payload ?? "");
  },
  warn(message: string, payload?: unknown) {
    console.warn(`[WARN] ${message}`, payload ?? "");
  },
  error(message: string, payload?: unknown) {
    console.error(`[ERROR] ${message}`, payload ?? "");
  },
};


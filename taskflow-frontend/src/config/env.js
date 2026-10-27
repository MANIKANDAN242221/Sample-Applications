function required(name, value) {
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export const env = Object.freeze({
  apiBaseUrl: required('VITE_API_BASE_URL', import.meta.env.VITE_API_BASE_URL).replace(/\/$/, ''),
  apiTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 15000,
  isDev: import.meta.env.DEV,
});

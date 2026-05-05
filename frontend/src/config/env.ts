// Validated client-side env. Vite inlines `VITE_*` at build time.
const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

if (!env.apiUrl) {
  // Fail early so misconfig surfaces in the console rather than as cryptic 404s
  console.error('VITE_API_URL is not set. Falling back to http://localhost:4000/api/v1');
}

export default env;

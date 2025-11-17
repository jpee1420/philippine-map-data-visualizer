// Simple dev-only logger to reduce console noise in production
export function debug(...args) {
  if (import.meta.env && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(...args)
  }
}

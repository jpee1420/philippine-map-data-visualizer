export function debug(...args) {
  if (import.meta.env && import.meta.env.DEV) {
    console.log(...args)
  }
}

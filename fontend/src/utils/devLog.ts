/**
 * Console output only in development. In production builds it is a no-op.
 * Use instead of `console.log` for debug messages you do not want shipped.
 */
export function devLog(...args: unknown[]): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

/**
 * `console.warn` only in development.
 */
export function devWarn(...args: unknown[]): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
}

/**
 * `console.error` only in development (e.g. non-fatal debug errors).
 * For real errors in production, use Sentry or `console.error` as needed.
 */
export function devError(...args: unknown[]): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
}

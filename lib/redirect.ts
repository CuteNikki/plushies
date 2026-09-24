/**
 * A `next` parameter as a path on this site to go to, or `fallback`. Only
 * plain paths like /plushies/mochi pass, so links can't send people to
 * another site after signing in.
 */
export function safeNext(value: unknown, fallback = '/dashboard') {
  if (typeof value !== 'string') return fallback;
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return fallback;
  }
  return value;
}

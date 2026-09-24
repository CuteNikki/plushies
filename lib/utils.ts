export { cn } from 'cn';

/** e.g. '1 photo', '3 photos'. */
export function count(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

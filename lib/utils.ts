export { cn } from 'cn';

/** e.g. '1 photo', '3 photos'. */
export function count(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** e.g. '512 KB', '1.4 GB'. Uses 1024, like storage limits do. */
export function formatBytes(bytes: number) {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'unit',
    unit: units[unit],
    unitDisplay: 'short',
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(value);
}

// Shared by the ban form and the server, so keep this free of server-only imports.

/** The longest reason an admin can give. */
export const BAN_REASON_MAX = 500;

/** How long a ban can last, by days. 'permanent' lasts until it's lifted. */
export const banDurations = {
  '1': '1 day',
  '3': '3 days',
  '7': '1 week',
  '30': '1 month',
  permanent: 'Until lifted',
} as const;

export type BanDuration = keyof typeof banDurations;

export function isBanDuration(value: string): value is BanDuration {
  return Object.hasOwn(banDurations, value);
}

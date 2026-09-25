// Shared by the report form and the server, so keep this free of server-only imports.

import { ReportReason } from '@/lib/generated/prisma/enums';

/** Why someone can report a comment, as the form lists them. */
export const reportReasons = {
  [ReportReason.SPAM]: {
    label: 'Spam',
    description: 'Ads, scams or the same thing over and over',
  },
  [ReportReason.HARASSMENT]: {
    label: 'Harassment',
    description: 'Mean to someone, or about someone',
  },
  [ReportReason.INAPPROPRIATE]: {
    label: 'Inappropriate',
    description: 'Not okay for everyone to see here',
  },
  [ReportReason.OTHER]: {
    label: 'Something else',
    description: 'Say what in the note',
  },
} as const satisfies Record<
  ReportReason,
  { label: string; description: string }
>;

export function isReportReason(value: string): value is ReportReason {
  return Object.hasOwn(reportReasons, value);
}

/** The longest note someone can add to a report. */
export const REPORT_NOTE_MAX = 500;

/**
 * A comment is hidden until an editor or admin looks at it once this many
 * people report it within REPORT_WINDOW_HOURS.
 */
export const REPORTS_TO_HIDE = 3;
export const REPORT_WINDOW_HOURS = 24;

/**
 * How many comments an account can report an hour, so no one can hide lots
 * of them with a few accounts.
 */
export const REPORTS_PER_HOUR = 10;

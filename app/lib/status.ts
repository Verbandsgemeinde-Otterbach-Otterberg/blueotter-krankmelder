/** Processing status of a submission in the dashboard. */
export const SUBMISSION_STATUSES = ['new', 'processed'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  new: 'Neu',
  processed: 'Bearbeitet',
  needs_au: 'AU erforderlich',
};

export function isSubmissionStatus(value: unknown): value is SubmissionStatus {
  return typeof value === 'string' && (SUBMISSION_STATUSES as readonly string[]).includes(value);
}

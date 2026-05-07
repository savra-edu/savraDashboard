/** Matches PostgreSQL enum "AssignedTo" on conversion_feedback.assigned_to */

export const ASSIGNED_TO_VALUES = ['NONE', 'SUVANSH', 'PRIYANA', 'CALLER_A', 'CALLER_B'] as const;

export type AssignedToValue = (typeof ASSIGNED_TO_VALUES)[number];

export function isAssignedToValue(v: string): v is AssignedToValue {
  return (ASSIGNED_TO_VALUES as readonly string[]).includes(v);
}

export const ASSIGNED_TO_LABELS: Record<AssignedToValue, string> = {
  NONE: 'Unassigned',
  SUVANSH: 'Suvansh',
  PRIYANA: 'Priyana',
  CALLER_A: 'Caller A',
  CALLER_B: 'Caller B',
};

export function parseAssignedTo(v: unknown): AssignedToValue {
  return typeof v === 'string' && isAssignedToValue(v) ? v : 'NONE';
}

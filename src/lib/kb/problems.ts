// The problems inside one merged ticket, by what is actually wrong, not by subject line.
// causes.ts sorts by tenant and channel; the desk's own reading (desk-notes.json) adds what a
// tenant can't tell you: a date that moved by one day was never flipped, so it is not the parser.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'month-first' | 'form-hint' | 'one-day' | 'unplaced';
export const PROBLEMS: readonly Problem[] = ['month-first', 'form-hint', 'one-day', 'unplaced'];

export const PROBLEM_TITLE: Record<Problem, string> = {
  'month-first': 'Shared parser reads dates month first in day-first locales',
  'form-hint': 'booking-v3 date hint says MM/DD/YYYY to day-first tenants',
  'one-day': 'Dates move by one day (time zone), not flipped',
  unplaced: 'No tenant on file: cause unknown',
};

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'one-day';
  const cause = causeOf(r, t);
  if (cause === 'parser') return 'month-first';
  if (cause === 'hint') return 'form-hint';
  return 'unplaced';
}

export type ProblemGroup = { problem: Problem; reports: Report[]; tenants: number; firstSeen: string; lastSeen: string };

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { merged: number; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const groups = PROBLEMS.map((problem) => {
    const reports = merged.filter((r) => problemOf(r, tenantOf(r), oneDayMove) === problem);
    const days = reports.map((r) => r.receivedAt.slice(0, 10)).sort();
    return {
      problem,
      reports,
      tenants: new Set(reports.map((r) => r.tenant)).size,
      firstSeen: days[0],
      lastSeen: days[days.length - 1],
    };
  }).filter((g) => g.reports.length > 0);
  return { merged: merged.length, groups };
}

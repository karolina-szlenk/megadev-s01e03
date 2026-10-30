// The problems inside one merged ticket, by what is actually wrong, not by subject line.
// Counts follow the desk's own view (causes.ts, CauseTable): every report is counted where its
// tenant and channel file it. The desk's reading (desk-notes.json) adds what a tenant can't tell
// you: a date that moved by one day was never flipped. Those reports get their own row, and stay
// counted where they are filed, footnoted there, as the desk does.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'month-first' | 'form-hint' | 'one-day' | 'unplaced';
export const PROBLEMS: readonly Problem[] = ['month-first', 'form-hint', 'one-day', 'unplaced'];

export const PROBLEM_TITLE: Record<Problem, string> = {
  'month-first': 'Shared parser reads dates month first in day-first locales',
  'form-hint': 'booking-v3 date hint says MM/DD/YYYY to day-first tenants',
  'one-day': 'Dates move by one day (time zone), not flipped',
  unplaced: 'No tenant on file: cause unknown',
};

// Where the desk files a report: by tenant and channel.
export function problemOf(r: Report, t: Tenant | undefined): Exclude<Problem, 'one-day'> {
  const cause = causeOf(r, t);
  if (cause === 'parser') return 'month-first';
  if (cause === 'hint') return 'form-hint';
  return 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: number;
  firstSeen: string;
  lastSeen: string;
  // one-day moves inside this row (desk-notes.json), or for the one-day row: where they are filed
  footnote: { oneDay: number } | { filedUnder: Problem[] } | null;
};

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { merged: number; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const isOneDay = (r: Report) => oneDayMove.includes(r.id);
  const groups = PROBLEMS.map((problem) => {
    const reports = merged.filter((r) => (problem === 'one-day' ? isOneDay(r) : problemOf(r, tenantOf(r)) === problem));
    const days = reports.map((r) => r.receivedAt.slice(0, 10)).sort();
    const oneDay = reports.filter(isOneDay).length;
    return {
      problem,
      reports,
      tenants: new Set(reports.map((r) => r.tenant)).size,
      firstSeen: days[0],
      lastSeen: days[days.length - 1],
      footnote:
        problem === 'one-day'
          ? { filedUnder: [...new Set(reports.map((r) => problemOf(r, tenantOf(r))))] }
          : oneDay
            ? { oneDay }
            : null,
    };
  }).filter((g) => g.reports.length > 0);
  return { merged: merged.length, groups };
}

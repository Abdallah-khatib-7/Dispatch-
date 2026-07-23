import type { DedupCandidate } from '../types/index.ts';

// The core trust mechanism. Two emails describe the SAME application when they
// hit the same account + same normalized company, their roles are compatible,
// and they land within a date window. Pure functions only — no DB, no I/O — so
// the behavior is fully unit-testable (see dedup.test.ts).

// Window covers the two known duplicate patterns:
//  - LinkedIn sends a second "reminder" notification ~3 days after the original.
//  - Workable/ATS send a confirmation then a follow-up over several days.
// 14 days comfortably contains both without merging unrelated re-applications
// months apart.
export const DEDUP_WINDOW_DAYS = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const daysBetween = (a: Date, b: Date): number =>
  Math.abs(a.getTime() - b.getTime()) / MS_PER_DAY;

// Roles are "compatible" if they are equal, or if either side is unknown/empty
// (e.g. a LinkedIn notification that names the company but not the exact role).
const rolesCompatible = (a: string, b: string): boolean => {
  if (a === '' || b === '') return true;
  if (a === b) return true;
  // One role fully contains the other ("software engineer" vs
  // "software engineer ii") — treat as the same requisition.
  return a.includes(b) || b.includes(a);
};

export const isSameApplication = (a: DedupCandidate, b: DedupCandidate): boolean => {
  if (a.account !== b.account) return false;
  if (a.companyNormalized === '' || b.companyNormalized === '') return false;
  if (a.companyNormalized !== b.companyNormalized) return false;
  if (!rolesCompatible(a.roleNormalized, b.roleNormalized)) return false;
  return daysBetween(a.receivedAt, b.receivedAt) <= DEDUP_WINDOW_DAYS;
};

// From a set of existing applications, pick the one a new candidate belongs to.
// Prefers an exact-role match, then the closest in time, so a candidate never
// silently attaches to a coincidental company-only match when a better one
// exists.
export const findCanonicalMatch = <T extends DedupCandidate>(
  candidate: DedupCandidate,
  existing: readonly T[],
): T | null => {
  const matches = existing.filter((e) => isSameApplication(candidate, e));
  if (matches.length === 0) return null;

  matches.sort((x, y) => {
    const exactX = x.roleNormalized === candidate.roleNormalized ? 0 : 1;
    const exactY = y.roleNormalized === candidate.roleNormalized ? 0 : 1;
    if (exactX !== exactY) return exactX - exactY;
    return daysBetween(candidate.receivedAt, x.receivedAt) -
      daysBetween(candidate.receivedAt, y.receivedAt);
  });

  return matches[0]!;
};

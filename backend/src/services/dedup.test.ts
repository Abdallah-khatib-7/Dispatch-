import assert from 'node:assert/strict';
import { isSameApplication, findCanonicalMatch, DEDUP_WINDOW_DAYS } from './dedup.ts';
import { normalizeCompany, normalizeRole } from './normalize.ts';
import type { DedupCandidate } from '../types/index.ts';

// Practical tests: the two real duplicate patterns the product must collapse,
// plus the cases it must NOT merge. Run: npm run test:dedup

const cand = (
  company: string,
  role: string,
  isoDate: string,
  account = 'me@gmail.com',
): DedupCandidate => ({
  account,
  companyNormalized: normalizeCompany(company),
  roleNormalized: normalizeRole(role),
  receivedAt: new Date(isoDate),
});

let passed = 0;
const check = (name: string, fn: () => void): void => {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
};

// --- LinkedIn: original + ~3-day reminder for the same application -> collapse.
check('LinkedIn original and 3-day reminder are the same application', () => {
  const original = cand('Stripe', 'Backend Engineer', '2026-07-01T09:00:00Z');
  const reminder = cand('Stripe', 'Backend Engineer', '2026-07-04T09:00:00Z');
  assert.equal(isSameApplication(original, reminder), true);
});

// --- LinkedIn notification often omits the role; company match within window
// should still collapse against the ATS receipt that has the role.
check('LinkedIn company-only notice collapses with ATS receipt naming the role', () => {
  const linkedin = cand('Stripe', '', '2026-07-01T09:00:00Z');
  const ats = cand('Stripe, Inc.', 'Backend Engineer', '2026-07-01T09:05:00Z');
  assert.equal(isSameApplication(linkedin, ats), true);
});

// --- Workable multi-email sequence (confirmation then follow-up) -> one app.
check('Workable confirmation and later follow-up are one application', () => {
  const confirm = cand('Acme AB', 'Product Designer', '2026-07-10T12:00:00Z');
  const followUp = cand('Acme', 'Product Designer', '2026-07-16T08:30:00Z');
  assert.equal(isSameApplication(confirm, followUp), true);
});

// --- Same company, genuinely different role -> two applications.
check('Same company, different role stays separate', () => {
  const a = cand('Google', 'Software Engineer', '2026-07-01T09:00:00Z');
  const b = cand('Google', 'Data Scientist', '2026-07-02T09:00:00Z');
  assert.equal(isSameApplication(a, b), false);
});

// --- Same company + role but far apart in time -> separate (re-application).
check('Same company+role outside the window stays separate', () => {
  const a = cand('Netflix', 'SRE', '2026-01-01T09:00:00Z');
  const b = cand('Netflix', 'SRE', '2026-07-01T09:00:00Z');
  assert.equal(daysBetween_gt_window(a, b), true);
  assert.equal(isSameApplication(a, b), false);
});

function daysBetween_gt_window(a: DedupCandidate, b: DedupCandidate): boolean {
  const ms = Math.abs(a.receivedAt.getTime() - b.receivedAt.getTime());
  return ms / (24 * 60 * 60 * 1000) > DEDUP_WINDOW_DAYS;
}

// --- Different companies never merge.
check('Different companies never merge', () => {
  const a = cand('Stripe', 'Engineer', '2026-07-01T09:00:00Z');
  const b = cand('Square', 'Engineer', '2026-07-01T09:00:00Z');
  assert.equal(isSameApplication(a, b), false);
});

// --- findCanonicalMatch prefers exact-role match over a company-only match.
check('findCanonicalMatch prefers the exact-role application', () => {
  const candidate = cand('Stripe', 'Backend Engineer', '2026-07-05T09:00:00Z');
  const existing = [
    { ...cand('Stripe', '', '2026-07-01T09:00:00Z'), id: 1 },
    { ...cand('Stripe', 'Backend Engineer', '2026-07-02T09:00:00Z'), id: 2 },
  ];
  const match = findCanonicalMatch(candidate, existing);
  assert.equal(match?.id, 2);
});

// --- findCanonicalMatch returns null when nothing matches.
check('findCanonicalMatch returns null with no match', () => {
  const candidate = cand('Stripe', 'Backend Engineer', '2026-07-05T09:00:00Z');
  const existing = [{ ...cand('Square', 'Backend Engineer', '2026-07-04T09:00:00Z'), id: 9 }];
  assert.equal(findCanonicalMatch(candidate, existing), null);
});

console.log(`\n${passed} dedup checks passed.`);

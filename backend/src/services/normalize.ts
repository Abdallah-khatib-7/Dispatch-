// Normalization for dedup matching. Kept deliberately conservative and readable:
// the goal is to collapse trivial formatting differences ("Google Inc." vs
// "google") without merging genuinely different companies or roles.

const COMPANY_SUFFIXES = [
  'inc', 'incorporated', 'llc', 'l l c', 'ltd', 'limited', 'gmbh', 'corp',
  'corporation', 'co', 'company', 'plc', 'ab', 'oy', 'as', 'bv', 'sa', 'srl',
];

const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();

const stripPunctuation = (s: string): string =>
  s.normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ');

export const normalizeCompany = (raw: string | null | undefined): string => {
  if (!raw) return '';
  let s = stripPunctuation(raw.toLowerCase());
  s = collapse(s);
  // Drop a trailing legal suffix ("google inc" -> "google").
  const words = s.split(' ');
  while (words.length > 1 && COMPANY_SUFFIXES.includes(words[words.length - 1]!)) {
    words.pop();
  }
  return collapse(words.join(' '));
};

const ROLE_NOISE = /\((remote|hybrid|on-?site|contract|full[- ]?time|part[- ]?time|[a-z]{2,3}(-[a-z]{2,3})?)\)/gi;

const SENIORITY_SYNONYMS: Record<string, string> = {
  'sr': 'senior',
  'snr': 'senior',
  'jr': 'junior',
  'mid': 'mid',
};

export const normalizeRole = (raw: string | null | undefined): string => {
  if (!raw) return '';
  let s = raw.toLowerCase();
  s = s.replace(ROLE_NOISE, ' ');
  // Drop trailing requisition IDs / location tails after a dash or pipe.
  s = s.replace(/[-–|,]\s*(req\.?\s*)?[a-z]?\d[\w-]*\s*$/i, ' ');
  s = stripPunctuation(s);
  s = collapse(s);
  const words = s.split(' ').map((w) => SENIORITY_SYNONYMS[w] ?? w);
  return collapse(words.join(' '));
};

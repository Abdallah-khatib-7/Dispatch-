import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';
import { APPLICATION_STATUSES, type ApplicationStatus, type ExtractionResult, type ParsedEmail } from '../types/index.ts';

// The LLM sees only the minimum: subject + a trimmed body excerpt. Never the
// full MIME message, never the rest of the inbox.
const MAX_BODY_CHARS = 1500;

const buildSnippet = (email: ParsedEmail): string => {
  const body = email.bodyText || email.snippet;
  const trimmed = body.length > MAX_BODY_CHARS ? `${body.slice(0, MAX_BODY_CHARS)}…` : body;
  return `From: ${email.from}\nSubject: ${email.subject}\n\n${trimmed}`;
};

const clampConfidence = (n: unknown): number => {
  const v = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.min(1, Math.max(0, v));
};

const coerceStatus = (s: unknown): ApplicationStatus => {
  const v = String(s ?? '').toLowerCase();
  return (APPLICATION_STATUSES as readonly string[]).includes(v) ? (v as ApplicationStatus) : 'other';
};

// ---------------------------------------------------------------------------
// Heuristic extractor. Deterministic, no network. Used when the LLM is
// disabled, rate-limited, or errors — and as the offline test path. Covers the
// documented real-world patterns.
// ---------------------------------------------------------------------------

const ATS_DOMAINS = /(linkedin|greenhouse|greenhouse-mail|workable|teamtailor|myworkday|workday|lever|ashbyhq|smartrecruiters)\./i;

const senderCompany = (from: string): string | null => {
  const m = /@([\w.-]+)/.exec(from);
  if (!m) return null;
  const domain = m[1]!;
  if (ATS_DOMAINS.test(domain)) return null;
  const parts = domain.split('.');
  const core = parts.length >= 2 ? parts[parts.length - 2]! : parts[0]!;
  if (['gmail', 'googlemail', 'outlook', 'hotmail', 'yahoo', 'icloud'].includes(core)) return null;
  return core;
};

export const heuristicExtract = (email: ParsedEmail): ExtractionResult => {
  const hay = `${email.subject}\n${email.bodyText || email.snippet}`;
  const base = { extractor: 'heuristic' as const, status: 'applied' as ApplicationStatus };

  // LinkedIn: "Your application was sent to <Company>"
  let m = /your application was sent to\s+([A-Z0-9][^\n.!]{1,80})/i.exec(hay);
  if (m) {
    return { ...base, company: m[1]!.trim(), role: null, confidence: 0.9,
      reasoning: 'LinkedIn "application was sent to" pattern', isJobApplication: true };
  }

  // ATS: "Thank you for applying to <Role> at <Company>"
  m = /thank you for applying (?:to|for)\s+(.+?)\s+at\s+([A-Z0-9][^\n.!]{1,80})/i.exec(hay);
  if (m) {
    return { ...base, role: m[1]!.trim(), company: m[2]!.trim(), confidence: 0.9,
      reasoning: 'ATS "thank you for applying to <role> at <company>" pattern', isJobApplication: true };
  }

  // "We received your application for <Role>" — company from sender domain.
  m = /(?:we(?:'ve| have)? received|received) your application (?:for|to)\s+(.+?)[.!\n]/i.exec(hay);
  if (m) {
    return { ...base, role: m[1]!.trim(), company: senderCompany(email.from), confidence: 0.8,
      reasoning: 'ATS "received your application for <role>" pattern', isJobApplication: true };
  }

  // "application for <Role> at <Company>"
  m = /application for\s+(.+?)\s+at\s+([A-Z0-9][^\n.!]{1,80})/i.exec(hay);
  if (m) {
    return { ...base, role: m[1]!.trim(), company: m[2]!.trim(), confidence: 0.75,
      reasoning: 'Generic "application for <role> at <company>" pattern', isJobApplication: true };
  }

  return { extractor: 'heuristic', company: senderCompany(email.from), role: null, status: 'other',
    confidence: 0.2, reasoning: 'No known application pattern matched', isJobApplication: false };
};

// ---------------------------------------------------------------------------
// OpenAI extractor via the REST API (no SDK dependency).
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You classify a single email as a job-application confirmation and extract structured fields.
Return ONLY JSON: {"isJobApplication": boolean, "company": string|null, "role": string|null, "status": "applied"|"assessment"|"interview"|"offer"|"rejected"|"other", "confidence": number, "reasoning": string}.
Rules:
- isJobApplication is true only for emails confirming/acknowledging that the recipient applied to a job, or updating the status of such an application (LinkedIn "your application was sent to X", ATS receipts like Workable/Greenhouse/Teamtailor/Workday "thank you for applying to <role> at <company>", interview invites, rejections).
- Newsletters, job-alert digests, marketing, and "jobs you may be interested in" are NOT applications: isJobApplication false, confidence low.
- company/role are the specific company and role applied to, or null if not clearly stated.
- confidence is 0..1 reflecting how sure you are this is a genuine application email with the fields you extracted.
- reasoning: one short sentence.`;

interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[];
}

export const openaiExtract = async (email: ParsedEmail): Promise<ExtractionResult> => {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.openai.apiKey}`,
    },
    body: JSON.stringify({
      model: env.openai.model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildSnippet(email) },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenAI API ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as OpenAiChatResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned empty content');

  const parsed = JSON.parse(content) as Record<string, unknown>;
  return {
    extractor: 'openai',
    isJobApplication: Boolean(parsed.isJobApplication),
    company: parsed.company ? String(parsed.company).trim() : null,
    role: parsed.role ? String(parsed.role).trim() : null,
    status: coerceStatus(parsed.status),
    confidence: clampConfidence(parsed.confidence),
    reasoning: String(parsed.reasoning ?? '').slice(0, 500),
  };
};

// Orchestrates provider choice. allowLlm reflects the rate-limiter decision.
export const extract = async (
  email: ParsedEmail,
  opts: { allowLlm: boolean },
): Promise<ExtractionResult> => {
  if (env.openai.enabled && opts.allowLlm) {
    try {
      return await openaiExtract(email);
    } catch (err) {
      logger.warn('OpenAI extraction failed; using heuristic fallback', {
        messageId: email.messageId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return heuristicExtract(email);
};

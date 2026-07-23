import { logger } from '../config/logger.ts';
import { env } from '../config/env.ts';
import { getAuthorizedClient } from './googleAuth.ts';
import { listMessageIds, getParsedMessage, DEFAULT_QUERY } from './gmail.ts';
import { extract } from './extraction.ts';
import { tryConsume } from './llmRateLimiter.ts';
import { normalizeCompany, normalizeRole } from './normalize.ts';
import { findCanonicalMatch, DEDUP_WINDOW_DAYS } from './dedup.ts';
import {
  sourceExists,
  findDedupCandidates,
  createApplication,
  addSource,
  enrichApplicationRole,
  type ApplicationRow,
} from '../models/application.ts';
import type { DedupCandidate, ParsedEmail } from '../types/index.ts';

export interface IngestSummary {
  scanned: number;
  alreadyIngested: number;
  newSources: number;
  newApplications: number;
  deduped: number;
  needsReview: number;
  notApplications: number;
  llmCalls: number;
  llmRateLimited: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const rowToCandidate = (r: ApplicationRow): DedupCandidate & { id: number } => ({
  id: r.id,
  account: r.account,
  companyNormalized: r.company_normalized,
  roleNormalized: r.role_normalized,
  receivedAt: new Date(r.first_seen_at),
});

// Single-email path: extract -> dedup -> persist. Mutates `summary` counters.
// Shared by the live Gmail loop and the offline seed so both exercise the same
// dedup and persistence logic.
export const processEmail = async (
  account: string,
  email: ParsedEmail,
  opts: { allowLlm: boolean },
  summary: IngestSummary,
): Promise<void> => {
  const extraction = await extract(email, { allowLlm: opts.allowLlm });

  if (!extraction.isJobApplication || !extraction.company) {
    summary.notApplications += 1;
    return;
  }

  const companyNormalized = normalizeCompany(extraction.company);
  const roleNormalized = normalizeRole(extraction.role);
  const candidate: DedupCandidate = {
    account, companyNormalized, roleNormalized, receivedAt: email.receivedAt,
  };

  const from = new Date(email.receivedAt.getTime() - DEDUP_WINDOW_DAYS * MS_PER_DAY);
  const to = new Date(email.receivedAt.getTime() + DEDUP_WINDOW_DAYS * MS_PER_DAY);
  const existing = (await findDedupCandidates(account, companyNormalized, from, to)).map(rowToCandidate);
  const match = findCanonicalMatch(candidate, existing);

  const belowThreshold = extraction.confidence < env.confidenceThreshold;
  let applicationId: number;

  if (match) {
    applicationId = match.id;
    summary.deduped += 1;
    if (roleNormalized && extraction.role) {
      await enrichApplicationRole(applicationId, extraction.role, roleNormalized);
    }
  } else {
    applicationId = await createApplication({
      account,
      company: extraction.company,
      companyNormalized,
      role: extraction.role,
      roleNormalized,
      status: extraction.status,
      reviewStatus: belowThreshold ? 'needs_review' : 'auto_confirmed',
      confidence: extraction.confidence,
      seenAt: email.receivedAt,
    });
    summary.newApplications += 1;
    if (belowThreshold) summary.needsReview += 1;
  }

  const inserted = await addSource({
    applicationId,
    gmailMessageId: email.messageId,
    gmailThreadId: email.threadId,
    subject: email.subject,
    fromAddress: email.from,
    receivedAt: email.receivedAt,
    extractedCompany: extraction.company,
    extractedRole: extraction.role,
    extractedStatus: extraction.status,
    confidence: extraction.confidence,
    reasoning: extraction.reasoning,
    extractor: extraction.extractor,
    snippet: email.snippet,
  });
  if (inserted) summary.newSources += 1;
};

export const emptySummary = (scanned: number): IngestSummary => ({
  scanned, alreadyIngested: 0, newSources: 0, newApplications: 0,
  deduped: 0, needsReview: 0, notApplications: 0, llmCalls: 0, llmRateLimited: 0,
});

export const runIngest = async (
  opts: { maxResults?: number; query?: string } = {},
): Promise<IngestSummary> => {
  const maxResults = Math.min(Math.max(opts.maxResults ?? 25, 1), 100);
  const q = opts.query ?? DEFAULT_QUERY;

  const { client, tokens } = await getAuthorizedClient();
  const account = tokens.googleEmail;
  const ids = await listMessageIds(client, { maxResults, query: q });

  const summary = emptySummary(ids.length);

  for (const id of ids) {
    // Idempotency: skip messages already ingested without spending any LLM call.
    if (await sourceExists(id)) {
      summary.alreadyIngested += 1;
      continue;
    }

    const email = await getParsedMessage(client, id);

    let allowLlm = false;
    if (env.openai.enabled) {
      const decision = await tryConsume();
      allowLlm = decision.allowed;
      if (decision.allowed) summary.llmCalls += 1;
      else summary.llmRateLimited += 1;
    }

    await processEmail(account, email, { allowLlm }, summary);
  }

  logger.info('Ingest run complete', { account, ...summary });
  return summary;
};

import { pool, query, execute, type Row } from '../config/db.ts';
import type { ApplicationStatus, ReviewStatus } from '../types/index.ts';

export interface ApplicationRow extends Row {
  id: number;
  account: string;
  company: string;
  company_normalized: string;
  role: string | null;
  role_normalized: string;
  status: ApplicationStatus;
  review_status: ReviewStatus;
  confidence: string; // DECIMAL comes back as string
  source_count: number;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface SourceRow extends Row {
  id: number;
  application_id: number;
  gmail_message_id: string;
  gmail_thread_id: string;
  subject: string | null;
  from_address: string | null;
  received_at: string;
  extracted_company: string | null;
  extracted_role: string | null;
  extracted_status: string | null;
  confidence: string;
  reasoning: string | null;
  extractor: string;
  snippet: string | null;
  created_at: string;
}

export const sourceExists = async (gmailMessageId: string): Promise<boolean> => {
  const rows = await query<Row>(
    'SELECT 1 FROM application_sources WHERE gmail_message_id = :id LIMIT 1',
    { id: gmailMessageId },
  );
  return rows.length > 0;
};

// Dedup candidates: same account + company within the date window. dedup.ts
// decides the final match; this just narrows the search cheaply via the index.
export const findDedupCandidates = async (
  account: string,
  companyNormalized: string,
  from: Date,
  to: Date,
): Promise<ApplicationRow[]> =>
  query<ApplicationRow>(
    `SELECT * FROM applications
      WHERE account = :account AND company_normalized = :company
        AND last_seen_at >= :from AND first_seen_at <= :to`,
    {
      account,
      company: companyNormalized,
      from: from.toISOString().slice(0, 19).replace('T', ' '),
      to: to.toISOString().slice(0, 19).replace('T', ' '),
    },
  );

export interface NewApplication {
  account: string;
  company: string;
  companyNormalized: string;
  role: string | null;
  roleNormalized: string;
  status: ApplicationStatus;
  reviewStatus: ReviewStatus;
  confidence: number;
  seenAt: Date;
}

export interface NewSource {
  applicationId: number;
  gmailMessageId: string;
  gmailThreadId: string;
  subject: string;
  fromAddress: string;
  receivedAt: Date;
  extractedCompany: string | null;
  extractedRole: string | null;
  extractedStatus: ApplicationStatus;
  confidence: number;
  reasoning: string;
  extractor: string;
  snippet: string;
}

const toSqlDate = (d: Date): string => d.toISOString().slice(0, 19).replace('T', ' ');

export const createApplication = async (a: NewApplication): Promise<number> => {
  const [res] = await pool.execute<import('mysql2').ResultSetHeader>(
    `INSERT INTO applications
      (account, company, company_normalized, role, role_normalized, status,
       review_status, confidence, source_count, first_seen_at, last_seen_at)
     VALUES (:account, :company, :companyN, :role, :roleN, :status, :review, :conf, 0, :seen, :seen)`,
    {
      account: a.account, company: a.company, companyN: a.companyNormalized,
      role: a.role, roleN: a.roleNormalized, status: a.status, review: a.reviewStatus,
      conf: a.confidence, seen: toSqlDate(a.seenAt),
    },
  );
  return res.insertId;
};

// Insert the source (idempotent on gmail_message_id) and, only if it was newly
// inserted, bump the parent application's rollups.
export const addSource = async (s: NewSource): Promise<boolean> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [res] = await conn.execute<import('mysql2').ResultSetHeader>(
      `INSERT IGNORE INTO application_sources
        (application_id, gmail_message_id, gmail_thread_id, subject, from_address, received_at,
         extracted_company, extracted_role, extracted_status, confidence, reasoning, extractor, snippet)
       VALUES (:appId, :msgId, :threadId, :subject, :from, :received,
         :eCompany, :eRole, :eStatus, :conf, :reasoning, :extractor, :snippet)`,
      {
        appId: s.applicationId, msgId: s.gmailMessageId, threadId: s.gmailThreadId,
        subject: s.subject.slice(0, 1024), from: s.fromAddress.slice(0, 512), received: toSqlDate(s.receivedAt),
        eCompany: s.extractedCompany, eRole: s.extractedRole, eStatus: s.extractedStatus,
        conf: s.confidence, reasoning: s.reasoning.slice(0, 1024), extractor: s.extractor,
        snippet: s.snippet.slice(0, 1024),
      },
    );
    const inserted = res.affectedRows > 0;
    if (inserted) {
      // Keep the canonical window/counters accurate; take the highest-confidence
      // status seen so a later "interview" upgrades an "applied" record.
      await conn.execute(
        `UPDATE applications SET
           source_count = source_count + 1,
           first_seen_at = LEAST(first_seen_at, :received),
           last_seen_at = GREATEST(last_seen_at, :received),
           confidence = GREATEST(confidence, :conf)
         WHERE id = :appId`,
        { received: toSqlDate(s.receivedAt), conf: s.confidence, appId: s.applicationId },
      );
    }
    await conn.commit();
    return inserted;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

// Fill in a role on an application that was created without one (e.g. a
// company-only LinkedIn notice) once a later source supplies it.
export const enrichApplicationRole = async (
  id: number,
  role: string,
  roleNormalized: string,
): Promise<void> => {
  await pool.execute(
    `UPDATE applications SET role = :role, role_normalized = :roleN
      WHERE id = :id AND (role IS NULL OR role = '')`,
    { role, roleN: roleNormalized, id },
  );
};

// --- Read API ---------------------------------------------------------------

export interface ListFilters {
  status?: ApplicationStatus;
  reviewStatus?: ReviewStatus;
  company?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}

export const listApplications = async (f: ListFilters): Promise<ApplicationRow[]> => {
  const where: string[] = [];
  const params: Record<string, unknown> = { limit: f.limit, offset: f.offset };
  if (f.status) { where.push('status = :status'); params.status = f.status; }
  if (f.reviewStatus) { where.push('review_status = :reviewStatus'); params.reviewStatus = f.reviewStatus; }
  if (f.company) { where.push('company_normalized LIKE :company'); params.company = `%${f.company.toLowerCase()}%`; }
  if (f.from) { where.push('first_seen_at >= :from'); params.from = f.from; }
  if (f.to) { where.push('first_seen_at <= :to'); params.to = f.to; }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return query<ApplicationRow>(
    `SELECT * FROM applications ${clause} ORDER BY first_seen_at DESC LIMIT :limit OFFSET :offset`,
    params,
  );
};

export const getApplication = async (id: number): Promise<ApplicationRow | null> => {
  const rows = await query<ApplicationRow>('SELECT * FROM applications WHERE id = :id', { id });
  return rows[0] ?? null;
};

export const getSources = async (applicationId: number): Promise<SourceRow[]> =>
  query<SourceRow>(
    'SELECT * FROM application_sources WHERE application_id = :id ORDER BY received_at ASC',
    { id: applicationId },
  );

export const listReviewQueue = async (limit: number, offset: number): Promise<ApplicationRow[]> =>
  query<ApplicationRow>(
    `SELECT * FROM applications WHERE review_status = 'needs_review'
      ORDER BY first_seen_at DESC LIMIT :limit OFFSET :offset`,
    { limit, offset },
  );

export const resolveReview = async (
  id: number,
  updates: { reviewStatus: ReviewStatus; company?: string; companyNormalized?: string; role?: string | null; roleNormalized?: string; status?: ApplicationStatus },
): Promise<boolean> => {
  const set: string[] = ['review_status = :reviewStatus'];
  const params: Record<string, unknown> = { id, reviewStatus: updates.reviewStatus };
  if (updates.company !== undefined) { set.push('company = :company', 'company_normalized = :companyN'); params.company = updates.company; params.companyN = updates.companyNormalized; }
  if (updates.role !== undefined) { set.push('role = :role', 'role_normalized = :roleN'); params.role = updates.role; params.roleN = updates.roleNormalized; }
  if (updates.status !== undefined) { set.push('status = :status'); params.status = updates.status; }
  const res = await execute(`UPDATE applications SET ${set.join(', ')} WHERE id = :id`, params);
  return res.affectedRows > 0;
};

// --- Stats ------------------------------------------------------------------

// "Counted" = auto_confirmed or human-confirmed; never needs_review/rejected.
const COUNTED = "review_status IN ('auto_confirmed','confirmed')";

export interface Stats {
  totalCounted: number;
  needsReview: number;
  rejected: number;
  byStatus: Record<string, number>;
  byDay: { day: string; count: number }[];
  byWeek: { week: string; count: number }[];
}

export const getStats = async (): Promise<Stats> => {
  const [totals] = await query<Row & { total: number; needs_review: number; rejected: number }>(
    `SELECT
       SUM(${COUNTED}) AS total,
       SUM(review_status = 'needs_review') AS needs_review,
       SUM(review_status = 'rejected') AS rejected
     FROM applications`,
  );
  const byStatusRows = await query<Row & { status: string; c: number }>(
    `SELECT status, COUNT(*) AS c FROM applications WHERE ${COUNTED} GROUP BY status`,
  );
  const byDay = await query<Row & { day: string; count: number }>(
    `SELECT DATE(first_seen_at) AS day, COUNT(*) AS count
       FROM applications WHERE ${COUNTED} GROUP BY day ORDER BY day DESC LIMIT 90`,
  );
  const byWeek = await query<Row & { week: string; count: number }>(
    `SELECT DATE_FORMAT(first_seen_at, '%x-W%v') AS week, COUNT(*) AS count
       FROM applications WHERE ${COUNTED} GROUP BY week ORDER BY week DESC LIMIT 52`,
  );

  const byStatus: Record<string, number> = {};
  for (const r of byStatusRows) byStatus[r.status] = Number(r.c);

  return {
    totalCounted: Number(totals?.total ?? 0),
    needsReview: Number(totals?.needs_review ?? 0),
    rejected: Number(totals?.rejected ?? 0),
    byStatus,
    byDay: byDay.map((r) => ({ day: r.day, count: Number(r.count) })),
    byWeek: byWeek.map((r) => ({ week: r.week, count: Number(r.count) })),
  };
};

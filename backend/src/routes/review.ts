import { Router } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import { asyncHandler, badRequest, notFound } from '../middleware/errors.ts';
import { optInt, optString, oneOf } from '../middleware/validate.ts';
import { APPLICATION_STATUSES } from '../types/index.ts';
import { listReviewQueue, getApplication, getSources, resolveReview } from '../models/application.ts';
import { normalizeCompany, normalizeRole } from '../services/normalize.ts';
import type { ReviewStatus } from '../types/index.ts';

export const reviewRouter = Router();

// The low-confidence / ambiguous queue, each item with its raw sources so a
// human can decide from the evidence.
reviewRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = optInt(req.query.limit, 'limit', 1, 200, 50);
    const offset = optInt(req.query.offset, 'offset', 0, 1_000_000, 0);
    const apps = await listReviewQueue(limit, offset);
    const withSources = await Promise.all(
      apps.map(async (a) => ({ application: a, sources: await getSources(a.id) })),
    );
    res.json({ queue: withSources });
  }),
);

// Resolve a queued item: confirm as-is, correct fields then confirm, or reject.
reviewRouter.post(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw badRequest('Invalid application id');

    const app = await getApplication(id);
    if (!app) throw notFound('Application not found');

    const body = (req.body ?? {}) as Record<string, unknown>;
    const action = oneOf(body.action, 'action', ['confirm', 'reject', 'correct'] as const);
    if (!action) throw badRequest('action is required (confirm | reject | correct)');

    if (action === 'reject') {
      await resolveReview(id, { reviewStatus: 'rejected' });
      res.json({ ok: true, id, reviewStatus: 'rejected' });
      return;
    }

    const reviewStatus: ReviewStatus = 'confirmed';
    if (action === 'confirm') {
      await resolveReview(id, { reviewStatus });
      res.json({ ok: true, id, reviewStatus });
      return;
    }

    // correct: optional field overrides, then confirm.
    const company = optString(body.company, 'company', 256);
    const role = optString(body.role, 'role', 256);
    const status = oneOf(body.status, 'status', APPLICATION_STATUSES);
    await resolveReview(id, {
      reviewStatus,
      ...(company !== undefined ? { company, companyNormalized: normalizeCompany(company) } : {}),
      ...(role !== undefined ? { role, roleNormalized: normalizeRole(role) } : {}),
      ...(status !== undefined ? { status } : {}),
    });
    res.json({ ok: true, id, reviewStatus, corrected: { company, role, status } });
  }),
);

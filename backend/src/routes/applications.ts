import { Router } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import { asyncHandler, badRequest, notFound } from '../middleware/errors.ts';
import { optInt, optString, optDate, oneOf } from '../middleware/validate.ts';
import { APPLICATION_STATUSES, REVIEW_STATUSES } from '../types/index.ts';
import {
  listApplications,
  getApplication,
  getSources,
  getStats,
} from '../models/application.ts';

export const applicationsRouter = Router();

applicationsRouter.get(
  '/stats',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json(await getStats());
  }),
);

applicationsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = req.query;
    const rows = await listApplications({
      status: oneOf(q.status, 'status', APPLICATION_STATUSES),
      reviewStatus: oneOf(q.reviewStatus, 'reviewStatus', REVIEW_STATUSES),
      company: optString(q.company, 'company', 256),
      from: optDate(q.from, 'from'),
      to: optDate(q.to, 'to'),
      limit: optInt(q.limit, 'limit', 1, 200, 50),
      offset: optInt(q.offset, 'offset', 0, 1_000_000, 0),
    });
    res.json({ applications: rows });
  }),
);

// Full traceability: the application plus every raw Gmail source behind it.
applicationsRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw badRequest('Invalid application id');
    const app = await getApplication(id);
    if (!app) throw notFound('Application not found');
    const sources = await getSources(id);
    res.json({ application: app, sources });
  }),
);

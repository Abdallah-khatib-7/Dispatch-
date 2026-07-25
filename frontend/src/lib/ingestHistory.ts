// The backend has no persisted "last run" timestamp -- /api/ingest/run is a
// manual trigger with no history table (see backend/src/database schema).
// This records the last run *this browser* triggered, which is the only
// recency signal actually available without changing the backend.
const KEY = 'dispatch.lastIngestRunAt';

export const getLastRunAt = (): string | null => localStorage.getItem(KEY);

export const setLastRunAt = (iso: string): void => {
  localStorage.setItem(KEY, iso);
};

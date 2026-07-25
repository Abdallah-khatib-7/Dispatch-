# Dispatch — frontend

React + TypeScript + Vite + Tailwind + TanStack Query + Recharts.

## Run

```
npm install
npm run dev
```

Expects the backend at `VITE_API_BASE_URL` (see `.env`, defaults to `http://localhost:3000`).

## Structure

- `src/pages` — one file per route (landing, connect, dashboard, applications, detail, review, ingest)
- `src/components` — shared UI, the `TraceRail` chain-of-custody component, and layout chrome
- `src/lib/api` — typed client calls mirroring the backend's exact response shapes
- `src/lib/auth` — JWT storage and the auth context/route guard

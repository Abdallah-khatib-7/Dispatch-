export interface NavItem {
  to: string;
  label: string;
  end: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/app', label: 'Dashboard', end: true },
  { to: '/app/applications', label: 'Applications', end: false },
  { to: '/app/review', label: 'Review queue', end: false },
  { to: '/app/ingest', label: 'Ingest', end: false },
];

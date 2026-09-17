export const BRAND_NAVY = '#0b3a67';
export const BRAND_BLUE = '#2b6cb0';
export const BRAND_GRAY = '#f3f4f6';

// Set VITE_HIDE_DEMO_LABELS=true (e.g. via start.ps1 -HideDemoLabels) to suppress
// the "Local Prototype Mode" / "Demonstration Data" pills and banners.
export const HIDE_DEMO_LABELS = import.meta.env['VITE_HIDE_DEMO_LABELS'] === 'true';

export interface NavItem {
  label: string;
  path: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Workforce Management', path: '/workforce' },
  { label: 'Applications Management', path: '/applications' },
  { label: 'Platform Management', path: '/platforms' },
  { label: 'Asset & End-of-Life Management', path: '/assets' },
  { label: 'Capabilities Management', path: '/capabilities' },
  { label: 'Resource Planner', path: '/planner' },
  { label: 'Attestations', path: '/attestations' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Administration', path: '/administration' },
];

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Smart CFD Insights — Shared Dashboard',
  description: 'AI-powered CrossFit workout analysis dashboard.',
};

export default function SharedDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

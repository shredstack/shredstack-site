import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Smart CFD Insights',
  description: 'AI-powered CrossFit workout analysis from your PushPress data.',
};

export default function SmartCfdLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

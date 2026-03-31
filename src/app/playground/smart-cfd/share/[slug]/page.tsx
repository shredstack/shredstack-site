'use client';

import { use } from 'react';
import Dashboard from '../../components/Dashboard';

export default function PublicSharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  return (
    <div className="py-16">
      <div className="section-container">
        <Dashboard
          email=""
          readOnly
          dataUrl={`/api/smart-cfd/public/${slug}`}
          insightsUrl={`/api/smart-cfd/public/${slug}/insights`}
        />
      </div>
    </div>
  );
}

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CheerCard } from '@/components/hyroxCheer/CheerCard';
import { RACE, SEGMENTS } from '@/lib/hyroxCheer/races/slc2026';

export const metadata: Metadata = {
  title: 'Cheer for Dino Nugget Sarah — HYROX Salt Lake City',
  description: "Live race-day tracker for Sarah's HYROX Salt Lake City race. Mark her time at every station and run, see how she's pacing against her goals.",
};

export default function HyroxSlc2026Page() {
  return (
    <Suspense fallback={null}>
      <CheerCard race={RACE} segments={SEGMENTS} />
    </Suspense>
  );
}

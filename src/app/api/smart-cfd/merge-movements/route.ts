import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/smart-cfd-auth';
import { mergeMovementDuplicates } from '@/lib/crossfit-analysis';

export async function POST() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await mergeMovementDuplicates();

  return NextResponse.json({
    merged: result.merged,
    updatedIs1rm: result.updatedIs1rm,
    summary: `Merged ${result.merged.length} duplicate movements, updated is_1rm_applicable for ${result.updatedIs1rm} movements`,
  });
}

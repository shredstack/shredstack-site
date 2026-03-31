import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/smart-cfd-auth';

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ message: 'Logged out' });
}

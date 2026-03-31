import { NextRequest, NextResponse } from 'next/server';
import {
  verifyMagicLinkToken,
  getOrCreateUser,
  createSessionToken,
  setSessionCookie,
} from '@/lib/smart-cfd-auth';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/playground/smart-cfd?error=missing-token', request.url));
  }

  const email = await verifyMagicLinkToken(token);
  if (!email) {
    return NextResponse.redirect(new URL('/playground/smart-cfd?error=invalid-token', request.url));
  }

  const user = await getOrCreateUser(email);
  const sessionToken = await createSessionToken(user.id, email);
  await setSessionCookie(sessionToken);

  return NextResponse.redirect(new URL('/playground/smart-cfd', request.url));
}

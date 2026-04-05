import { NextRequest, NextResponse } from 'next/server';
import {
  verifyMagicLinkToken,
  getOrCreateUser,
  createSessionToken,
  setSessionCookie,
} from '@/lib/smart-cfd-auth';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  // Default redirect; overridden by redirectTo in the magic link token
  const defaultRedirect = '/playground/smart-cfd';

  function safeRedirect(path?: string): string {
    if (typeof path === 'string' && path.startsWith('/playground/')) return path;
    return defaultRedirect;
  }

  if (!token) {
    return NextResponse.redirect(new URL(`${defaultRedirect}?error=missing-token`, request.url));
  }

  const result = await verifyMagicLinkToken(token);
  if (!result) {
    return NextResponse.redirect(new URL(`${defaultRedirect}?error=invalid-token`, request.url));
  }

  const redirectPath = safeRedirect(result.redirectTo);

  const user = await getOrCreateUser(result.email);
  const sessionToken = await createSessionToken(user.id, result.email);
  await setSessionCookie(sessionToken);

  return NextResponse.redirect(new URL(redirectPath, request.url));
}

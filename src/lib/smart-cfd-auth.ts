import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { crossfitUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';

const COOKIE_NAME = 'smart-cfd-session';
const MAGIC_LINK_EXPIRY = '15m';
const SESSION_EXPIRY = '30d';

function getJwtSecret() {
  const secret = process.env.SMART_CFD_JWT_SECRET;
  if (!secret) throw new Error('SMART_CFD_JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

// Create a short-lived token for magic link verification
export async function createMagicLinkToken(email: string, redirectTo?: string): Promise<string> {
  return new SignJWT({ email, purpose: 'magic-link', redirectTo: redirectTo || undefined })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(MAGIC_LINK_EXPIRY)
    .setIssuedAt()
    .sign(getJwtSecret());
}

// Verify a magic link token and return the email + optional redirect
export async function verifyMagicLinkToken(token: string): Promise<{ email: string; redirectTo?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.purpose !== 'magic-link' || typeof payload.email !== 'string') {
      return null;
    }
    return {
      email: payload.email,
      redirectTo: typeof payload.redirectTo === 'string' ? payload.redirectTo : undefined,
    };
  } catch {
    return null;
  }
}

// Create a long-lived session token
export async function createSessionToken(userId: number, email: string): Promise<string> {
  return new SignJWT({ userId, email, purpose: 'session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(SESSION_EXPIRY)
    .setIssuedAt()
    .sign(getJwtSecret());
}

// Verify session token from cookie
export async function verifySession(): Promise<{ userId: number; email: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getJwtSecret());
    if (
      payload.purpose !== 'session' ||
      typeof payload.userId !== 'number' ||
      typeof payload.email !== 'string'
    ) {
      return null;
    }
    // Verify user still exists in the DB (handles table migrations / resets)
    const userExists = await db
      .select({ id: crossfitUsers.id })
      .from(crossfitUsers)
      .where(eq(crossfitUsers.id, payload.userId))
      .limit(1);

    if (userExists.length === 0) return null;

    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

// Set session cookie
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });
}

// Clear session cookie
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Get or create user by email
export async function getOrCreateUser(email: string) {
  const existing = await db
    .select()
    .from(crossfitUsers)
    .where(eq(crossfitUsers.email, email))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const result = await db
    .insert(crossfitUsers)
    .values({ email })
    .returning();

  return result[0];
}

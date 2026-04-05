import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createMagicLinkToken } from '@/lib/smart-cfd-auth';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const { email, redirectTo } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate redirectTo against allowlist to prevent open redirects
    const validRedirect = typeof redirectTo === 'string' && redirectTo.startsWith('/playground/')
      ? redirectTo
      : undefined;

    const token = await createMagicLinkToken(email, validRedirect);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const verifyUrl = `${baseUrl}/api/smart-cfd/auth/verify?token=${token}`;

    const isHyrox = validRedirect?.includes('hyrox-tracker');
    const emailTitle = isHyrox ? 'HYROX Training Tracker' : 'Smart CFD Insights';
    const emailSubject = `Sign in to ${emailTitle}`;
    const accentColor = isHyrox ? '#f97316' : '#6366f1';

    if (resend) {
      await resend.emails.send({
        from: 'ShredStack <noreply@shredstack.net>',
        to: email,
        subject: emailSubject,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #e8e8f0; margin-bottom: 8px;">${emailTitle}</h2>
            <p style="color: #8888a0; margin-bottom: 24px;">Click the link below to sign in. This link expires in 15 minutes.</p>
            <a href="${verifyUrl}" style="display: inline-block; background: ${accentColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Sign In
            </a>
            <p style="color: #8888a0; font-size: 12px; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    } else {
      // Dev fallback: log the link to console
      console.log(`\n🔗 Magic link for ${email}:\n${verifyUrl}\n`);
    }

    return NextResponse.json({ message: 'Magic link sent! Check your email.' });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 });
  }
}

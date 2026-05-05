import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mobilityExercises } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Validate the exerciseId in the client payload up front so we don't
        // hand out an upload token for a row that doesn't exist.
        const parsed = parseClientPayload(clientPayload);
        if (parsed === null) {
          throw new Error('clientPayload must be JSON with an integer exerciseId');
        }
        const [row] = await db
          .select({ id: mobilityExercises.id })
          .from(mobilityExercises)
          .where(eq(mobilityExercises.id, parsed.exerciseId))
          .limit(1);
        if (!row) throw new Error('Exercise not found');

        return {
          allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
          maximumSizeInBytes: 200 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ exerciseId: parsed.exerciseId, pathname }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload) return;
        try {
          const { exerciseId } = JSON.parse(tokenPayload) as { exerciseId: number };
          await db
            .update(mobilityExercises)
            .set({
              videoUrl: blob.url,
              videoFilename: blob.pathname,
              updatedAt: new Date(),
            })
            .where(eq(mobilityExercises.id, exerciseId));
        } catch (err) {
          console.error('Mobility upload completion handler error:', err);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Mobility upload-url error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 },
    );
  }
}

function parseClientPayload(raw: string | null): { exerciseId: number } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Number.isInteger(parsed.exerciseId)) {
      return { exerciseId: parsed.exerciseId };
    }
  } catch {
    // fall through
  }
  return null;
}

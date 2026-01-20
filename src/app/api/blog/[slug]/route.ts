import { NextRequest, NextResponse } from 'next/server';
import { db, blogPosts } from '@/db';
import { eq } from 'drizzle-orm';

// GET /api/blog/[slug] - Get a single blog post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const posts = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug));

    if (posts.length === 0) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(posts[0]);
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    );
  }
}

// PUT /api/blog/[slug] - Update a blog post
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { title, excerpt, content, published, tags, color } = body;

    const result = await db
      .update(blogPosts)
      .set({
        ...(title !== undefined && { title }),
        ...(excerpt !== undefined && { excerpt }),
        ...(content !== undefined && { content }),
        ...(published !== undefined && { published }),
        ...(tags !== undefined && { tags }),
        ...(color !== undefined && { color }),
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.slug, slug))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating blog post:', error);
    return NextResponse.json(
      { error: 'Failed to update blog post' },
      { status: 500 }
    );
  }
}

// DELETE /api/blog/[slug] - Delete a blog post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const result = await db
      .delete(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .returning({ id: blogPosts.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Blog post deleted' });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return NextResponse.json(
      { error: 'Failed to delete blog post' },
      { status: 500 }
    );
  }
}

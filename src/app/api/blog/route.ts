import { NextRequest, NextResponse } from 'next/server';
import { db, blogPosts } from '@/db';
import { desc, eq } from 'drizzle-orm';

// GET /api/blog - Get all published blog posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeUnpublished = searchParams.get('all') === 'true';

    let posts;
    if (includeUnpublished) {
      posts = await db
        .select({
          id: blogPosts.id,
          slug: blogPosts.slug,
          title: blogPosts.title,
          excerpt: blogPosts.excerpt,
          published: blogPosts.published,
          tags: blogPosts.tags,
          color: blogPosts.color,
          createdAt: blogPosts.createdAt,
          updatedAt: blogPosts.updatedAt,
        })
        .from(blogPosts)
        .orderBy(desc(blogPosts.createdAt));
    } else {
      posts = await db
        .select({
          id: blogPosts.id,
          slug: blogPosts.slug,
          title: blogPosts.title,
          excerpt: blogPosts.excerpt,
          published: blogPosts.published,
          tags: blogPosts.tags,
          color: blogPosts.color,
          createdAt: blogPosts.createdAt,
          updatedAt: blogPosts.updatedAt,
        })
        .from(blogPosts)
        .where(eq(blogPosts.published, true))
        .orderBy(desc(blogPosts.createdAt));
    }

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}

// POST /api/blog - Create a new blog post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, title, excerpt, content, published, tags, color } = body;

    if (!slug || !title || !excerpt || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await db
      .insert(blogPosts)
      .values({
        slug,
        title,
        excerpt,
        content,
        published: published || false,
        tags: tags || [],
        color: color || 'rainbow-cyan',
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating blog post:', error);
    return NextResponse.json(
      { error: 'Failed to create blog post' },
      { status: 500 }
    );
  }
}

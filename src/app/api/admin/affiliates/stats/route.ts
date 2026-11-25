import { NextRequest, NextResponse } from "next/server";
import { count, desc, gte, sql, type SQL } from "drizzle-orm";
import { checkAdminPassword } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** Days are bucketed in Sarah's local time so "today" matches the calendar she's looking at. */
const STATS_TIME_ZONE = "America/Denver";
const ALLOWED_DAYS = new Set(["7", "30", "90"]);

export async function GET(request: NextRequest) {
  // Server-side password check BEFORE touching the database.
  const auth = checkAdminPassword(request.headers.get("x-admin-password"));
  if (auth === "not-configured") {
    console.error("ADMIN_PASSWORD environment variable not set");
    return NextResponse.json({ error: "Admin authentication not configured" }, { status: 500 });
  }
  if (auth !== "ok") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const daysParam = request.nextUrl.searchParams.get("days") ?? "30";
  const days = daysParam === "all" ? null : ALLOWED_DAYS.has(daysParam) ? Number(daysParam) : 30;

  try {
    const { db, affiliateClicks: c } = await import("@/db");

    const where: SQL | undefined = days
      ? gte(c.createdAt, sql`now() - make_interval(days => ${days})`)
      : undefined;

    const day = sql<string>`to_char(${c.createdAt} at time zone ${sql.raw(`'${STATS_TIME_ZONE}'`)}, 'YYYY-MM-DD')`;
    const clicks = count();

    const [totalRows, byPartner, daily, byPlacement, byReferrer, byDevice, byCountry] = await Promise.all([
      db.select({ clicks }).from(c).where(where),
      db
        .select({ partnerSlug: c.partnerSlug, clicks })
        .from(c)
        .where(where)
        .groupBy(c.partnerSlug)
        .orderBy(desc(clicks)),
      db
        .select({ day, partnerSlug: c.partnerSlug, clicks })
        .from(c)
        .where(where)
        .groupBy(day, c.partnerSlug)
        .orderBy(day),
      db
        .select({ key: c.placement, clicks })
        .from(c)
        .where(where)
        .groupBy(c.placement)
        .orderBy(desc(clicks))
        .limit(50),
      db
        .select({ key: c.referrerHost, clicks })
        .from(c)
        .where(where)
        .groupBy(c.referrerHost)
        .orderBy(desc(clicks))
        .limit(25),
      db
        .select({ key: c.deviceType, clicks })
        .from(c)
        .where(where)
        .groupBy(c.deviceType)
        .orderBy(desc(clicks)),
      db
        .select({ key: c.country, clicks })
        .from(c)
        .where(where)
        .groupBy(c.country)
        .orderBy(desc(clicks))
        .limit(10),
    ]);

    return NextResponse.json(
      {
        days: days ?? "all",
        timeZone: STATS_TIME_ZONE,
        total: totalRows[0]?.clicks ?? 0,
        byPartner,
        daily,
        byPlacement,
        byReferrer,
        byDevice,
        byCountry,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to load affiliate stats:", error);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}

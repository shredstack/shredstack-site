"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { partners } from "@/data/partners";

type Range = "7" | "30" | "90" | "all";

interface Row {
  key: string | null;
  clicks: number;
}

interface Stats {
  days: number | "all";
  timeZone: string;
  total: number;
  byPartner: { partnerSlug: string; clicks: number }[];
  daily: { day: string; partnerSlug: string; clicks: number }[];
  byPlacement: Row[];
  byReferrer: Row[];
  byDevice: Row[];
  byCountry: Row[];
}

const RANGES: { value: Range; label: string }[] = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "all", label: "All time" },
];

// Categorical series colors (validated for CVD separation + 3:1 contrast on the dark
// surface). Assigned by the partner's position in partners.ts, so a partner keeps its
// color whatever the range or filter.
const SERIES_COLORS = ["#338ced", "#e76624", "#00a888", "#d28e05", "#e24d8b", "#0aac23", "#9887ef"];
const OTHER_COLOR = "#94a3b8";

function partnerName(slug: string): string {
  return partners.find((p) => p.slug === slug)?.name ?? slug;
}

function partnerColor(slug: string): string {
  const index = partners.findIndex((p) => p.slug === slug);
  return index >= 0 && index < SERIES_COLORS.length ? SERIES_COLORS[index] : OTHER_COLOR;
}

/** YYYY-MM-DD for `date` in the given IANA time zone. */
function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function addDays(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Pivot daily rows into one object per day, filling empty days with zeros. */
function buildChartData(stats: Stats, slugs: string[]) {
  const today = dayKey(new Date(), stats.timeZone);
  const first =
    stats.days === "all"
      ? stats.daily[0]?.day ?? today
      : addDays(today, -(stats.days - 1));

  const byDay = new Map<string, Record<string, number>>();
  for (const row of stats.daily) {
    const entry = byDay.get(row.day) ?? {};
    entry[row.partnerSlug] = row.clicks;
    byDay.set(row.day, entry);
  }

  const data: Record<string, string | number>[] = [];
  for (let day = first; day <= today; day = addDays(day, 1)) {
    const entry: Record<string, string | number> = { day };
    for (const slug of slugs) entry[slug] = byDay.get(day)?.[slug] ?? 0;
    data.push(entry);
  }
  return data;
}

function formatDay(key: string): string {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function StatTile({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-sm text-surface-400">
        {color && <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-white tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}

function BreakdownTable({ title, rows, emptyLabel = "(none)" }: { title: string; rows: Row[]; emptyLabel?: string }) {
  const total = rows.reduce((sum, r) => sum + r.clicks, 0);
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-surface-300 mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-surface-500">No clicks yet.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.key ?? "__null"} className="border-t border-surface-700/60 first:border-t-0">
                <td className="py-1.5 pr-3 text-surface-200 break-all">{r.key ?? <span className="text-surface-500">{emptyLabel}</span>}</td>
                <td className="py-1.5 text-right text-white tabular-nums">{r.clicks.toLocaleString()}</td>
                <td className="py-1.5 pl-3 w-14 text-right text-surface-400 tabular-nums">
                  {total ? `${Math.round((r.clicks / total) * 100)}%` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AdminAffiliatesPage() {
  const [range, setRange] = useState<Range>("30");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<"unauthorized" | "failed" | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (r: Range) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/affiliates/stats?days=${r}`, {
        headers: { "x-admin-password": sessionStorage.getItem("admin_password") ?? "" },
        cache: "no-store",
      });
      if (response.status === 401) {
        setError("unauthorized");
        setStats(null);
      } else if (!response.ok) {
        setError("failed");
      } else {
        setStats(await response.json());
      }
    } catch {
      setError("failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [load, range]);

  // Partners with clicks in range, in partners.ts order (stable colors).
  const seriesSlugs = useMemo(() => {
    if (!stats) return [];
    const withClicks = new Set(stats.byPartner.map((p) => p.partnerSlug));
    const known = partners.map((p) => p.slug).filter((s) => withClicks.has(s));
    const unknown = Array.from(withClicks).filter((s) => !known.includes(s));
    return [...known, ...unknown];
  }, [stats]);

  const chartData = useMemo(() => (stats ? buildChartData(stats, seriesSlugs) : []), [stats, seriesSlugs]);
  const dashboards = partners.filter((p) => p.status !== "ended");

  const signInAgain = () => {
    sessionStorage.removeItem("admin_authenticated");
    sessionStorage.removeItem("admin_password");
    window.location.reload();
  };

  return (
    <div className="py-12">
      <div className="section-container space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Affiliate Clicks</h1>
            <p className="mt-1 text-surface-400">
              Human clicks on <code className="text-primary-300">/go/</code> links (bots and link previews
              excluded). Sales live in each brand&apos;s dashboard.
            </p>
          </div>
          <div role="group" aria-label="Date range" className="flex rounded-lg border border-surface-600 p-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRange(r.value)}
                aria-pressed={range === r.value}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  range === r.value ? "bg-primary-500/20 text-primary-300" : "text-surface-400 hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error === "unauthorized" && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            The server rejected this session. Sign in again to load stats.{" "}
            <button type="button" onClick={signInAgain} className="underline hover:text-red-200">
              Sign in again
            </button>
          </div>
        )}
        {error === "failed" && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            Couldn&apos;t load stats. Check the server logs (has the affiliate_clicks migration run?).
          </div>
        )}

        {isLoading && !stats && (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        )}

        {stats && (
          <div className={`space-y-8 transition-opacity ${isLoading ? "opacity-60" : ""}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatTile label="Total clicks" value={stats.total} />
              {stats.byPartner.map((p) => (
                <StatTile key={p.partnerSlug} label={partnerName(p.partnerSlug)} value={p.clicks} color={partnerColor(p.partnerSlug)} />
              ))}
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-surface-300 mb-4">
                Daily clicks <span className="normal-case font-normal text-surface-500">({stats.timeZone})</span>
              </h2>
              {seriesSlugs.length === 0 ? (
                <p className="py-10 text-center text-sm text-surface-500">No clicks in this range yet.</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                      <CartesianGrid stroke="#334155" strokeOpacity={0.5} vertical={false} />
                      <XAxis
                        dataKey="day"
                        tickFormatter={formatDay}
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        tickLine={false}
                        minTickGap={24}
                      />
                      <YAxis
                        allowDecimals={false}
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        labelFormatter={(label) => formatDay(String(label))}
                        formatter={(value, name) => [value, partnerName(String(name))]}
                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
                        labelStyle={{ color: "#f1f5f9" }}
                        itemStyle={{ color: "#cbd5e1" }}
                        cursor={{ stroke: "#64748b", strokeWidth: 1 }}
                      />
                      {seriesSlugs.length > 1 && (
                        <Legend formatter={(value) => <span className="text-surface-300">{partnerName(String(value))}</span>} />
                      )}
                      {seriesSlugs.map((slug) => (
                        <Line
                          key={slug}
                          type="monotone"
                          dataKey={slug}
                          name={slug}
                          stroke={partnerColor(slug)}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 2, stroke: "#0f172a" }}
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <BreakdownTable title="By placement (src)" rows={stats.byPlacement} />
              <BreakdownTable title="By referrer host" rows={stats.byReferrer} emptyLabel="(no referrer)" />
              <BreakdownTable title="Device" rows={stats.byDevice} emptyLabel="(unknown)" />
              <BreakdownTable title="Top countries" rows={stats.byCountry} emptyLabel="(unknown)" />
            </div>
          </div>
        )}

        <div className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-surface-300 mb-2">Brand dashboards</h2>
          <p className="text-sm text-surface-400 mb-4">
            Sales and commissions are tracked by each brand&apos;s affiliate program, not here. Compare these
            clicks with sales there.
          </p>
          <ul className="space-y-2">
            {dashboards.map((p) => (
              <li key={p.slug} className="flex flex-wrap items-center gap-x-3 text-sm">
                <span className="font-medium text-white">{p.name}</span>
                {p.dashboardUrl ? (
                  <a
                    href={p.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-400 underline hover:text-accent-300"
                  >
                    Open affiliate dashboard ↗
                  </a>
                ) : (
                  <span className="text-surface-500">No dashboard URL set (add dashboardUrl in partners.ts)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

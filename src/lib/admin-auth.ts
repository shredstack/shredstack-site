import { createHash, timingSafeEqual } from "crypto";

export type AdminCheck = "ok" | "unauthorized" | "not-configured";

/**
 * Server-side admin password check with a constant-time comparison.
 *
 * Both values are SHA-256 hashed first so `timingSafeEqual` always compares
 * equal-length buffers and the comparison doesn't leak the password length.
 *
 * Used by /api/admin/affiliates/stats. The blog admin APIs don't use this yet
 * (follow-up: they currently do no server-side verification).
 */
export function checkAdminPassword(provided: string | null | undefined): AdminCheck {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return "not-configured";
  if (!provided) return "unauthorized";

  const a = createHash("sha256").update(provided, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b) ? "ok" : "unauthorized";
}

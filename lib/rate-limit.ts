import { createAdminClient } from "@/lib/supabase/server";

// ============================================================================
// Rate Limiting Utilities
// In-memory rate limiting with automatic cleanup and configurable limits.
// ============================================================================

export interface RateLimiterOptions {
  /** Max requests allowed within the window (default: 5) */
  maxRequests?: number;
  /** Window duration in milliseconds (default: 60 000 = 1 min) */
  windowMs?: number;
  /** Max entries in the store before eviction kicks in (default: 10 000) */
  maxStoreSize?: number;
  /** How often to run cleanup in ms (default: 300 000 = 5 min) */
  cleanupIntervalMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

// ---------------------------------------------------------------------------
// RateLimiter class — instantiable, testable, reusable
// ---------------------------------------------------------------------------
export class RateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly maxStoreSize: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options?: RateLimiterOptions) {
    this.maxRequests = options?.maxRequests ?? 5;
    this.windowMs = options?.windowMs ?? 60_000;
    this.maxStoreSize = options?.maxStoreSize ?? 10_000;

    const interval = options?.cleanupIntervalMs ?? 5 * 60_000;
    this.cleanupTimer = setInterval(() => this.cleanup(), interval);
    // Don't keep the Node.js process alive just for the timer
    if (this.cleanupTimer?.unref) {
      this.cleanupTimer.unref();
    }
  }

  // -- Core API -------------------------------------------------------------

  check(key: string): RateLimitResult {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      this.evictIfNeeded();
      this.store.set(key, { count: 1, resetTime: now + this.windowMs });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    if (record.count >= this.maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    record.count += 1;
    return { allowed: true, remaining: this.maxRequests - record.count };
  }

  clear(key: string): void {
    this.store.delete(key);
  }

  getStats(key: string): { count: number; resetTime: number } | null {
    return this.store.get(key) ?? null;
  }

  /** Remove all expired entries */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /** Current number of tracked keys (useful for monitoring) */
  get size(): number {
    return this.store.size;
  }

  /** Stop the cleanup timer — call when tearing down in tests */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }

  // -- Internal -------------------------------------------------------------

  private evictIfNeeded(): void {
    if (this.store.size < this.maxStoreSize) return;

    // Evict expired entries first
    this.cleanup();

    // If still over limit, remove oldest entries by resetTime
    if (this.store.size >= this.maxStoreSize) {
      const entries = [...this.store.entries()].sort(
        (a, b) => a[1].resetTime - b[1].resetTime,
      );
      const toRemove = Math.ceil(this.maxStoreSize * 0.1); // drop ~10 %
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        this.store.delete(entries[i][0]);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Default singleton — reads from env vars so deployments can tune without
// touching code.
// ---------------------------------------------------------------------------
const defaultLimiter = new RateLimiter({
  maxRequests: Number(process.env.RATE_LIMIT_MAX) || 5,
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  maxStoreSize: Number(process.env.RATE_LIMIT_MAX_STORE) || 10_000,
});

// ---------------------------------------------------------------------------
// Backward-compatible helpers (used by feedback.ts, safety.ts, etc.)
// ---------------------------------------------------------------------------

export interface GetClientIpOptions {
  /**
   * When `true` (default), the first value of `x-forwarded-for` is trusted.
   * Set to `false` if your server is NOT behind a trusted reverse proxy
   * (Cloudflare, Nginx, AWS ALB, Vercel, etc.) to prevent IP spoofing.
   */
  trustProxy?: boolean;
}

/**
 * Extract the client IP from request headers.
 *
 * **Security note:** `x-forwarded-for` can be spoofed if your server is not
 * behind a trusted proxy that overwrites the header. On Vercel / Cloudflare
 * this is safe because the platform sets the header. Pass `{ trustProxy: false }`
 * if unsure.
 */
export function getClientIp(
  headers: Headers | null,
  options?: GetClientIpOptions,
): string {
  if (!headers) return "unknown";

  const trustProxy = options?.trustProxy ?? true;

  if (trustProxy) {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    return headers.get("x-real-ip") || "unknown";
  }

  // Don't trust proxy headers — only use x-real-ip which is harder to spoof
  // when the server itself sets it
  return headers.get("x-real-ip") || "unknown";
}

/**
 * Check rate limiting for a key (e.g. IP or prefixed IP).
 * Uses the default singleton limiter.
 */
export function checkRateLimit(key: string): RateLimitResult {
  return defaultLimiter.check(key);
}

/**
 * Clear rate limit record for a key (admin / testing use).
 */
export function clearRateLimit(key: string): void {
  defaultLimiter.clear(key);
}

/**
 * Get current rate limit stats for a key (debugging).
 */
export function getRateLimitStats(
  key: string,
): { count: number; resetTime: number } | null {
  return defaultLimiter.getStats(key);
}


export interface DistributedRateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

/**
 * Distributed rate limiter backed by Postgres. Use this for serverless-sensitive
 * paths (Auth, public Forms, Feedback). The RPC is executable only by service_role.
 */
export async function checkDistributedRateLimit(
  key: string,
  options: DistributedRateLimitOptions,
): Promise<RateLimitResult & { retryAfterSeconds: number }> {
  const admin = await createAdminClient();

  // Fail closed on protected public/auth write paths if the privileged limiter
  // is unavailable. This avoids silently falling back to per-instance memory.
  if (!admin) {
    return { allowed: false, remaining: 0, retryAfterSeconds: 60 };
  }

  const maxRequests = Math.max(1, Math.min(10_000, Math.trunc(options.maxRequests)));
  const windowSeconds = Math.max(1, Math.min(86_400, Math.ceil(options.windowMs / 1000)));

  const { data, error } = await admin.rpc("consume_server_rate_limit", {
    p_key: key,
    p_limit: maxRequests,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("Distributed rate limit failed:", error.message);
    return { allowed: false, remaining: 0, retryAfterSeconds: 60 };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: row?.allowed === true,
    remaining: Number(row?.remaining ?? 0),
    retryAfterSeconds: Number(row?.retry_after_seconds ?? 0),
  };
}

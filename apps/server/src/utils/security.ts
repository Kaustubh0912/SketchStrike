import type { Socket } from 'socket.io';

/**
 * Best-effort client IP. Behind a proxy (Render, etc.) the raw socket address
 * is the proxy, so we trust the first hop in `x-forwarded-for` when present.
 * Used only for abuse throttling, never for auth — spoofing it just means an
 * attacker throttles themselves under a different bucket.
 */
export function clientIp(socket: Socket): string {
  const fwd = socket.handshake.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0]?.trim() || 'unknown';
  }
  if (Array.isArray(fwd) && fwd.length > 0) {
    return fwd[0]?.trim() || 'unknown';
  }
  return socket.handshake.address || 'unknown';
}

/** Tracks how many live connections each IP holds. */
export class ConnectionCounter {
  private counts = new Map<string, number>();

  increment(ip: string): number {
    const next = (this.counts.get(ip) ?? 0) + 1;
    this.counts.set(ip, next);
    return next;
  }

  decrement(ip: string): void {
    const next = (this.counts.get(ip) ?? 0) - 1;
    if (next <= 0) this.counts.delete(ip);
    else this.counts.set(ip, next);
  }

  get size(): number {
    return this.counts.size;
  }
}

/**
 * Sliding-window rate limiter. `allow(key)` returns false once a key has used
 * up its budget within the window. Call `sweep()` periodically so idle keys
 * don't accumulate.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  allow(key: string): boolean {
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  sweep(): void {
    const now = Date.now();
    for (const [key, times] of this.hits) {
      const live = times.filter((t) => now - t < this.windowMs);
      if (live.length === 0) this.hits.delete(key);
      else this.hits.set(key, live);
    }
  }
}

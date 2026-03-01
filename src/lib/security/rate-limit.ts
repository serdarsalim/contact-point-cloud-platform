type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const buckets = new Map<string, number[]>();

function prune(timestamps: number[], windowStart: number) {
  return timestamps.filter((value) => value >= windowStart);
}

export function consumeRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowStart = now - options.windowMs;
  const existing = buckets.get(key) || [];
  const current = prune(existing, windowStart);

  if (current.length >= options.max) {
    const oldest = current[0] ?? now;
    const retryAfterMs = Math.max(0, oldest + options.windowMs - now);
    buckets.set(key, current);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: retryAfterMs / 1000
    };
  }

  current.push(now);
  buckets.set(key, current);

  return {
    allowed: true,
    remaining: Math.max(0, options.max - current.length),
    retryAfterSeconds: 0
  };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

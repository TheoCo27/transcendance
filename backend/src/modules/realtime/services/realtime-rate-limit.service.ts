// Ce service applique des limites simples en memoire pour les evenements
// temps reel afin de bloquer les rafales et le flood continu.
import { Injectable } from "@nestjs/common";

type RateLimitRule = {
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

@Injectable()
export class RealtimeRateLimitService {
  private readonly buckets = new Map<string, number[]>();

  consume(key: string, rules: readonly RateLimitRule[]): RateLimitResult {
    const now = Date.now();
    const timestamps = this.buckets.get(key) ?? [];
    const maxWindowMs = Math.max(...rules.map((rule) => rule.windowMs));
    const retained = timestamps.filter(
      (timestamp) => now - timestamp < maxWindowMs,
    );

    for (const rule of rules) {
      const hitsInWindow = retained.filter(
        (timestamp) => now - timestamp < rule.windowMs,
      );

      if (hitsInWindow.length >= rule.limit) {
        const oldestHit = hitsInWindow[0];
        const retryAfterMs = Math.max(
          0,
          rule.windowMs - (now - oldestHit),
        );

        this.buckets.set(key, retained);
        return { allowed: false, retryAfterMs };
      }
    }

    retained.push(now);
    this.buckets.set(key, retained);
    return { allowed: true, retryAfterMs: 0 };
  }
}

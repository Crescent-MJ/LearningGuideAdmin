import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

/**
 * 简单限流（§4.4.3 / §2 红线：同一 courseId 每分钟最多 10 次 AI 请求）。
 * 单实例内存滑动窗口；多实例部署时替换为 Redis 等集中存储（预留）。
 */
@Injectable()
export class RateLimitService {
  private static readonly LIMIT = 10;
  private static readonly WINDOW_MS = 60_000;
  private hits = new Map<string, number[]>();

  assertAllowed(courseId: string): void {
    const now = Date.now();
    const recent = (this.hits.get(courseId) ?? []).filter(
      (t) => now - t < RateLimitService.WINDOW_MS,
    );
    if (recent.length >= RateLimitService.LIMIT) {
      this.hits.set(courseId, recent);
      throw new HttpException(
        '请求过于频繁，请稍后再试（每课程每分钟最多 10 次）',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.hits.set(courseId, recent);
  }
}

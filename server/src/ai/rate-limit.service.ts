import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

/** 限流来源：学员个人对话与直播间分开配额（2026-10-23） */
export type AiRateLimitChannel = 'portal' | 'study-group';

/**
 * 简单限流（§4.4.3 / §2 红线：同一 courseId 每分钟最多 10 次 AI 请求）。
 * 直播间（study-group）单独一个桶，配额由 AI_RATE_LIMIT_STUDY_GROUP_PER_MINUTE
 * 配置（默认 30），不与学员个人对话互相挤占。
 * 单实例内存滑动窗口；多实例部署时替换为 Redis 等集中存储（预留）。
 */
@Injectable()
export class RateLimitService {
  private static readonly LIMIT = 10;
  private static readonly STUDY_GROUP_LIMIT = 30;
  private static readonly WINDOW_MS = 60_000;
  private hits = new Map<string, number[]>();

  private limitFor(channel: AiRateLimitChannel): number {
    if (channel !== 'study-group') return RateLimitService.LIMIT;
    const raw = Number.parseInt(
      process.env.AI_RATE_LIMIT_STUDY_GROUP_PER_MINUTE?.trim() || '',
      10,
    );
    return Number.isSafeInteger(raw) && raw > 0
      ? raw
      : RateLimitService.STUDY_GROUP_LIMIT;
  }

  assertAllowed(courseId: string, channel: AiRateLimitChannel = 'portal'): void {
    const limit = this.limitFor(channel);
    const key = channel === 'study-group' ? `${courseId}::study-group` : courseId;
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter(
      (t) => now - t < RateLimitService.WINDOW_MS,
    );
    if (recent.length >= limit) {
      this.hits.set(key, recent);
      throw new HttpException(
        `请求过于频繁，请稍后再试（每课程每分钟最多 ${limit} 次）`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.hits.set(key, recent);
  }
}

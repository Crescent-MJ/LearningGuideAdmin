import { HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';

/** §4.4.3 / §2 红线：同一 courseId 每分钟最多 10 次 */
describe('RateLimitService', () => {
  it('第 11 次请求抛 429，不同 courseId 互不影响', () => {
    const svc = new RateLimitService();
    for (let i = 0; i < 10; i++) {
      expect(() => svc.assertAllowed('course-a')).not.toThrow();
    }
    expect(() => svc.assertAllowed('course-a')).toThrow(HttpException);
    try {
      svc.assertAllowed('course-a');
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    expect(() => svc.assertAllowed('course-b')).not.toThrow();
  });

  it('窗口滑出后恢复配额（fake timers）', () => {
    jest.useFakeTimers();
    const svc = new RateLimitService();
    for (let i = 0; i < 10; i++) svc.assertAllowed('course-a');
    expect(() => svc.assertAllowed('course-a')).toThrow(HttpException);
    jest.advanceTimersByTime(61_000);
    expect(() => svc.assertAllowed('course-a')).not.toThrow();
    jest.useRealTimers();
  });

  it('直播间槽位独立：不与学员个人对话共享配额', () => {
    const svc = new RateLimitService();
    for (let i = 0; i < 10; i++) svc.assertAllowed('course-a');
    expect(() => svc.assertAllowed('course-a')).toThrow(HttpException);
    // The Live Room keeps its own bucket, so the exhausted 1:1 quota does not
    // stop the room.
    for (let i = 0; i < 30; i++) {
      expect(() => svc.assertAllowed('course-a', 'study-group')).not.toThrow();
    }
    expect(() => svc.assertAllowed('course-a', 'study-group')).toThrow(
      HttpException,
    );
  });

  it('直播间配额可由 AI_RATE_LIMIT_STUDY_GROUP_PER_MINUTE 覆盖', () => {
    const previous = process.env.AI_RATE_LIMIT_STUDY_GROUP_PER_MINUTE;
    process.env.AI_RATE_LIMIT_STUDY_GROUP_PER_MINUTE = '2';
    try {
      const svc = new RateLimitService();
      svc.assertAllowed('course-a', 'study-group');
      svc.assertAllowed('course-a', 'study-group');
      expect(() => svc.assertAllowed('course-a', 'study-group')).toThrow(
        HttpException,
      );
      // An invalid value keeps the default, never disables the gate.
      process.env.AI_RATE_LIMIT_STUDY_GROUP_PER_MINUTE = 'not-a-number';
      const fallback = new RateLimitService();
      for (let i = 0; i < 30; i++) fallback.assertAllowed('course-b', 'study-group');
      expect(() => fallback.assertAllowed('course-b', 'study-group')).toThrow(
        HttpException,
      );
    } finally {
      if (previous === undefined) {
        delete process.env.AI_RATE_LIMIT_STUDY_GROUP_PER_MINUTE;
      } else {
        process.env.AI_RATE_LIMIT_STUDY_GROUP_PER_MINUTE = previous;
      }
    }
  });
});

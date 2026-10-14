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
});

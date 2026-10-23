import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PortalSourceService } from './portal-source.service';

function serviceWith(env: Record<string, string>) {
  return new PortalSourceService({
    get: (key: string) => env[key],
  } as unknown as ConfigService);
}

describe('PortalSourceService（2026-10-22）', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('缺少 Portal 地址或令牌时拒绝同步', async () => {
    await expect(serviceWith({}).listCourses()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('Portal 返回 307 时提示检查地址与中间件，而不是解析 HTML', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response('', {
        status: 307,
        headers: { location: '/en-GB/backoffice' },
      }),
    );

    await expect(
      serviceWith({
        PORTAL_API_BASE_URL: 'http://localhost:3011',
        PORTAL_API_TOKEN: 'token',
      }).listCourses(),
    ).rejects.toThrow('发生重定向');
  });

  it('解析已发布课程与课时标题，并支持 sections 扁平化', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          courses: [
            {
              externalId: 'epicureanism',
              title: 'Epicureanism',
              lessons: [
                { externalId: 'lesson-1', title: 'Pleasure' },
              ],
            },
            {
              externalId: 'stoicism',
              title: 'Stoicism',
              sections: [
                {
                  externalId: 'section-1',
                  title: 'Foundations',
                  lessons: [{ externalId: 'lesson-2', title: 'What Is Up to Us' }],
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const courses = await serviceWith({
      PORTAL_API_BASE_URL: 'http://localhost:3011/',
      PORTAL_API_TOKEN: 'token',
    }).listCourses();

    expect(courses).toEqual([
      {
        externalId: 'epicureanism',
        title: 'Epicureanism',
        lessons: [{ externalId: 'lesson-1', title: 'Pleasure' }],
      },
      {
        externalId: 'stoicism',
        title: 'Stoicism',
        lessons: [{ externalId: 'lesson-2', title: 'What Is Up to Us' }],
      },
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3011/api/integration/catalogue',
      expect.objectContaining({ redirect: 'manual' }),
    );
  });
});

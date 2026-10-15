import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/app-setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProviderRegistry } from '../src/ai/providers/provider.registry';
import { LlmStreamOptions } from '../src/ai/providers/llm-provider.interface';

/**
 * AI Tutor 后端 e2e（开发文档 §5.2、§4.4、§7 Phase 5）。
 * Provider 用假适配器（不触网）；配置/加密/限流/SSE 帧格式走真实链路。
 */
describe('AI API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let courseId: string;
  let lastOpts: LlmStreamOptions | null;

  const fakeProvider = {
    name: 'openrouter',
    async *stream(opts: LlmStreamOptions): AsyncGenerator<string> {
      lastOpts = opts;
      yield 'Hello';
      yield '!';
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ProviderRegistry)
      .useValue({ get: () => fakeProvider })
      .compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const course = await prisma.course.create({
      data: {
        title: 'AI-E2E课程',
        lessons: {
          create: {
            title: '同步章',
            sortOrder: 0,
            pages: {
              create: [
                {
                  title: '有效页',
                  contentMd: 'SYNCED-CONTENT $E=mc^2$',
                  sortOrder: 0,
                },
                {
                  title: '失效页',
                  contentMd: 'STALE-CONTENT-SHOULD-BE-EXCLUDED',
                  sortOrder: 1,
                  syncState: 'STALE',
                },
              ],
            },
          },
        },
      },
    });
    courseId = course.id;

    // 2026-10-15 激活版本模型（§4.3.3）：chat-stream 知识源读激活 Release，
    // 夹具课程须先发布（发布即激活；快照仅含 SYNCED 节点，STALE 被排除在发布之外）
    await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/release`)
      .send({ revisionNotes: 'e2e 初始发布' })
      .expect(201);
  });

  afterAll(async () => {
    const courses = await prisma.course.findMany({
      where: { title: { startsWith: 'AI-E2E' } },
      select: { id: true },
    });
    const ids = courses.map((c) => c.id);
    if (ids.length > 0) {
      await prisma.courseAiConfig.deleteMany({ where: { courseId: { in: ids } } });
      await prisma.release.deleteMany({ where: { courseId: { in: ids } } }); // Release 无级联，先删
      await prisma.course.deleteMany({ where: { id: { in: ids } } });
    }
    await app.close();
  });

  it('GET /api/ai/models 返回 env 模型清单（§4.2.3，数据源 AI_AVAILABLE_MODELS）', async () => {
    const res = await request(app.getHttpServer()).get('/api/ai/models').expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((m: string) => typeof m === 'string' && m.length > 0)).toBe(true);
  });

  it('GET /api/ai/prompts 返回默认模板（§4.2.4）', async () => {
    const res = await request(app.getHttpServer()).get('/api/ai/prompts').expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.every((t: { isDefault: boolean }) => t.isDefault)).toBe(true);
  });

  it('GET /api/ai/config/:courseId 无配置时返回默认视图且无 apiKey 字段', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/ai/config/${courseId}`)
      .expect(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        llmProvider: 'openrouter',
        hasApiKey: false,
      }),
    );
    expect(typeof res.body.data.llmModel).toBe('string');
    expect(JSON.stringify(res.body)).not.toContain('apiKey');
  });

  it('PUT /api/ai/config 加密存储 apiKey，任何响应不含明文（§2 红线）', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/ai/config')
      .send({
        courseId,
        llmProvider: 'openrouter',
        llmModel: 'test/model-b',
        customSystemPrompt: 'CUSTOM-PROMPT',
        customWelcomeMsg: 'CUSTOM-WELCOME',
        apiKey: 'sk-plain-secret',
      })
      .expect(200);
    expect(res.body.data.hasApiKey).toBe(true);
    expect(res.body.data.llmModel).toBe('test/model-b');
    expect(JSON.stringify(res.body)).not.toContain('sk-plain-secret');

    const stored = await prisma.courseAiConfig.findUnique({ where: { courseId } });
    expect(stored?.apiKey).toBeTruthy();
    expect(stored!.apiKey).not.toContain('sk-plain-secret');
    expect(stored!.apiKey!.split(':')).toHaveLength(3); // iv:tag:cipher
  });

  it('POST /api/ai/chat-stream SSE 流：自定义 Prompt + Socratic 注入 + 排除 STALE 内容（§4.4.2）', async () => {
    lastOpts = null;
    const res = await request(app.getHttpServer())
      .post('/api/ai/chat-stream')
      .send({ courseId, message: '什么是质能方程？', mode: 'SOCRATIC' })
      .expect(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('data: {"delta":"Hello"}');
    expect(res.text).toContain('data: {"delta":"!"}');
    expect(res.text).toContain('data: {"done":true}');

    const system = lastOpts!.messages.find((m) => m.role === 'system')!.content;
    expect(system).toContain('CUSTOM-PROMPT'); // 自定义优先于模板
    expect(system).toContain('苏格拉底式的引导者');
    expect(system).toContain('SYNCED-CONTENT');
    expect(system).not.toContain('STALE-CONTENT-SHOULD-BE-EXCLUDED'); // §3.4.3 快照仅含 SYNCED
    expect(lastOpts!.apiKey).toBe('sk-plain-secret'); // 课程级解密值
  });

  it('POST /api/ai/chat-stream 课程未发布知识库版本应 400（§4.3.3 激活版本模型）', async () => {
    const unpublished = await prisma.course.create({
      data: {
        title: 'AI-E2E未发布课',
        lessons: {
          create: {
            title: '章',
            sortOrder: 0,
            pages: { create: [{ title: '页', contentMd: 'DRAFT-ONLY', sortOrder: 0 }] },
          },
        },
      },
    });
    const res = await request(app.getHttpServer())
      .post('/api/ai/chat-stream')
      .send({ courseId: unpublished.id, message: 'hi', mode: 'LECTURE' })
      .expect(400);
    expect(res.body.error.message).toContain('Publish');
    await prisma.course.delete({ where: { id: unpublished.id } });
  });

  it('POST /api/ai/chat-stream 携带 history 时拼入多轮上下文（§4.4.1）', async () => {
    lastOpts = null;
    await request(app.getHttpServer())
      .post('/api/ai/chat-stream')
      .send({
        courseId,
        message: '继续',
        mode: 'LECTURE',
        history: [{ role: 'user', content: '上一轮问题' }],
      })
      .expect(200);
    expect(lastOpts!.messages.some((m) => m.content === '上一轮问题')).toBe(true);
    const system = lastOpts!.messages[0].content;
    expect(system).not.toContain('苏格拉底式的引导者'); // LECTURE 不注入
  });

  it('POST /api/ai/chat-stream 缺 message 应 400（§4.4.2 第 1 步）', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ai/chat-stream')
      .send({ courseId, mode: 'LECTURE' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/ai/chat-stream 课程不存在应 404', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ai/chat-stream')
      .send({
        courseId: '00000000-0000-0000-0000-000000000000',
        message: 'hi',
        mode: 'LECTURE',
      })
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('限流：同一 courseId 每分钟第 11 次请求应 429（§4.4.3）', async () => {
    const rlCourse = await prisma.course.create({ data: { title: 'AI-E2E限流课' } });
    // 课程级配置 apiKey，避免依赖 env 全局 key
    await request(app.getHttpServer())
      .put('/api/ai/config')
      .send({
        courseId: rlCourse.id,
        llmProvider: 'openrouter',
        llmModel: 'test/model-a',
        apiKey: 'sk-rl-test',
      })
      .expect(200);
    // 限流在知识源校验之前触发（streamChat 第 1 步），但为保持"前 10 次可达链路"语义，先发布空快照
    await request(app.getHttpServer())
      .post(`/api/courses/${rlCourse.id}/release`)
      .send({ revisionNotes: 'e2e 限流课发布' })
      .expect(201);
    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/ai/chat-stream')
        .send({ courseId: rlCourse.id, message: `m${i}`, mode: 'LECTURE' });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
    await prisma.courseAiConfig.deleteMany({ where: { courseId: rlCourse.id } });
    await prisma.release.deleteMany({ where: { courseId: rlCourse.id } });
    await prisma.course.delete({ where: { id: rlCourse.id } });
  });

  it('POST /api/ai/config/:courseId/reset 清除自定义恢复默认（§4.2.4）', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/ai/config/${courseId}/reset`)
      .expect(201);
    expect(res.body.data.customSystemPrompt).toBeNull();
    expect(res.body.data.customWelcomeMsg).toBeNull();
    expect(res.body.data.hasApiKey).toBe(true); // reset 不清 key
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/app-setup';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Knowledge System 后端全流程 e2e（开发文档 §5.1、§5.3、§7 Phase 3）。
 * 连接本地开发库（与 .env 一致），测试数据自建自清：
 * afterAll 直接经 Prisma 清理 Release 与 Course（绕过删除保护接口）。
 */
describe('Knowledge API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // 清理本轮测试创建的课程及其关联（Lesson/Page 由级联、Release 手动先行）
    const courses = await prisma.course.findMany({
      where: {
        OR: [
          { title: { startsWith: 'E2E-' } },
          { externalId: 'ext-quantum-001' }, // sync 导入测试课程
        ],
      },
      select: { id: true },
    });
    const ids = courses.map((c) => c.id);
    if (ids.length > 0) {
      await prisma.release.deleteMany({ where: { courseId: { in: ids } } });
      await prisma.course.deleteMany({ where: { id: { in: ids } } });
    }
    await app.close();
  });

  let courseId: string;
  let lessonId: string;
  let pageId: string;
  let releaseId: string;

  it('POST /api/courses 创建课程', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/courses')
      .send({ title: 'E2E-测试课程', description: 'e2e 自动化' })
      .expect(201);
    expect(res.body).toEqual(expect.objectContaining({ success: true }));
    courseId = res.body.data.id;
    expect(courseId).toBeDefined();
  });

  it('POST /api/courses 缺少 title 应 400 VALIDATION_ERROR（§9.3）', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/courses')
      .send({ description: '无标题' })
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.data).toBeNull();
  });

  it('GET /api/courses 列表包含新创建课程', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/courses')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.some((c: { id: string }) => c.id === courseId)).toBe(
      true,
    );
  });

  it('PUT /api/courses/:id 更新课程（§5.1.1）', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/courses/${courseId}`)
      .send({ description: '更新后的描述' })
      .expect(200);
    expect(res.body.data.description).toBe('更新后的描述');
  });

  it('PUT /api/courses/:id 课程不存在应 404 NOT_FOUND', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/courses/00000000-0000-0000-0000-000000000000')
      .send({ description: 'x' })
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('POST /api/courses/:courseId/lessons 创建章节（§5.1.2）', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/lessons`)
      .send({ title: '第一章', duration: 600 })
      .expect(201);
    lessonId = res.body.data.id;
    expect(res.body.data.sortOrder).toBe(0);
  });

  it('POST /api/lessons/:lessonId/pages 创建页面（含 contentMd 与 tags，§5.1.3）', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/lessons/${lessonId}/pages`)
      .send({
        title: '1.1 概念',
        contentMd: '# 概念\n\n公式 $E=mc^2$',
        tags: ['Core Knowledge'],
      })
      .expect(201);
    pageId = res.body.data.id;
    expect(res.body.data.contentMd).toContain('E=mc^2');
  });

  it('GET /api/courses/:id 详情应含 Lessons 与 Pages（§5.1.1）', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/courses/${courseId}`)
      .expect(200);
    expect(res.body.data.lessons[0].pages[0].id).toBe(pageId);
  });

  it('GET /api/pages/:id 返回 contentMd', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/pages/${pageId}`)
      .expect(200);
    expect(res.body.data.title).toBe('1.1 概念');
  });

  it('PUT /api/pages/:id 更新内容与标签', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/pages/${pageId}`)
      .send({ contentMd: '# 更新', tags: ['Teaching Guidance'], sortOrder: 1 })
      .expect(200);
    expect(res.body.data.contentMd).toBe('# 更新');
  });

  it('PUT /api/lessons/:id 更新章节', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/lessons/${lessonId}`)
      .send({ title: '第一章（改）', duration: 900 })
      .expect(200);
    expect(res.body.data.title).toBe('第一章（改）');
  });

  it('PUT /api/lessons/:id/reorder 调整排序', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/lessons/${lessonId}/reorder`)
      .send({ sortOrder: 5 })
      .expect(200);
    expect(res.body.data.sortOrder).toBe(5);
  });

  it('POST /api/courses/:id/release 发布快照（§5.1.4）', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/release`)
      .send({ revisionNotes: 'e2e 首发' })
      .expect(201);
    releaseId = res.body.data.id;
    expect(res.body.data.versionTag).toMatch(/^E2E-测试课程_\d{14}$/);
    expect(res.body.data.snapshotData.lessons[0].pages[0].contentMd).toBe(
      '# 更新',
    );
  });

  it('POST /api/courses/:id/release 缺 revisionNotes 应 400', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/release`)
      .send({})
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/courses/:id/releases 历史列表不含 snapshotData', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/releases`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].snapshotData).toBeUndefined();
  });

  it('GET /api/releases/:releaseId 快照详情', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/releases/${releaseId}`)
      .expect(200);
    expect(res.body.data.revisionNotes).toBe('e2e 首发');
    expect(res.body.data.snapshotData.lessons).toBeDefined();
  });

  it('DELETE /api/courses/:id 存在 Release 应 409 CONFLICT（删除保护）', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/courses/${courseId}`)
      .expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('DELETE /api/pages/:id 删除页面', async () => {
    await request(app.getHttpServer())
      .delete(`/api/pages/${pageId}`)
      .expect(200);
    const res = await request(app.getHttpServer())
      .get(`/api/pages/${pageId}`)
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /api/lessons/:id 删除章节（级联 Page）', async () => {
    await request(app.getHttpServer())
      .delete(`/api/lessons/${lessonId}`)
      .expect(200);
    expect(
      await prisma.page.count({ where: { lessonId } }),
    ).toBe(0);
  });

  it('POST /api/sync/all 导入外部课程并幂等（§3.2.2/§5.1.5）', async () => {
    // 选择外部独有、本地未导入的课程做导入测试，避免污染 demo 数据
    const externalId = 'ext-quantum-001';
    const res = await request(app.getHttpServer())
      .post('/api/sync/all')
      .send({ externalId })
      .expect(201);
    expect(res.body.success).toBe(true);
    // 首次导入：1 章 + 2 页全部新建
    expect(res.body.data.created).toBeGreaterThanOrEqual(3);
    expect(res.body.data.unchanged).toBe(false);

    // 本地课程应带外部内容落库
    const course = await prisma.course.findFirst({
      where: { externalId },
      include: { lessons: { include: { pages: true } } },
    });
    expect(course).not.toBeNull();
    const firstPage = course!.lessons[0].pages[0];
    expect(firstPage.contentMd.length).toBeGreaterThan(0);
    expect(firstPage.syncState).toBe('SYNCED');

    // 再次同步：无变更（幂等）
    const again = await request(app.getHttpServer())
      .post('/api/sync/all')
      .send({ externalId })
      .expect(201);
    expect(again.body.data.unchanged).toBe(true);
  });

  it('POST /api/sync/structure 缺少 externalId 应 400 VALIDATION_ERROR', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/sync/structure')
      .send({})
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/sync/external-courses 返回外部课程列表与状态（§5.1.5）', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/sync/external-courses')
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const quantum = res.body.data.find(
      (c: { externalId: string }) => c.externalId === 'ext-quantum-001',
    );
    expect(quantum).toBeDefined();
    // 上一步已导入，状态应为 synced
    expect(quantum.status).toBe('synced');
  });

  it('未知路由应返回统一 404 信封且无堆栈泄露（§5.3、§9）', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/not-exist')
      .expect(404);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: { code: 'NOT_FOUND', message: expect.any(String) },
    });
  });

  it('GET /api/courses 成功信封完整（§5.3）', async () => {
    const res = await request(app.getHttpServer()).get('/api/courses').expect(200);
    expect(Object.keys(res.body).sort()).toEqual(
      ['data', 'error', 'message', 'success'].sort(),
    );
    expect(res.body.message).toBe('操作成功');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/app-setup';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Knowledge System 后端全流程 e2e（开发文档 §5.1、§5.3）。
 * 2026-10-16 扁平化：Course → Page 两级（原 Lesson → Page 合并）。
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
    const courses = await prisma.course.findMany({
      where: {
        OR: [
          { title: { startsWith: 'E2E-' } },
          { externalId: 'ext-quantum-001' },
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

  it('POST /api/courses 缺少 title 应 400 VALIDATION_ERROR', async () => {
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

  it('PUT /api/courses/:id 更新课程', async () => {
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

  it('POST /api/courses/:courseId/pages 创建页面（含 contentMd 与 sectionTags，§5.1.2）', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/pages`)
      .send({
        title: 'Introduction',
        contentMd: '# Overview\n\n公式 $E=mc^2$',
        sectionTags: { 'h1-overview': ['Core Knowledge'] },
      })
      .expect(201);
    pageId = res.body.data.id;
    expect(res.body.data.contentMd).toContain('E=mc^2');
    expect(res.body.data.sortOrder).toBe(0);
  });

  it('GET /api/courses/:id 详情应含 Pages（§5.1.1）', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/courses/${courseId}`)
      .expect(200);
    expect(res.body.data.pages[0].id).toBe(pageId);
  });

  it('GET /api/pages/:id 返回 contentMd', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/pages/${pageId}`)
      .expect(200);
    expect(res.body.data.title).toBe('Introduction');
  });

  it('PUT /api/pages/:id 更新内容与 sectionTags', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/pages/${pageId}`)
      .send({ contentMd: '# 更新', sectionTags: { 'h1-geng-xin': ['Teaching Guidance'] }, sortOrder: 1 })
      .expect(200);
    expect(res.body.data.contentMd).toBe('# 更新');
  });

  it('PUT /api/courses/:courseId/pages/reorder 批量重排 Page 顺序（§5.1.2，2026-10-19 新增）', async () => {
    const extra = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/pages`)
      .send({ title: 'Extensions', contentMd: '# Extensions' })
      .expect(201);
    const extraId = extra.body.data.id as string;

    await request(app.getHttpServer())
      .put(`/api/courses/${courseId}/pages/reorder`)
      .send({ orderedIds: [extraId, pageId] })
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/api/courses/${courseId}`)
      .expect(200);
    expect(detail.body.data.pages.map((p: { id: string }) => p.id)).toEqual([
      extraId,
      pageId,
    ]);
    expect(
      detail.body.data.pages.map((p: { sortOrder: number }) => p.sortOrder),
    ).toEqual([0, 1]);

    // 还原顺序并删除临时页，避免影响后续发布快照断言
    await request(app.getHttpServer())
      .put(`/api/courses/${courseId}/pages/reorder`)
      .send({ orderedIds: [pageId, extraId] })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/pages/${extraId}`)
      .expect(200);
  });

  it('PUT /api/courses/:courseId/pages/reorder 非完整排列应 400 VALIDATION_ERROR', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/courses/${courseId}/pages/reorder`)
      .send({ orderedIds: ['00000000-0000-0000-0000-000000000000'] })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PUT /api/courses/:courseId/pages/reorder 含重复 id 应 400 VALIDATION_ERROR', async () => {
    // 造 2 个 Page，使 orderedIds 长度等于页数但含重复，命中重复校验分支
    const extra = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/pages`)
      .send({ title: 'Extensions-Dup', contentMd: '# Dup' })
      .expect(201);
    const extraId = extra.body.data.id as string;

    const res = await request(app.getHttpServer())
      .put(`/api/courses/${courseId}/pages/reorder`)
      .send({ orderedIds: [pageId, pageId] })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');

    await request(app.getHttpServer())
      .delete(`/api/pages/${extraId}`)
      .expect(200);
  });

  it('PUT /api/courses/:courseId/pages/reorder 空数组应 400 VALIDATION_ERROR', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/courses/${courseId}/pages/reorder`)
      .send({ orderedIds: [] })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PUT /api/courses/:courseId/pages/reorder 课程不存在应 404 NOT_FOUND', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/courses/00000000-0000-0000-0000-000000000000/pages/reorder')
      .send({ orderedIds: ['00000000-0000-0000-0000-000000000000'] })
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('POST /api/courses/:id/release 发布快照（§5.1.3）', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/release`)
      .send({ revisionNotes: 'e2e 首发' })
      .expect(201);
    releaseId = res.body.data.id;
    expect(res.body.data.versionTag).toMatch(/^E2E-测试课程_\d{12}$/);
    expect(res.body.data.snapshotData.pages[0].contentMd).toBe('# 更新');
  });

  it('POST /api/courses/:id/release 缺 revisionNotes 应 400', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/release`)
      .send({})
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/courses/:id/releases 历史列表不含 snapshotData，激活版本标注 isActive', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/releases`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].snapshotData).toBeUndefined();
    expect(res.body.data[0].isActive).toBe(true);
  });

  it('GET /api/releases/:releaseId 快照详情', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/releases/${releaseId}`)
      .expect(200);
    expect(res.body.data.revisionNotes).toBe('e2e 首发');
    expect(res.body.data.snapshotData.pages).toBeDefined();
  });

  it('POST /api/courses/:id/activate-release 切换历史版本并重建草稿（§3.4.2）', async () => {
    await request(app.getHttpServer())
      .put(`/api/pages/${pageId}`)
      .send({ contentMd: '# v2 草稿内容' })
      .expect(200);
    const v2 = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/release`)
      .send({ revisionNotes: 'e2e 二发' })
      .expect(201);

    const act = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/activate-release`)
      .send({ releaseId })
      .expect(201);
    expect(act.body.data.id).toBe(releaseId);

    const detail = await request(app.getHttpServer())
      .get(`/api/courses/${courseId}`)
      .expect(200);
    const pages = detail.body.data.pages;
    expect(pages).toHaveLength(1);
    expect(pages[0].contentMd).toBe('# 更新');
    expect(pages[0].syncState).toBe('SYNCED');
    pageId = pages[0].id as string;

    const list = await request(app.getHttpServer())
      .get(`/api/courses/${courseId}/releases`)
      .expect(200);
    expect(list.body.data.find((r: { id: string }) => r.id === releaseId).isActive).toBe(true);
    expect(
      list.body.data.find((r: { id: string }) => r.id === v2.body.data.id).isActive,
    ).toBe(false);
  });

  it('POST /api/courses/:id/activate-release releaseId 不属于该课程应 404', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/activate-release`)
      .send({ releaseId: '00000000-0000-0000-0000-000000000000' })
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
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

  it('POST /api/sync/all 导入外部课程并幂等（§3.2.2/§5.1.4）', async () => {
    const externalId = 'ext-quantum-001';
    const res = await request(app.getHttpServer())
      .post('/api/sync/all')
      .send({ externalId })
      .expect(201);
    expect(res.body.success).toBe(true);
    // 外部量子课程 1 Lesson（含 2 Page）→ 合并为 1 个本地 Page
    expect(res.body.data.created).toBeGreaterThanOrEqual(1);
    expect(res.body.data.unchanged).toBe(false);

    const course = await prisma.course.findFirst({
      where: { externalId },
      include: { pages: true },
    });
    expect(course).not.toBeNull();
    const firstPage = course!.pages[0];
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

  it('GET /api/sync/external-courses 返回外部课程列表与状态（§5.1.4）', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/sync/external-courses')
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const quantum = res.body.data.find(
      (c: { externalId: string }) => c.externalId === 'ext-quantum-001',
    );
    expect(quantum).toBeDefined();
    expect(quantum.status).toBe('synced');
  });

  it('未知路由应返回统一 404 信封且无堆栈泄露', async () => {
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

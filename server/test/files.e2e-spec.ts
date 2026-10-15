import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/app-setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { MAX_FILE_SIZE } from '../src/files/files.service';

/**
 * 文件上传 e2e（开发文档 §5.1.6、§3.2.3、§10）。
 * 自建课程/章节夹具，afterAll 经 Prisma 清理；真实调用 markitdown-ts 本地转换（md 直通）。
 */
describe('Files API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let courseId: string;
  let lessonId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const course = await request(app.getHttpServer())
      .post('/api/courses')
      .send({ title: 'E2E-上传测试课程' })
      .expect(201);
    courseId = course.body.data.id;
    const lesson = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/lessons`)
      .send({ title: '上传章节' })
      .expect(201);
    lessonId = lesson.body.data.id;
  });

  afterAll(async () => {
    const courses = await prisma.course.findMany({
      where: { title: { startsWith: 'E2E-上传测试课程' } },
      select: { id: true },
    });
    const ids = courses.map((c) => c.id);
    if (ids.length > 0) {
      await prisma.release.deleteMany({ where: { courseId: { in: ids } } });
      await prisma.course.deleteMany({ where: { id: { in: ids } } });
    }
    await app.close();
  });

  it('POST /api/files/upload 上传 md 应在章节下建页（标题=文件名去扩展名，§3.2.3）', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/files/upload')
      .field('lessonId', lessonId)
      .attach(
        'file',
        Buffer.from('# 极限与连续\n\n$\\lim_{x\\to 0}\\frac{\\sin x}{x}=1$', 'utf8'),
        { filename: '上传笔记.md', contentType: 'text/markdown' },
      )
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('上传笔记');
    expect(res.body.data.contentMd).toContain('极限与连续');
    expect(res.body.data.syncState).toBe('SYNCED');
    // 落库校验：页面归属该 Lesson
    const page = await prisma.page.findUnique({ where: { id: res.body.data.id } });
    expect(page?.lessonId).toBe(lessonId);
  });

  it('上传白名单外扩展名（.exe）应 400 且提示支持格式（§10.1）', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/files/upload')
      .field('lessonId', lessonId)
      .attach('file', Buffer.from('MZ\x90\x00binary'), { filename: 'virus.exe' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('格式暂不支持');
  });

  it('缺少 lessonId 字段应 400 VALIDATION_ERROR（§9.3）', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/files/upload')
      .attach('file', Buffer.from('# x', 'utf8'), { filename: 'a.md' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lessonId 非法 UUID 应 400（DTO @IsUUID）', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/files/upload')
      .field('lessonId', 'not-a-uuid')
      .attach('file', Buffer.from('# x', 'utf8'), { filename: 'a.md' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lessonId 不存在应 404 NOT_FOUND', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/files/upload')
      .field('lessonId', '00000000-0000-0000-0000-000000000000')
      .attach('file', Buffer.from('# x', 'utf8'), { filename: 'a.md' })
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('未附带 file 字段应 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/files/upload')
      .field('lessonId', lessonId)
      .expect(400);
    expect(res.body.error.message).toContain('未选择文件');
  });

  it('超过 15MB 应 400（multer LIMIT_FILE_SIZE 映射，§10.1）', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/files/upload')
      .field('lessonId', lessonId)
      .attach('file', Buffer.alloc(MAX_FILE_SIZE + 1, 0x41), {
        filename: 'big.md',
        contentType: 'text/markdown',
      })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('15MB');
  });

  it('错误信封不泄露堆栈/内部路径（§9）', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/files/upload')
      .field('lessonId', lessonId)
      .attach('file', Buffer.from('garbage'), { filename: 'x.pdf' })
      .expect(400);
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('at ');
    expect(text).not.toContain('node_modules');
    expect(res.body.error.message).not.toContain('MarkItDown');
  });
});

import { BadRequestException } from '@nestjs/common';
import { FilesService } from './files.service';
import { PagesService } from '../pages/pages.service';

/**
 * FilesService 单元测试（§3.2.3/§10）：白名单/空文件校验、
 * markitdown-ts 真实转换（md 直通）、建页参数（标题=文件名去扩展名）。
 */
describe('FilesService', () => {
  const pagesService = { create: jest.fn() };
  let service: FilesService;

  const mkFile = (name: string, buffer: Buffer): Express.Multer.File =>
    ({
      originalname: name,
      buffer,
      size: buffer.length,
    }) as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FilesService(pagesService as unknown as PagesService);
    pagesService.create.mockImplementation((_lessonId: string, dto: unknown) =>
      Promise.resolve({ id: 'p1', ...dto }),
    );
  });

  it('md 文件应本地转换为 Page（标题=文件名去扩展名，contentMd=转换内容）', async () => {
    const file = mkFile('我的笔记.md', Buffer.from('# 标题\n\n正文内容', 'utf8'));
    const page = await service.uploadAndCreatePage(file, 'l1');
    expect(pagesService.create).toHaveBeenCalledWith(
      'l1',
      expect.objectContaining({ title: '我的笔记' }),
    );
    expect((page as { contentMd: string }).contentMd).toContain('正文内容');
  });

  it('白名单外扩展名应 400（如 .exe / .epub）', async () => {
    await expect(
      service.uploadAndCreatePage(mkFile('a.exe', Buffer.from('x')), 'l1'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.uploadAndCreatePage(mkFile('b.epub', Buffer.from('x')), 'l1'),
    ).rejects.toThrow(BadRequestException);
    expect(pagesService.create).not.toHaveBeenCalled();
  });

  it('无扩展名或空 buffer 应 400', async () => {
    await expect(
      service.uploadAndCreatePage(mkFile('noext', Buffer.from('x')), 'l1'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.uploadAndCreatePage(mkFile('c.md', Buffer.alloc(0)), 'l1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('转换结果为空（空文档）应 400', async () => {
    await expect(
      service.uploadAndCreatePage(mkFile('empty.md', Buffer.from('   ')), 'l1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('multipart 中文文件名（busboy latin1 乱码）应还原为正确标题', async () => {
    // 模拟浏览器上传：UTF-8 字节被 busboy 按 latin1 解码后的 originalname
    const wireName = Buffer.from('中文笔记.md', 'utf8').toString('latin1');
    expect(wireName).not.toBe('中文笔记.md');
    const file = mkFile(wireName, Buffer.from('# 内容\n\n正文', 'utf8'));
    await service.uploadAndCreatePage(file, 'l1');
    expect(pagesService.create).toHaveBeenCalledWith(
      'l1',
      expect.objectContaining({ title: '中文笔记' }),
    );
  });
});

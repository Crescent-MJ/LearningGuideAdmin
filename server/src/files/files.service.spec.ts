import { BadRequestException } from '@nestjs/common';
import { FilesService } from './files.service';

/**
 * FilesService 单元测试（§3.2.3/§10，两步流程改拍后）：白名单/空文件校验、
 * markitdown-ts 真实转换（md 直通）、返回 { title, markdown }（标题=文件名去扩展名）。
 */
describe('FilesService', () => {
  let service: FilesService;

  const mkFile = (name: string, buffer: Buffer): Express.Multer.File =>
    ({
      originalname: name,
      buffer,
      size: buffer.length,
    }) as Express.Multer.File;

  beforeEach(() => {
    service = new FilesService();
  });

  it('md 文件应本地转换返回 title+markdown（标题=文件名去扩展名）', async () => {
    const file = mkFile('我的笔记.md', Buffer.from('# 标题\n\n正文内容', 'utf8'));
    const result = await service.convertFile(file);
    expect(result.title).toBe('我的笔记');
    expect(result.markdown).toContain('正文内容');
  });

  it('白名单外扩展名应 400（如 .exe / .epub）', async () => {
    await expect(
      service.convertFile(mkFile('a.exe', Buffer.from('x'))),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.convertFile(mkFile('b.epub', Buffer.from('x'))),
    ).rejects.toThrow(BadRequestException);
  });

  it('无扩展名、空 buffer 或 undefined 应 400', async () => {
    await expect(
      service.convertFile(mkFile('noext', Buffer.from('x'))),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.convertFile(mkFile('c.md', Buffer.alloc(0))),
    ).rejects.toThrow(BadRequestException);
    await expect(service.convertFile(undefined)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('转换结果为空（空文档）应 400', async () => {
    await expect(
      service.convertFile(mkFile('empty.md', Buffer.from('   '))),
    ).rejects.toThrow(BadRequestException);
  });

  it('multipart 中文文件名（busboy latin1 乱码）应还原为正确标题', async () => {
    // 模拟浏览器上传：UTF-8 字节被 busboy 按 latin1 解码后的 originalname
    const wireName = Buffer.from('中文笔记.md', 'utf8').toString('latin1');
    expect(wireName).not.toBe('中文笔记.md');
    const result = await service.convertFile(
      mkFile(wireName, Buffer.from('# 内容\n\n正文', 'utf8')),
    );
    expect(result.title).toBe('中文笔记');
  });
});

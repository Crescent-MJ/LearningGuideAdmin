import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { MarkItDown } from 'markitdown-ts';

/** §10.1 白名单（2026-10-15 按 markitdown-ts 实测支持面拍板；xls/doc/ppt/epub 不支持） */
export const ALLOWED_EXTENSIONS = [
  '.txt',
  '.md',
  '.csv',
  '.pdf',
  '.docx',
  '.xlsx',
  '.html',
  '.xml',
] as const;

/** §10.1 单文件大小上限 15MB */
export const MAX_FILE_SIZE = 15 * 1024 * 1024;

export interface ConvertedDocument {
  /** 文件名去扩展名（作新页标题） */
  title: string;
  markdown: string;
}

/** 文档转换（开发文档 §3.2.3、§5.1.6、§10）：仅转换不建页，建页由前端 Import 经 §5.1.3 完成 */
@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly markitdown = new MarkItDown();

  /**
   * 校验上传文件 → markitdown-ts 本地转换（内存 Buffer，不落盘）→
   * 返回 { title, markdown } 供弹窗预览（2026-10-15 两步流程改拍）。
   */
  async convertFile(file: Express.Multer.File | undefined): Promise<ConvertedDocument> {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('未选择文件（multipart 字段名须为 file）');
    }
    const originalName = this.fixFilenameEncoding(file.originalname);
    const ext = this.getExtension(originalName);
    if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
      throw new BadRequestException(
        `格式暂不支持：${ext || '未知'}（支持 ${ALLOWED_EXTENSIONS.join(' / ')}）`,
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('文件大小超过 15MB 限制');
    }

    let markdown: string;
    try {
      const result = await this.markitdown.convertBuffer(file.buffer, {
        file_extension: ext,
      });
      markdown = result?.markdown?.trim() ?? '';
    } catch (e) {
      // 原始错误仅落服务器日志，不向外回显（§9 安全）
      this.logger.warn(
        `文档转换失败 ${originalName}: ${e instanceof Error ? e.message : String(e)}`,
      );
      throw new BadRequestException('文档转换失败，请检查文件是否损坏或受密码保护');
    }
    if (!markdown) {
      throw new BadRequestException('文档转换结果为空');
    }

    const title =
      originalName.slice(0, -ext.length || undefined).trim() || '未命名页面';
    return { title, markdown };
  }

  /**
   * 修复 multipart 中文文件名乱码：busboy 按 latin1 解析文件名头，
   * UTF-8 字节会被拆成重码字符；重解码成功（无替换符）时采用，否则保留原值。
   */
  private fixFilenameEncoding(name: string): string {
    const reDecoded = Buffer.from(name, 'latin1').toString('utf8');
    return reDecoded.includes('\uFFFD') ? name : reDecoded;
  }

  /** 取小写扩展名（含点）；无扩展名返回空串 */
  private getExtension(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(dot).toLowerCase() : '';
  }
}

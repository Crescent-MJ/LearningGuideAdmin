import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService, MAX_FILE_SIZE } from './files.service';

/**
 * 文档转换（§5.1.6）：multipart file → 本地转 Markdown 返回预览，不建页。
 * multer 内存存储（无 dest 即 memoryStorage），Buffer 直转不落盘（§10.2 第 4 步）。
 * 用户确认后由前端经 POST /api/lessons/:lessonId/pages（§5.1.3）建页。
 */
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('convert')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE, files: 1 } }),
  )
  convert(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('未选择文件（multipart 字段名须为 file）');
    }
    return this.filesService.convertFile(file);
  }
}

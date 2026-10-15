import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService, MAX_FILE_SIZE } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';

/**
 * 文件上传（§5.1.6）：multipart file + lessonId。
 * multer 内存存储（无 dest 即 memoryStorage），Buffer 直转不落盘（§10.2 第 4 步）。
 */
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE, files: 1 } }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadFileDto,
  ) {
    if (!file) {
      throw new BadRequestException('未选择文件（multipart 字段名须为 file）');
    }
    return this.filesService.uploadAndCreatePage(file, dto.lessonId);
  }
}

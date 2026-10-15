import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { PagesModule } from '../pages/pages.module';

/** 文件上传转 Markdown（§3.2.3/§5.1.6）：复用 PagesService 建页（含 lesson 404 校验） */
@Module({
  imports: [PagesModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}

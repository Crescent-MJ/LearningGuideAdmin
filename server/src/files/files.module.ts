import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

/** 文档转换（§3.2.3/§5.1.6）：仅转换返回预览，建页走 §5.1.3 页面创建接口 */
@Module({
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}

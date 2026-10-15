import { Module } from '@nestjs/common';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({
  controllers: [PagesController],
  providers: [PagesService],
  exports: [PagesService], // FilesModule 复用建页逻辑（§3.2.3）
})
export class PagesModule {}

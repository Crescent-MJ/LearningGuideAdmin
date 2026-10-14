import { Controller, Post } from '@nestjs/common';
import { SyncService } from './sync.service';

/** §5.1.5 同步接口（Mock 版本，见 sync.service.ts 注释） */
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('structure')
  syncStructure() {
    return this.syncService.syncStructure();
  }

  @Post('all')
  syncAll() {
    return this.syncService.syncAll();
  }
}

import { Body, Controller, Get, Post } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncRequestDto } from './dto/sync-request.dto';

/**
 * 同步接口（§5.1.5 / §3.2.2 外部源接管模型）。
 * 外部源为 Mock fixture（demo-fixtures.ts），真实 API 接入后仅替换数据源。
 */
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /** 外部源课程列表 + 同步状态（供前端选择器） */
  @Get('external-courses')
  listExternalCourses() {
    return this.syncService.listExternalCourses();
  }

  /** 仅同步目录树结构 */
  @Post('structure')
  syncStructure(@Body() dto: SyncRequestDto) {
    return this.syncService.sync(dto.externalId, 'structure');
  }

  /** 同步结构 + 内容（非破坏性） */
  @Post('all')
  syncAll(@Body() dto: SyncRequestDto) {
    return this.syncService.sync(dto.externalId, 'all');
  }
}

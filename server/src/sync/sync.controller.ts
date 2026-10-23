import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncRequestDto } from './dto/sync-request.dto';

/**
 * 同步接口（§5.1.5 / §3.2.2 外部源接管模型）。
 * 2026-10-22 起外部源为 LearningGuidePortal，仅同步课程与课时标题。
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

  /** 内容同步已禁用（2026-10-22 拍板：本期只同步标题） */
  @Post('all')
  syncAll(_dto: SyncRequestDto) {
    throw new BadRequestException({
      code: 'CONTENT_SYNC_DISABLED',
      message: '本期仅同步课程与课时标题，正文内容同步已禁用',
    });
  }
}

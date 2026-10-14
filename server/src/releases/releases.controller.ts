import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ReleasesService } from './releases.service';
import { CreateReleaseDto } from './dto/create-release.dto';

/**
 * §5.1.4 发布与版本。
 * 路由跨 courses 与 releases 两组，故用空前缀 + 完整相对路径声明。
 */
@Controller()
export class ReleasesController {
  constructor(private readonly releasesService: ReleasesService) {}

  @Post('courses/:id/release')
  publish(@Param('id') id: string, @Body() dto: CreateReleaseDto) {
    return this.releasesService.publish(id, dto);
  }

  @Get('courses/:id/releases')
  findAllByCourse(@Param('id') id: string) {
    return this.releasesService.findAllByCourse(id);
  }

  @Get('releases/:releaseId')
  findOne(@Param('releaseId') releaseId: string) {
    return this.releasesService.findByReleaseId(releaseId);
  }
}

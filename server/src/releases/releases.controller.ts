import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ReleasesService } from './releases.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { ActivateReleaseDto } from './dto/activate-release.dto';

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

  @Post('courses/:id/activate-release')
  activate(@Param('id') id: string, @Body() dto: ActivateReleaseDto) {
    return this.releasesService.activate(id, dto);
  }

  /** Set Live（§3.4.4，2026-10-20 新增）：轻量切换上线指针，不重建草稿 */
  @Post('courses/:id/set-live')
  setLive(@Param('id') id: string, @Body() dto: ActivateReleaseDto) {
    return this.releasesService.setLive(id, dto);
  }

  @Get('courses/:id/releases')
  findAllByCourse(@Param('id') id: string) {
    return this.releasesService.findAllByCourse(id);
  }

  @Get('releases/:releaseId')
  findOne(@Param('releaseId') releaseId: string) {
    return this.releasesService.findByReleaseId(releaseId);
  }

  /** 删除版本（§3.4.5，2026-10-20 新增）：Live / 后台测试所选版本返回 409 */
  @Delete('releases/:releaseId')
  remove(@Param('releaseId') releaseId: string) {
    return this.releasesService.remove(releaseId);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

/**
 * §5.1.3 页面 CRUD。
 * 路由跨 lessons 与 pages 两组（POST /api/lessons/:lessonId/pages、
 * GET|PUT|DELETE /api/pages/:id），故用空前缀 + 完整相对路径声明。
 */
@Controller()
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Post('lessons/:lessonId/pages')
  create(@Param('lessonId') lessonId: string, @Body() dto: CreatePageDto) {
    return this.pagesService.create(lessonId, dto);
  }

  @Get('pages/:id')
  findOne(@Param('id') id: string) {
    return this.pagesService.findOne(id);
  }

  @Put('pages/:id')
  update(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    return this.pagesService.update(id, dto);
  }

  @Delete('pages/:id')
  remove(@Param('id') id: string) {
    return this.pagesService.remove(id);
  }
}

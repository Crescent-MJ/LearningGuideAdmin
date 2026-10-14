import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ReorderLessonDto } from './dto/reorder-lesson.dto';

/**
 * §5.1.2 章节 CRUD。
 * 路由前缀跨 courses 与 lessons 两组（POST /api/courses/:courseId/lessons、
 * PUT|DELETE /api/lessons/:id），故用空前缀 + 完整相对路径声明。
 */
@Controller()
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post('courses/:courseId/lessons')
  create(@Param('courseId') courseId: string, @Body() dto: CreateLessonDto) {
    return this.lessonsService.create(courseId, dto);
  }

  @Put('lessons/:id/reorder')
  reorder(@Param('id') id: string, @Body() dto: ReorderLessonDto) {
    return this.lessonsService.reorder(id, dto);
  }

  @Put('lessons/:id')
  update(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.lessonsService.update(id, dto);
  }

  @Delete('lessons/:id')
  remove(@Param('id') id: string) {
    return this.lessonsService.remove(id);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ReorderLessonDto } from './dto/reorder-lesson.dto';

/** Lesson CRUD + 排序（开发文档 §5.1.2） */
@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 在指定 Course 下创建 Lesson；courseId 不存在时 404 */
  async create(courseId: string, dto: CreateLessonDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException('所属课程不存在');
    }
    // sortOrder 缺省：追加到末尾（现有 Lesson 数量即下一个序号）
    const sortOrder =
      dto.sortOrder ??
      (await this.prisma.lesson.count({ where: { courseId } }));
    return this.prisma.lesson.create({
      data: { courseId, title: dto.title, duration: dto.duration, sortOrder },
    });
  }

  async update(id: string, dto: UpdateLessonDto) {
    await this.ensureExists(id);
    return this.prisma.lesson.update({ where: { id }, data: dto });
  }

  /** 删除 Lesson：级联删除其下 Page（schema onDelete: Cascade） */
  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.lesson.delete({ where: { id } });
    return { id };
  }

  async reorder(id: string, dto: ReorderLessonDto) {
    await this.ensureExists(id);
    return this.prisma.lesson.update({
      where: { id },
      data: { sortOrder: dto.sortOrder },
    });
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.lesson.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('章节不存在');
    }
  }
}

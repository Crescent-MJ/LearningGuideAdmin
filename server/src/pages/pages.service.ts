import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

/** Page CRUD（开发文档 §5.1.3） */
@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  /** 在指定 Lesson 下创建 Page；lessonId 不存在时 404 */
  async create(lessonId: string, dto: CreatePageDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });
    if (!lesson) {
      throw new NotFoundException('所属章节不存在');
    }
    const sortOrder =
      dto.sortOrder ??
      (await this.prisma.page.count({ where: { lessonId } }));
    return this.prisma.page.create({
      data: { lessonId, title: dto.title, contentMd: dto.contentMd, tags: dto.tags, sortOrder },
    });
  }

  /** 单个 Page，含 contentMd（§5.1.3） */
  async findOne(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) {
      throw new NotFoundException('页面不存在');
    }
    return page;
  }

  async update(id: string, dto: UpdatePageDto) {
    await this.ensureExists(id);
    return this.prisma.page.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.page.delete({ where: { id } });
    return { id };
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.page.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('页面不存在');
    }
  }
}

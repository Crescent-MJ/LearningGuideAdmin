import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReleaseDto } from './dto/create-release.dto';

/** 发布与版本（开发文档 §5.1.4、§3.4） */
@Injectable()
export class ReleasesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 发布 Course 快照：将当前 Lessons/Pages 全量内容固化为不可变 snapshotData。
   * versionTag 格式: "CourseName_YYYYMMDDHHmmss"（§2 Release 模型）。
   */
  async publish(courseId: string, dto: CreateReleaseDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        lessons: {
          orderBy: { sortOrder: 'asc' },
          include: { pages: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!course) {
      throw new NotFoundException('课程不存在');
    }
    const snapshotData = {
      lessons: course.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        pages: lesson.pages.map((page) => ({
          id: page.id,
          title: page.title,
          contentMd: page.contentMd,
          tags: page.tags,
        })),
      })),
    };
    return this.prisma.release.create({
      data: {
        courseId,
        versionTag: `${course.title}_${this.timestamp()}`,
        revisionNotes: dto.revisionNotes,
        snapshotData,
      },
    });
  }

  /** Course 的 Release 历史列表（不含 snapshotData，避免响应过大） */
  async findAllByCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException('课程不存在');
    }
    return this.prisma.release.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        versionTag: true,
        revisionNotes: true,
        createdAt: true,
      },
    });
  }

  /** 某个 Release 的快照详情 */
  async findByReleaseId(releaseId: string) {
    const release = await this.prisma.release.findUnique({
      where: { id: releaseId },
    });
    if (!release) {
      throw new NotFoundException('发布版本不存在');
    }
    return release;
  }

  /** 本地时间 YYYYMMDDHHmmss */
  private timestamp(): string {
    const d = new Date();
    const p = (n: number): string => String(n).padStart(2, '0');
    return (
      `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
      `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
    );
  }
}

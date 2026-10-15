import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { ActivateReleaseDto } from './dto/activate-release.dto';

/** snapshotData 结构（开发文档 §2 Release 模型注释；lessons/pages 均按 sortOrder 升序） */
interface SnapshotPage {
  id: string;
  title: string;
  contentMd: string;
  tags?: unknown;
}
interface SnapshotLesson {
  id: string;
  title: string;
  pages?: SnapshotPage[];
}
interface SnapshotData {
  lessons?: SnapshotLesson[];
}

/** 发布与版本（开发文档 §5.1.4、§3.4；2026-10-15 拍板：发布即激活 + 历史版本可切换，§3.4.2/§3.4.3） */
@Injectable()
export class ReleasesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 发布 Course 快照并激活：将当前 Lessons/Pages 内容固化为不可变 snapshotData，
   * 并将 Course.currentReleaseId 指向新 Release（发布即激活，§3.4.3）。
   * 快照仅收录 syncState=SYNCED 节点（延续 §3.2.2「STALE 不作 AI 知识库」）。
   * versionTag 格式: "CourseName_YYYYMMDDHHmmss"（§2 Release 模型）。
   */
  async publish(courseId: string, dto: CreateReleaseDto) {
    // §3.4.3「单事务」：读取草稿树与写入快照/激活指针同一事务，
    // 消除「读取后、提交前」并发编辑导致快照与草稿脱节的窗口
    return this.prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({
        where: { id: courseId },
        include: {
          lessons: {
            where: { syncState: 'SYNCED' },
            orderBy: { sortOrder: 'asc' },
            include: {
              pages: {
                where: { syncState: 'SYNCED' },
                orderBy: { sortOrder: 'asc' },
              },
            },
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
      const release = await tx.release.create({
        data: {
          courseId,
          versionTag: `${course.title}_${this.timestamp()}`,
          revisionNotes: dto.revisionNotes,
          snapshotData,
        },
      });
      await tx.course.update({
        where: { id: courseId },
        data: { currentReleaseId: release.id },
      });
      return release;
    });
  }

  /**
   * 切换激活版本（§3.4.2）：单事务内校验归属 → 以快照重建 Lesson/Page 草稿树
   * （覆盖当前草稿，含未发布修改；前端已二次确认）→ 更新 currentReleaseId。
   * 重建节点一律 syncState=SYNCED，后续 Sync 按标题匹配不受影响。
   */
  async activate(courseId: string, dto: ActivateReleaseDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException('课程不存在');
    }
    const release = await this.prisma.release.findUnique({
      where: { id: dto.releaseId },
    });
    if (!release || release.courseId !== courseId) {
      throw new NotFoundException('发布版本不存在或不属于该课程');
    }
    const snapshot = release.snapshotData as unknown as SnapshotData;
    return this.prisma.$transaction(async (tx) => {
      // Page 随 Lesson 级联删除（schema onDelete: Cascade）
      await tx.lesson.deleteMany({ where: { courseId } });
      for (const [li, lesson] of (snapshot.lessons ?? []).entries()) {
        const created = await tx.lesson.create({
          data: { courseId, title: lesson.title, sortOrder: li },
        });
        for (const [pi, page] of (lesson.pages ?? []).entries()) {
          await tx.page.create({
            data: {
              lessonId: created.id,
              title: page.title,
              contentMd: page.contentMd ?? '',
              tags:
                page.tags == null
                  ? undefined
                  : (page.tags as Prisma.InputJsonValue),
              sortOrder: pi,
            },
          });
        }
      }
      await tx.course.update({
        where: { id: courseId },
        data: { currentReleaseId: release.id },
      });
      return { id: release.id, versionTag: release.versionTag };
    });
  }

  /** Course 的 Release 历史列表（不含 snapshotData，避免响应过大；标注激活版本） */
  async findAllByCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, currentReleaseId: true },
    });
    if (!course) {
      throw new NotFoundException('课程不存在');
    }
    const releases = await this.prisma.release.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        versionTag: true,
        revisionNotes: true,
        createdAt: true,
      },
    });
    return releases.map((r) => ({
      ...r,
      isActive: r.id === course.currentReleaseId,
    }));
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

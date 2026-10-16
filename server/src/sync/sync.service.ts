import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SyncState } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ExtCourse,
  ExtLesson,
  ExtPage,
  getExternalCourse,
  listExternalCourses,
} from './demo-fixtures';

/** 同步模式：structure=仅目录树；all=结构+内容（非破坏性） */
export type SyncMode = 'structure' | 'all';

export interface SyncSummary {
  created: number;
  staleMarked: number;
  unchanged: boolean;
}

export interface ExternalCourseStatus {
  externalId: string;
  title: string;
  localCourseId: string | null;
  /** not_synced=本地未导入；synced=与外部一致；has_updates=外部有变更 */
  status: 'not_synced' | 'synced' | 'has_updates';
}

/** 本地树节点（从 Prisma 载入的精简形状） */
interface LocalPage {
  id: string;
  title: string;
  contentMd: string;
  tags: string[];
  syncState: SyncState;
}
interface LocalLesson {
  id: string;
  title: string;
  syncState: SyncState;
  pages: LocalPage[];
}

/**
 * 外部源同步（§3.2.2 外部源接管模型）。
 * 非破坏性：绝不覆盖本地正文，过期内容标 STALE 交用户处置。
 * 外部源数据来自 demo-fixtures（Mock），真实 API 接入后仅替换数据源。
 */
@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  /** 外部课程列表 + 各自同步状态（供前端选择器） */
  async listExternalCourses(): Promise<ExternalCourseStatus[]> {
    const result: ExternalCourseStatus[] = [];
    for (const ext of listExternalCourses()) {
      const local = await this.prisma.course.findFirst({
        where: { externalId: ext.externalId },
        select: { id: true },
      });
      let status: ExternalCourseStatus['status'] = 'not_synced';
      if (local) {
        const tree = await this.loadLocalTree(local.id);
        const diff = this.countDiff(tree, ext);
        status = diff === 0 ? 'synced' : 'has_updates';
      }
      result.push({
        externalId: ext.externalId,
        title: ext.title,
        localCourseId: local?.id ?? null,
        status,
      });
    }
    return result;
  }

  /** 执行同步 */
  async sync(externalId: string, mode: SyncMode): Promise<SyncSummary> {
    const ext = getExternalCourse(externalId);
    if (!ext) {
      throw new NotFoundException('外部源课程不存在');
    }

    let local = await this.prisma.course.findFirst({
      where: { externalId },
      select: { id: true },
    });
    // 导入：本地无对应课程则新建（标题/描述/externalId 取自外部源）
    if (!local) {
      const created = await this.prisma.course.create({
        data: { title: ext.title, description: ext.description, externalId },
        select: { id: true },
      });
      local = created;
    }

    const tree = await this.loadLocalTree(local.id);
    return this.apply(ext, tree, mode, local.id);
  }

  // ---------- 内部实现 ----------

  private async loadLocalTree(courseId: string): Promise<LocalLesson[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId },
      orderBy: { sortOrder: 'asc' },
      include: { pages: { orderBy: { sortOrder: 'asc' } } },
    });
    return lessons.map((l) => ({
      id: l.id,
      title: l.title,
      syncState: l.syncState,
      pages: l.pages.map((p) => ({
        id: p.id,
        title: p.title,
        contentMd: p.contentMd,
        tags: (p.tags as string[] | null) ?? [],
        syncState: p.syncState,
      })),
    }));
  }

  /** 计算「若执行 all 同步会产生多少处变更」，用于状态展示（与 apply 判定口径一致） */
  private countDiff(tree: LocalLesson[], ext: ExtCourse): number {
    let n = 0;
    const matchedLessonIds = new Set<string>();
    const extLessonTitles = new Set(ext.lessons.map((l) => l.title));

    for (const el of ext.lessons) {
      const ll = this.matchLesson(tree, el.title);
      if (!ll) {
        n += 1 + el.pages.length; // 新增章 + 其页
        continue;
      }
      matchedLessonIds.add(ll.id);
      const extPageTitles = new Set(el.pages.map((p) => p.title));
      for (const ep of el.pages) {
        const lp = this.matchPage(ll.pages, ep.title);
        if (!lp) {
          n += 1; // 新增页
          continue;
        }
        if (lp.contentMd !== ep.contentMd) n += 2; // 本地 STALE + 新增新页
      }
      // 本地有、外部无的页 → STALE
      for (const lp of ll.pages) {
        if (lp.syncState === SyncState.SYNCED && !extPageTitles.has(lp.title)) n += 1;
      }
    }

    // 本地有、外部无的章 → STALE
    for (const ll of tree) {
      if (
        ll.syncState === SyncState.SYNCED &&
        !extLessonTitles.has(ll.title) &&
        !matchedLessonIds.has(ll.id)
      ) {
        n += 1;
      }
    }
    return n;
  }

  private matchLesson(tree: LocalLesson[], title: string): LocalLesson | undefined {
    // 优先匹配 SYNCED 同名章节；否则任意同名
    return (
      tree.find((l) => l.title === title && l.syncState === SyncState.SYNCED) ??
      tree.find((l) => l.title === title)
    );
  }

  private matchPage(pages: LocalPage[], title: string): LocalPage | undefined {
    return (
      pages.find((p) => p.title === title && p.syncState === SyncState.SYNCED) ??
      pages.find((p) => p.title === title)
    );
  }

  /** 标题冲突命名：T → T-new → T-new2 … */
  private resolveTitle(base: string, taken: Set<string>): string {
    if (!taken.has(base)) return base;
    let i = 1;
    let candidate = `${base}-new`;
    while (taken.has(candidate)) {
      i += 1;
      candidate = `${base}-new${i}`;
    }
    return candidate;
  }

  private async apply(
    ext: ExtCourse,
    tree: LocalLesson[],
    mode: SyncMode,
    courseId: string,
  ): Promise<SyncSummary> {
    let created = 0;
    let staleMarked = 0;

    const lessonTitles = new Set(tree.map((l) => l.title));
    const matchedLessonIds = new Set<string>();

    await this.prisma.$transaction(async (tx) => {
      for (const el of ext.lessons) {
        const ll = this.matchLesson(tree, el.title);

        if (!ll) {
          // 外部有、本地无 → 新增章（含页）
          const resolvedLessonTitle = this.resolveTitle(el.title, lessonTitles);
          lessonTitles.add(resolvedLessonTitle);
          const pageTitles = new Set<string>();
          const sortOrder = tree.length + created; // 追加排序（简化）
          const lesson = await tx.lesson.create({
            data: {
              courseId,
              title: resolvedLessonTitle,
              sortOrder,
              syncState: SyncState.SYNCED,
              pages: {
                create: el.pages.map((ep, pi) => {
                  const t = this.resolveTitle(ep.title, pageTitles);
                  pageTitles.add(t);
                  return {
                    title: t,
                    contentMd: mode === 'all' ? ep.contentMd : '',
                    tags: ep.tags,
                    sortOrder: pi,
                    syncState: SyncState.SYNCED,
                  };
                }),
              },
            },
          });
          created += 1 + el.pages.length;
          tree.push({
            id: lesson.id,
            title: resolvedLessonTitle,
            syncState: SyncState.SYNCED,
            pages: [],
          });
          matchedLessonIds.add(lesson.id);
          continue;
        }

        matchedLessonIds.add(ll.id);
        const pageTitles = new Set(ll.pages.map((p) => p.title));

        for (const ep of el.pages) {
          const lp = this.matchPage(ll.pages, ep.title);

          if (!lp) {
            // 外部有、本地无 → 新增页
            const t = this.resolveTitle(ep.title, pageTitles);
            pageTitles.add(t);
            await tx.page.create({
              data: {
                lessonId: ll.id,
                title: t,
                contentMd: mode === 'all' ? ep.contentMd : '',
                tags: ep.tags,
                sortOrder: ll.pages.length,
                syncState: SyncState.SYNCED,
              },
            });
            created += 1;
            continue;
          }

          // 两边都有：structure 模式不动正文；all 模式比对内容
          if (mode === 'all' && lp.contentMd !== ep.contentMd) {
            // 幂等保护：若已存在内容一致的 SYNCED 页，视为已同步，跳过
            const alreadySynced = ll.pages.some(
              (p) => p.syncState === SyncState.SYNCED && p.contentMd === ep.contentMd,
            );
            if (alreadySynced) continue;

            // 本地旧页标 STALE 并改名为 {title} (old)，腾出原标题给新同步页
            const oldTitle = this.resolveTitle(`${lp.title} (old)`, pageTitles);
            pageTitles.add(oldTitle);
            pageTitles.delete(lp.title);
            await tx.page.update({
              where: { id: lp.id },
              data: { syncState: SyncState.STALE, title: oldTitle },
            });
            staleMarked += 1;
            // 新同步页使用外部原标题，确保 countDiff 能匹配到
            const t = this.resolveTitle(ep.title, pageTitles);
            pageTitles.add(t);
            await tx.page.create({
              data: {
                lessonId: ll.id,
                title: t,
                contentMd: ep.contentMd,
                tags: ep.tags,
                sortOrder: ll.pages.length,
                syncState: SyncState.SYNCED,
              },
            });
            created += 1;
          } else if (lp.syncState === SyncState.STALE) {
            // 外部重新出现且内容一致 → 恢复 SYNCED
            await tx.page.update({
              where: { id: lp.id },
              data: { syncState: SyncState.SYNCED },
            });
          }
        }

        // 本地有、外部无的页 → STALE（仅处理原本 SYNCED 的，避免重复计数）
        const extPageTitles = new Set(el.pages.map((p) => p.title));
        for (const lp of ll.pages) {
          if (
            lp.syncState === SyncState.SYNCED &&
            !extPageTitles.has(lp.title) &&
            !pageTitles.has(lp.title)
          ) {
            await tx.page.update({
              where: { id: lp.id },
              data: { syncState: SyncState.STALE },
            });
            staleMarked += 1;
          }
        }
      }

      // 本地有、外部无的章 → STALE
      const extLessonTitles = new Set(ext.lessons.map((l) => l.title));
      for (const ll of tree) {
        if (
          ll.syncState === SyncState.SYNCED &&
          !extLessonTitles.has(ll.title) &&
          !matchedLessonIds.has(ll.id)
        ) {
          await tx.lesson.update({
            where: { id: ll.id },
            data: { syncState: SyncState.STALE },
          });
          staleMarked += 1;
        }
      }
    });

    return { created, staleMarked, unchanged: created === 0 && staleMarked === 0 };
  }
}

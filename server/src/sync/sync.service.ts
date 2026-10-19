import { Injectable, NotFoundException } from '@nestjs/common';
import { SyncState } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ExtCourse,
  ExtLesson,
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

/** 本地 Page（从 Prisma 载入的精简形状） */
interface LocalPage {
  id: string;
  title: string;
  contentMd: string;
  sectionTags: Record<string, string[]> | null;
  syncState: SyncState;
}

/**
 * 将外部一个 Lesson 的多个 Page 合并为本地一个 Page 的 contentMd：
 * Lesson.title 仅作为本地 Page 的标题（文件名），不写入内容；
 * 各外部 Page 以 `# {Page.title}` 为 H1 section 拼接。
 * 2026-10-16 修正：去掉开头 `# {Lesson.title}`，避免重复 H1 且 Lesson 名与内容 H1 混淆。
 */
function mergeLessonContent(lesson: ExtLesson): string {
  const parts: string[] = [];
  for (const p of lesson.pages) {
    parts.push(`# ${p.title}`, '', p.contentMd, '');
  }
  return parts.join('\n').trimEnd() + '\n';
}

/**
 * structure 模式（仅同步框架）：
 * Lesson.title 作为 Page 标题，内容仅列出各外部 Page.title 作为 H1（正文留空）。
 * 2026-10-16 修正：与 all 模式一致，Lesson.title 不入内容，Page.title 为 H1。
 */
function mergeLessonOutline(lesson: ExtLesson): string {
  const parts = lesson.pages.map((p) => `# ${p.title}`);
  return parts.length ? parts.join('\n\n') + '\n' : '';
}

/** heading 文本转 slug：小写、空格转 -、去特殊字符（用于 sectionTags 映射 key） */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // 保留 Unicode 字母/数字（含中文），仅去掉标点符号等特殊字符；
    // 之前用 \w 会把中文全部清空，导致多个中文 heading 生成相同 key（h2-）而碰撞。
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** 生成带层级前缀的 heading key：`h{n}-{slug}`（2026-10-16：避免 H1-H6 同名冲突） */
function headingKey(level: number, text: string): string {
  return `h${level}-${slugify(text)}`;
}

/** 提取 markdown 中所有 H1-H6 的 headingKey 集合（用于 sectionTags 迁移时过滤，2026-10-19 由 #{1,3} 放宽为 #{1,6}） */
function extractHeadingKeys(contentMd: string): Set<string> {
  const keys = new Set<string>();
  for (const line of contentMd.split('\n')) {
    const m = /^(#{1,6})\s+(.+)$/.exec(line);
    if (m) keys.add(headingKey(m[1].length, m[2].trim()));
  }
  return keys;
}

/**
 * 外部源同步（§3.2.2 外部源接管模型，2026-10-16 扁平化）。
 * 外部源 Course→Lesson→Page，本地 Course→Page（一个 Lesson 合并为一个 Page）。
 * 非破坏性：绝不覆盖本地正文，过期内容标 STALE 交用户处置。
 * 方案 C：同步新建 Page 时按 heading slug 迁移旧 Page 的 sectionTags。
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
        const pages = await this.loadLocalPages(local.id);
        const diff = this.countDiff(pages, ext);
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
    if (!local) {
      const created = await this.prisma.course.create({
        data: { title: ext.title, description: ext.description, externalId },
        select: { id: true },
      });
      local = created;
    }

    const pages = await this.loadLocalPages(local.id);
    return this.apply(ext, pages, mode, local.id);
  }

  // ---------- 内部实现 ----------

  private async loadLocalPages(courseId: string): Promise<LocalPage[]> {
    const pages = await this.prisma.page.findMany({
      where: { courseId },
      orderBy: { sortOrder: 'asc' },
    });
    return pages.map((p) => ({
      id: p.id,
      title: p.title,
      contentMd: p.contentMd,
      sectionTags: p.sectionTags as Record<string, string[]> | null,
      syncState: p.syncState,
    }));
  }

  /** 计算「若执行 all 同步会产生多少处变更」，用于状态展示 */
  private countDiff(pages: LocalPage[], ext: ExtCourse): number {
    let n = 0;
    const matchedIds = new Set<string>();
    const extTitles = new Set(ext.lessons.map((l) => l.title));

    for (const el of ext.lessons) {
      const lp = this.matchPage(pages, el.title);
      if (!lp) {
        n += 1; // 新增合并 Page
        continue;
      }
      matchedIds.add(lp.id);
      const merged = mergeLessonContent(el);
      if (lp.contentMd !== merged) n += 2; // 本地 STALE + 新增新页
    }

    // 本地有、外部无 → STALE
    for (const lp of pages) {
      if (
        lp.syncState === SyncState.SYNCED &&
        !extTitles.has(lp.title) &&
        !matchedIds.has(lp.id)
      ) {
        n += 1;
      }
    }
    return n;
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

  /**
   * 方案 C：从旧 Page 的 sectionTags 中，仅保留新 contentMd 中存在的 headingKey 对应的 tags。
   * （2026-10-16：headingKey 带层级前缀 h{n}-slug，覆盖 H1-H6；页面级 tags 已移除）
   */
  private migrateTags(
    oldPage: LocalPage,
    newContentMd: string,
  ): { sectionTags: Record<string, string[]> | undefined } {
    const validKeys = extractHeadingKeys(newContentMd);
    const sectionTags: Record<string, string[]> = {};
    if (oldPage.sectionTags) {
      for (const [key, tags] of Object.entries(oldPage.sectionTags)) {
        if (validKeys.has(key)) sectionTags[key] = tags;
      }
    }
    return {
      sectionTags: Object.keys(sectionTags).length > 0 ? sectionTags : undefined,
    };
  }

  private async apply(
    ext: ExtCourse,
    pages: LocalPage[],
    mode: SyncMode,
    courseId: string,
  ): Promise<SyncSummary> {
    let created = 0;
    let staleMarked = 0;

    const pageTitles = new Set(pages.map((p) => p.title));
    const matchedIds = new Set<string>();

    await this.prisma.$transaction(async (tx) => {
      for (const el of ext.lessons) {
        const lp = this.matchPage(pages, el.title);

        if (!lp) {
          // 外部有、本地无 → 新增合并 Page
          const resolvedTitle = this.resolveTitle(el.title, pageTitles);
          pageTitles.add(resolvedTitle);
          const sortOrder = pages.length + created;
          await tx.page.create({
            data: {
              courseId,
              title: resolvedTitle,
              contentMd: mode === 'all' ? mergeLessonContent(el) : mergeLessonOutline(el),
              sortOrder,
              syncState: SyncState.SYNCED,
            },
          });
          created += 1;
          continue;
        }

        matchedIds.add(lp.id);
        const merged = mergeLessonContent(el);

        if (mode === 'all' && lp.contentMd !== merged) {
          // 幂等保护：若已存在内容一致的 SYNCED 页，跳过
          const alreadySynced = pages.some(
            (p) => p.syncState === SyncState.SYNCED && p.contentMd === merged,
          );
          if (alreadySynced) continue;

          // 本地旧页标 STALE + 改名 {title} (old)
          const oldTitle = this.resolveTitle(`${lp.title} (old)`, pageTitles);
          pageTitles.add(oldTitle);
          pageTitles.delete(lp.title);
          await tx.page.update({
            where: { id: lp.id },
            data: { syncState: SyncState.STALE, title: oldTitle },
          });
          staleMarked += 1;

          // 新建同步页，按方案 C 迁移 sectionTags（仅保留新 contentMd 中存在的 headingKey）
          const newTitle = this.resolveTitle(el.title, pageTitles);
          pageTitles.add(newTitle);
          const { sectionTags } = this.migrateTags(lp, merged);
          await tx.page.create({
            data: {
              courseId,
              title: newTitle,
              contentMd: merged,
              sectionTags,
              sortOrder: pages.length,
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

      // 本地有、外部无的 Page → STALE
      const extTitles = new Set(ext.lessons.map((l) => l.title));
      for (const lp of pages) {
        if (
          lp.syncState === SyncState.SYNCED &&
          !extTitles.has(lp.title) &&
          !matchedIds.has(lp.id)
        ) {
          await tx.page.update({
            where: { id: lp.id },
            data: { syncState: SyncState.STALE },
          });
          staleMarked += 1;
        }
      }
    });

    return { created, staleMarked, unchanged: created === 0 && staleMarked === 0 };
  }
}

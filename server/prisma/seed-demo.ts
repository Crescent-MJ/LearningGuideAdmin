/**
 * 演示种子数据（仅供本地手动测试，不属于业务 Seed）
 *
 * 说明：
 * - 课程内容来自 src/sync/demo-fixtures.ts 的 BASELINE_COURSES（与外部源同步演示共享同一基线）
 * - 2026-10-16 扁平化：原 Lesson → Page 合并。每个 Lesson 合并为一个 Page，
 *   contentMd = 各原 Page 以 `# {Page.title}` 为 H1 拼接（Lesson.title 不入内容）
 * - 2026-10-16 移除页面级 tags，仅保留 sectionTags（此 seed 不灌 sectionTags）
 * - externalId 关联外部源（Population Growth / Calculus Fundamentals）；
 *   Classical Mechanics / Linear Algebra 为本地独有（externalId=null）
 * - 幂等：按课程标题判重，已存在则跳过
 * - 运行方式：npm run seed:demo（在 server/ 目录）
 */
import { PrismaClient } from '@prisma/client';
import { BASELINE_COURSES, type ExtLesson } from '../src/sync/demo-fixtures';

const prisma = new PrismaClient();

/** 与 sync.service.ts 保持一致的合并逻辑：Lesson.title 仅作 Page 标题，不入内容 */
function mergeLessonContent(lesson: ExtLesson): string {
  const parts: string[] = [];
  for (const p of lesson.pages) {
    parts.push(`# ${p.title}`, '', p.contentMd, '');
  }
  return parts.join('\n').trimEnd() + '\n';
}

async function main() {
  for (const course of BASELINE_COURSES) {
    const existing = await prisma.course.findFirst({
      where: { title: course.title },
      select: { id: true },
    });
    if (existing) {
      console.log(`跳过（已存在）：${course.title}`);
      continue;
    }
    await prisma.course.create({
      data: {
        title: course.title,
        description: course.description,
        externalId: course.externalId,
        pages: {
          create: course.lessons.map((lesson, li) => ({
            title: lesson.title,
            contentMd: mergeLessonContent(lesson),
            sortOrder: li,
          })),
        },
      },
    });
    console.log(`已创建：${course.title}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

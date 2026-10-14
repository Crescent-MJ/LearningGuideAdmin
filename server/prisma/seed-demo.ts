/**
 * 演示种子数据（仅供本地手动测试，不属于业务 Seed）
 *
 * 说明：
 * - 课程内容来自 src/sync/demo-fixtures.ts 的 BASELINE_COURSES（与外部源同步演示共享同一基线）
 * - externalId 关联外部源（Population Growth / Calculus Fundamentals）；
 *   Classical Mechanics / Linear Algebra 为本地独有（externalId=null，不出现在同步选择器）
 * - 幂等：按课程标题判重，已存在则回填缺失的 externalId，不覆盖你手动编辑过的内容
 * - 运行方式：npm run seed:demo（在 server/ 目录）
 */
import { PrismaClient } from '@prisma/client';
import { BASELINE_COURSES } from '../src/sync/demo-fixtures';

const prisma = new PrismaClient();

async function main() {
  for (const course of BASELINE_COURSES) {
    const existing = await prisma.course.findFirst({
      where: { title: course.title },
      select: { id: true, externalId: true },
    });
    if (existing) {
      // 回填缺失的 externalId（旧库升级），但不覆盖已有内容
      if (course.externalId && !existing.externalId) {
        await prisma.course.update({
          where: { id: existing.id },
          data: { externalId: course.externalId },
        });
        console.log(`已回填 externalId：${course.title}`);
      } else {
        console.log(`跳过（已存在）：${course.title}`);
      }
      continue;
    }
    await prisma.course.create({
      data: {
        title: course.title,
        description: course.description,
        externalId: course.externalId,
        lessons: {
          create: course.lessons.map((lesson, li) => ({
            title: lesson.title,
            sortOrder: li,
            pages: {
              create: lesson.pages.map((page, pi) => ({
                title: page.title,
                contentMd: page.contentMd,
                tags: page.tags,
                sortOrder: pi,
              })),
            },
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

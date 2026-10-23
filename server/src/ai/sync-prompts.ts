/**
 * 默认 Prompt / Welcome 同步脚本（2026-10-23）
 *
 * 把 `src/ai/prompts/`（lecture.md、socratic.md、welcome.yaml）写入
 * PromptTemplate 的默认行（lecture-default / socratic-default）。
 * 仅更新默认模板；课程级 CourseAiConfig 覆盖值不受影响。
 *
 * 运行：npm run prompts:sync
 */
import { PrismaClient } from '@prisma/client';
import { promptTemplateSeeds } from './prompt-defaults';

export async function syncDefaultPrompts(prisma: PrismaClient) {
  const rows: Array<{ id: string; mode: string }> = [];
  for (const seed of promptTemplateSeeds()) {
    const saved = await prisma.promptTemplate.upsert({
      where: { id: seed.id },
      update: {
        mode: seed.mode,
        systemPrompt: seed.systemPrompt,
        welcomeMsg: seed.welcomeMsg,
        isDefault: seed.isDefault,
      },
      create: seed,
      select: { id: true, mode: true },
    });
    rows.push(saved);
  }
  return rows;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await syncDefaultPrompts(prisma);
    for (const row of rows) {
      console.log(`[prompts:sync] ${row.id} (${row.mode}) 已同步`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

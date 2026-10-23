/**
 * 初始种子数据脚本（依据开发文档 §2.1）
 *
 * 说明：
 * - 使用 upsert 保证幂等：重复执行不会报错、不会重复插入
 * - 运行方式：npx prisma db seed（package.json 已配置 prisma.seed）
 * - 默认 Prompt / Welcome 不再硬编码在本文件：见 `src/ai/prompts/`
 *   （lecture.md、socratic.md、welcome.yaml），改动后运行 `npm run prompts:sync`。
 */
import { PrismaClient } from '@prisma/client';
import { promptTemplateSeeds } from '../src/ai/prompt-defaults';

const prisma = new PrismaClient();

async function main() {
  // 1. 默认提示词模板（LECTURE / SOCRATIC，来自 src/ai/prompts/ 文件）
  for (const seed of promptTemplateSeeds()) {
    await prisma.promptTemplate.upsert({
      where: { id: seed.id },
      update: {
        mode: seed.mode,
        systemPrompt: seed.systemPrompt,
        welcomeMsg: seed.welcomeMsg,
        isDefault: seed.isDefault,
      },
      create: seed,
    });
  }

  // 2. 预设 Tag 词库（§3.3.3 方案 B：4 个语义标签带预设色，其余由用户输入自动沉淀）
  const presetTags = [
    { name: 'Core Knowledge', color: 'blue' },
    { name: 'Teaching Guidance', color: 'green' },
    { name: 'Misconception', color: 'orange' },
    { name: 'Assessment', color: 'purple' },
  ];
  for (const t of presetTags) {
    await prisma.tag.upsert({
      where: { name: t.name },
      update: { color: t.color },
      create: t,
    });
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

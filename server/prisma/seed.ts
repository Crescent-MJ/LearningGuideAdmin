/**
 * 初始种子数据脚本（依据开发文档 §2.1）
 *
 * 说明：
 * - 使用 upsert 保证幂等：重复执行不会报错、不会重复插入
 * - 运行方式：npx prisma db seed（package.json 已配置 prisma.seed）
 * - 本阶段（Phase 1）由主智能体在 PostgreSQL 就绪后执行
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. 讲师型（LECTURE）默认提示词模板
  await prisma.promptTemplate.upsert({
    where: { id: 'lecture-default' },
    update: {
      mode: 'LECTURE',
      systemPrompt:
        '你是一名讲师型助手，擅长用结构化方式解释内容。请基于提供的课程资料，给出清晰、有条理的讲解。',
      welcomeMsg:
        '你好！我是你的学习助手。请选择一个课程，我将根据课程内容为你讲解。',
      isDefault: true,
    },
    create: {
      id: 'lecture-default',
      mode: 'LECTURE',
      systemPrompt:
        '你是一名讲师型助手，擅长用结构化方式解释内容。请基于提供的课程资料，给出清晰、有条理的讲解。',
      welcomeMsg:
        '你好！我是你的学习助手。请选择一个课程，我将根据课程内容为你讲解。',
      isDefault: true,
    },
  });

  // 2. 苏格拉底式（SOCRATIC）默认提示词模板
  await prisma.promptTemplate.upsert({
    where: { id: 'socratic-default' },
    update: {
      mode: 'SOCRATIC',
      systemPrompt:
        '你是一名苏格拉底式引导助手。不要直接给出完整答案，而要通过提问帮助用户自己得出结论。将答案拆解成一系列反问和引导性问题，逐步启发用户。',
      welcomeMsg: '你好！让我通过提问来帮助你深入学习。请选择一个课程开始。',
      isDefault: true,
    },
    create: {
      id: 'socratic-default',
      mode: 'SOCRATIC',
      systemPrompt:
        '你是一名苏格拉底式引导助手。不要直接给出完整答案，而要通过提问帮助用户自己得出结论。将答案拆解成一系列反问和引导性问题，逐步启发用户。',
      welcomeMsg: '你好！让我通过提问来帮助你深入学习。请选择一个课程开始。',
      isDefault: true,
    },
  });

  // 3. 预设 Tag 词库（§3.3.3 方案 B：4 个语义标签带预设色，其余由用户输入自动沉淀）
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

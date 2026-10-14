import { Injectable } from '@nestjs/common';

/**
 * 外部同步 Mock（开发文档 §5.1.5、§7 Phase 3 第 5 项）。
 * 前期实现 Mock 版本，返回假数据模拟外部 API 响应；
 * 真实外部同步源 API 格式待 §12 事项 #4 确认后替换本实现。
 */
@Injectable()
export class SyncService {
  /** 仅同步目录树结构（不覆盖内容） */
  syncStructure() {
    return {
      mock: true,
      externalId: 'ext-demo-001',
      title: '示例外部课程（Mock）',
      lessons: [
        {
          externalId: 'ext-lesson-001',
          title: '第一章：基础概念',
          sortOrder: 0,
          pages: [
            { externalId: 'ext-page-001', title: '1.1 什么是知识图谱', sortOrder: 0 },
            { externalId: 'ext-page-002', title: '1.2 核心术语', sortOrder: 1 },
          ],
        },
        {
          externalId: 'ext-lesson-002',
          title: '第二章：进阶应用',
          sortOrder: 1,
          pages: [
            { externalId: 'ext-page-003', title: '2.1 实践案例', sortOrder: 0 },
          ],
        },
      ],
    };
  }

  /** 全量同步结构和内容 */
  syncAll() {
    return {
      mock: true,
      externalId: 'ext-demo-001',
      title: '示例外部课程（Mock）',
      lessons: [
        {
          externalId: 'ext-lesson-001',
          title: '第一章：基础概念',
          sortOrder: 0,
          pages: [
            {
              externalId: 'ext-page-001',
              title: '1.1 什么是知识图谱',
              sortOrder: 0,
              contentMd:
                '# 1.1 什么是知识图谱\n\n知识图谱以 **实体-关系-实体** 三元组组织知识。\n\n行内公式示例：$E = mc^2$',
              tags: ['Core Knowledge'],
            },
            {
              externalId: 'ext-page-002',
              title: '1.2 核心术语',
              sortOrder: 1,
              contentMd: '# 1.2 核心术语\n\n- 实体（Entity）\n- 关系（Relation）\n- 属性（Attribute）',
              tags: ['Teaching Guidance'],
            },
          ],
        },
      ],
    };
  }
}

# Learning Guide BackOffice

结构化课程知识库管理系统：**Knowledge System**（Course → Lesson → Page 三级知识树、
Markdown 编辑含 LaTeX、发布快照与历史版本、外部同步）+ **AI Tutor**（Lecture /
Socratic 双模式流式对话、PromptTemplate 与课程级 AI 配置）。

## 开发文档

- [Learning Guide BackOffice - Agent 开发文档 v1.0](docs/Learning_Guide_BackOffice_Agent_Development_Document.md) — 开发基准。系统概述与架构原则、Prisma Schema、知识库模块、AI Tutor 模块、API 接口规范、前端架构、开发步骤（Phase 1-7）、安全规范、待确认事项。

## 技术栈

| 层 | 选择 |
|---|---|
| 后端 | Node.js + TypeScript + NestJS（2026-10-14 拍板） |
| 数据库 | PostgreSQL + Prisma ORM |
| 前端 | React + TypeScript + Vite + Ant Design 5.x |
| 状态管理 | Zustand（全局状态）+ React Context（少量轻量配置） |
| 编辑器 | md-editor-v3（KaTeX 渲染） |

## 目录结构

```
docs/        开发文档
agents/      双智能体定义（Dev / Review）
server/      后端（NestJS + Prisma，Phase 1 已搭建）
client/      前端（React + Vite + Ant Design 5.x，Phase 1 已搭建）
```

## 协作工作流

- **用户裁决**：所有方案性建议经用户同意后执行，不得擅自变更已拍板决策
- **变更同步**：增删改查模块 / 接口 / 表结构变更，先改设计文档再实现（单一事实来源）
- **双智能体**：[Dev Agent](agents/dev-agent.md)（开发）+ [Review Agent](agents/review-agent.md)（测试与代码审查）
- **审查门禁**：每次开发变更必须经 Review Agent 独立审查（新上下文），APPROVE 才算完成
- **Git**：`feature/<task>` 分支日常开发；大迭代（Phase 完成/阶段性交付）推送分支并发 PR 到 main，合并条件 = 审查通过（大迭代完整定义见 [.trae/rules/project_rules.md](.trae/rules/project_rules.md)）
- **注册智能体**：将 agents/ 下两个文件的「系统提示词」段落粘贴到 Trae 智能体创建界面即可；项目协作规则见 [.trae/rules/project_rules.md](.trae/rules/project_rules.md)

## 开发

### 后端（server/）

```bash
cd server
npm install
npx prisma migrate dev   # 应用迁移
npx prisma db seed       # 种子数据（幂等）
npm run start:dev        # http://localhost:3000
```

### 前端（client/）

```bash
cd client
npm install
npm run dev              # http://localhost:5173
```

### 数据库

本机 PostgreSQL 16（Windows 服务名 `postgresql-x64-16`），账号/密码均为 admin，
库名 learning_guide_db；连接串存于 `server/.env`（不入库），模板见 `server/.env.example`。
表结构变更只走 Prisma Migrate，禁止手改数据库。

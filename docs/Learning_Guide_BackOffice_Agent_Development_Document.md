# Learning Guide BackOffice - Agent 开发文档

## 版本信息

| 项目 | 内容 |
|------|------|
| 项目名称 | Learning Guide BackOffice |
| 文档版本 | v1.0 |
| 后端技术栈 | Node.js + TypeScript（NestJS，2026-10-14 拍板） |
| 数据库 | PostgreSQL + Prisma ORM |
| 前端技术栈 | React + TypeScript + Vite |
| UI 框架 | Ant Design 5.x |
| Markdown 编辑器 | md-editor-v3（需支持 LaTeX/KaTeX） |
| 状态管理 | Zustand（全局状态）+ React Context（少量轻量配置，2026-10-14 拍板） |

---

## 1. 系统概述

### 1.1 系统定位

**Learning Guide BackOffice** 是一个结构化课程知识库管理系统，核心功能包括：

- **Knowledge System（知识库）**：管理课程结构（Course -> Lesson -> Page 三级树形），支持 Markdown 编辑（含 LaTeX 公式）、文件导入转 Markdown、版本发布与历史版本查看。
- **AI Tutor（AI 辅导）**：基于知识库内容，提供 Lecture 模式和 Socratic 模式的 AI 对话交互，支持 System Prompt 和 Welcome Message 自定义配置。

### 1.2 核心对象

| 对象 | 说明 |
|------|------|
| Course | 课程，一级目录节点 |
| Lesson | 章节，二级目录节点，属于某个 Course |
| Page | 页面/内容，三级叶子节点，存储 Markdown 内容 |
| Release | 发布快照，记录某个 Course 在某一时刻的完整内容 |
| PromptTemplate | AI 提示词模板，预设 Lecture 和 Socratic 两种模式 |
| CourseAiConfig | 课程专属 AI 配置，关联 Course 和 PromptTemplate |
| AiChatSession | AI 对话记录 |

### 1.3 架构原则（不可协商）

1. **高可扩展性**：模块必须解耦。AI 模块不能使用硬编码的特定 LLM 厂商，必须使用**策略模式（Strategy Pattern）**或适配器模式，方便后续无缝接入任何第三方 API。
2. **高安全性**：所有 API 密钥必须通过环境变量注入，绝不允许出现在前端代码中。AI 请求必须经过后端代理（Proxy），**严禁前端直接调用 LLM API**。
3. **高可维护性**：代码必须包含详细注释。数据库表结构变更必须通过 Migration（如 Prisma Migrate）管理。
4. **可扩展性设计**：后端代码中预留"切片（Chunking）"和"向量检索（Vector Search）"的接口钩子（Hook），未来可直接平滑升级。

---

## 2. 数据库模型设计（Prisma Schema）

> 注意：以下 Schema 为最终版，Agent 开发前必须严格按此创建并执行 `prisma migrate dev`。
> 实装锁定 Prisma 6.x（v7 起移除 `url=env()` 写法，2026-10-14 拍板暂锁 6.x；双向关系已按 Prisma 要求补齐）。

```prisma
// ==========================================
// 核心实体
// ==========================================

model User {
  id          String    @id @default(uuid())
  email       String    @unique
  name        String?
  courses     Course[]
}

// 第一层：课程 (Course)
model Course {
  id              String    @id @default(uuid())
  title           String
  description     String?
  externalId      String?   // 对应外部同步源的 ID
  structureJson   Json?     // 存储树形目录的原始结构，用于快速渲染
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  lessons         Lesson[]
  releases        Release[]
  aiConfig        CourseAiConfig?
  // 反向关联（Prisma 双向关系要求，2026-10-14 补齐）：users 为隐式多对多，
  // migrate 时生成联接表 _CourseToUser（2026-10-14 拍板方案 a）
  users           User[]
  aiChatSessions  AiChatSession[]
}

// 第二层：章节 (Lesson)
model Lesson {
  id          String    @id @default(uuid())
  courseId    String
  course      Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title       String
  duration    Int?      // 视频/内容预计时长（秒）
  sortOrder   Int       // 排序权重
  pages       Page[]

  @@index([courseId, sortOrder])
}

// 第三层：页面/内容 (Page)
model Page {
  id          String    @id @default(uuid())
  lessonId    String
  lesson      Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  title       String
  contentMd   String    @db.Text  // 核心 Markdown 内容，支持 LaTeX
  tags        Json?     // 标签数组，如 ["Core Knowledge", "Teaching Guidance"]
  sortOrder   Int

  @@index([lessonId, sortOrder])
}

// ==========================================
// 发布与版本控制
// ==========================================

model Release {
  id              String    @id @default(uuid())
  courseId        String
  course          Course    @relation(fields: [courseId], references: [id])
  versionTag      String    // 版本号，格式: "CourseName_YYYYMMDDHHmmss"
  revisionNotes   String    @db.Text  // 本次修订的备注
  snapshotData    Json      // 完整内容快照: { lessons: [{ id, title, pages: [{id, title, contentMd, tags}] }] }
  createdAt       DateTime  @default(now())

  @@index([courseId, createdAt])
}

// ==========================================
// AI Tutor 配置模块
// ==========================================

// AI 提示词模板库（预设两套模式）
model PromptTemplate {
  id              String    @id @default(uuid())
  mode            String    // 枚举: "LECTURE" | "SOCRATIC"
  systemPrompt    String    @db.Text  // 系统提示词
  welcomeMsg      String    @db.Text  // 欢迎语
  isDefault       Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // 反向关联：被哪些课程引用（CourseAiConfig 双外键需 Prisma 多关系命名消歧，2026-10-14 补齐）
  lectureConfigs  CourseAiConfig[] @relation("LectureTemplate")
  socraticConfigs CourseAiConfig[] @relation("SocraticTemplate")
}

// 课程专属的 AI 配置
model CourseAiConfig {
  id                  String    @id @default(uuid())
  courseId            String    @unique
  course              Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)

  // 引用基础模板
  lectureModeId       String?
  socraticModeId      String?
  lectureTemplate     PromptTemplate? @relation("LectureTemplate", fields: [lectureModeId], references: [id])
  socraticTemplate    PromptTemplate? @relation("SocraticTemplate", fields: [socraticModeId], references: [id])

  // 覆盖自定义的提示词（可选，优先级高于模板）
  customSystemPrompt  String? @db.Text
  customWelcomeMsg    String? @db.Text

  // LLM 配置
  llmProvider         String    // 如: "openai", "deepseek", "claude"
  llmModel            String    // 如: "gpt-4o", "gpt-3.5-turbo"
  llmBaseUrl          String?   // 可选的自定义 Base URL
  apiKey              String?   // 加密存储

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
}

// AI 对话记录（后台调试用）
model AiChatSession {
  id          String    @id @default(uuid())
  courseId    String
  course      Course    @relation(fields: [courseId], references: [id])
  messages    Json      // 聊天记录: [{role: 'user'|'ai', content: string, createdAt: ISOString}]
  mode        String    // 当前对话使用的模式: "LECTURE" | "SOCRATIC"
  createdAt   DateTime  @default(now())

  @@index([courseId, createdAt])
}
```

### 2.1 初始种子数据（Seed Data）

初始化数据库后，必须插入以下默认数据：

**PromptTemplate 默认数据：**

| id | mode | systemPrompt | welcomeMsg | isDefault |
|----|------|-------------|------------|-----------|
| lecture-default | LECTURE | "你是一名讲师型助手，擅长用结构化方式解释内容。请基于提供的课程资料，给出清晰、有条理的讲解。" | "你好！我是你的学习助手。请选择一个课程，我将根据课程内容为你讲解。" | true |
| socratic-default | SOCRATIC | "你是一名苏格拉底式引导助手。不要直接给出完整答案，而要通过提问帮助用户自己得出结论。将答案拆解成一系列反问和引导性问题，逐步启发用户。" | "你好！让我通过提问来帮助你深入学习。请选择一个课程开始。" | true |

---

## 3. 模块 A：Knowledge System（知识库管理）

### 3.1 功能概述

Knowledge System 是系统的主界面，采用左右两栏布局：

- **左侧**：课程目录树（Course -> Lesson -> Page），搜索框，Sync 按钮
- **右侧**：Tab 页签，包含 "Knowledge Pages"（编辑器）和 "Publish"（版本发布）

### 3.2 左侧边栏（Sidebar）

#### 3.2.1 树形导航组件

- 实现三级嵌套树形组件：Course（一级）-> Lesson（二级）-> Page（三级）
- Course 节点可展开/收起
- Page 节点可点击选中，选中后右侧编辑器加载该 Page 的 Markdown 内容
- 支持搜索框，按页面标题过滤树节点

#### 3.2.2 Sync 同步按钮

底部两个按钮：

| 按钮 | 接口 | 行为 |
|------|------|------|
| Sync Structure Only | POST /api/sync/structure | 仅更新目录树结构（Course/Lesson/Page 的标题和排序），不覆盖 contentMd |
| Sync Structure & Course | POST /api/sync/all | 全量同步。调用外部接口拉取最新的课程数据，强制刷新本地数据库中的内容（需弹框警告用户会丢失未保存的修改） |

> **注意**：前期可使用 Mock 数据模拟外部 API 响应。

### 3.3 右侧内容区 - Tab 1: Knowledge Pages（编辑器）

#### 3.3.1 页面布局

- 顶部显示当前选中 Page 的标题（可编辑）
- 右上角显示 Tags（标签），支持添加/删除
- 主体区域为 Markdown 编辑器

#### 3.3.2 Markdown 编辑器要求

- 使用 `md-editor-v3` 组件
- **必须开启 KaTeX 渲染**，支持 LaTeX 公式（如 `$E=mc^2$`）
- 支持代码高亮
- 支持实时预览
- 支持 Markdown 表格（对应设计图中的 Q&A Table）
- 内容编辑后自动保存到本地状态（防抖保存，建议 500ms 防抖）
- 后续可扩展插件机制

#### 3.3.3 Tags 管理

- Tags 存储为 JSON 数组格式：`["Core Knowledge", "Teaching Guidance"]`
- 支持动态添加和删除
- 显示为标签样式（Ant Design Tag 组件）

### 3.4 右侧内容区 - Tab 2: Publish（版本发布）

#### 3.4.1 发布列表

表格展示所有 Course 的发布状态，列包括：

| 列名 | 说明 |
|------|------|
| Course Name | 课程名称 |
| Revision Notes | 最近一次发布的备注（若无则显示 "No revision notes provided"） |
| Current Version | 版本号，格式 `CourseName_YYYYMMDDHHmmss`，可点击 |
| Action | Publish 按钮 |

#### 3.4.2 Current Version 交互

- 点击版本号，弹出 Dropdown/Modal 展示该 Course 的历史版本列表
- 每个历史版本显示：版本号、发布时间、Revision Notes
- 暂不需要回滚功能，只需查看

#### 3.4.3 Publish 流程

1. 用户点击某个 Course 的 "Publish" 按钮
2. 弹出 Modal，要求填写 Revision Notes（必填）
3. 确认后，前端调用 `POST /api/courses/:id/release` 接口，传入 revisionNotes
4. 后端执行以下逻辑：
   - 读取当前 Course 下所有 Lessons 及其对应的 Pages
   - 生成版本号：`CourseTitle_YYYYMMDDHHmmss`
   - 将所有当前内容聚合为 JSON 快照
   - 写入 Release 表
5. 前端刷新 Publish 列表

> **重要**：Publish 动作是发布整个 Course 下所有页面的快照，不是单个 Page。

---

## 4. 模块 B：AI Tutor（AI 辅导）

### 4.1 功能概述

AI Tutor 是一个独立的功能板块，提供 AI 对话能力。其知识库来源于 Knowledge System 中选中的 Course。

页面布局：
- **左侧**：配置面板（Course 选择、System Prompt、Welcome Message、LLM Model 配置、Reset/Save 按钮）
- **右侧**：测试对话窗口（模式切换、New Chat、消息列表、输入框）

### 4.2 左侧配置面板

#### 4.2.1 Change Course

- 下拉框，列出所有 Course
- 切换 Course 后，加载该 Course 的 AI 配置（PromptTemplate + 自定义配置）

#### 4.2.2 System Prompt / Welcome Message

- 文本域（Textarea），支持编辑当前课程使用的 AI 人设（System Prompt）和欢迎语
- 编辑后需点击 "Save" 才能持久化

#### 4.2.3 LLM Model 配置

- 下拉框，切换模型（如 gpt-4o、gpt-3.5-turbo 等）
- 后端需提供模型列表接口，支持扩展

#### 4.2.4 Reset 按钮

- 点击后，清空当前课程的自定义输入
- 恢复为对应模式的默认 PromptTemplate（从 PromptTemplate 表加载 isDefault=true 的记录）

#### 4.2.5 Save 按钮

- 保存当前修改到 CourseAiConfig 表
- 包括：lectureModeId、socraticModeId、customSystemPrompt、customWelcomeMsg、llmProvider、llmModel 等

### 4.3 右侧对话面板

#### 4.3.1 模式切换

- 顶部按钮切换 `Lecture` 和 `Socratic` 模式
- **关键逻辑**：切换模式时，左侧的 System Prompt 输入框应自动更新为对应模式的提示词（优先使用自定义配置，无自定义则使用模板默认值）

#### 4.3.2 New Chat

- 清空右侧对话框的当前聊天记录
- 向后端发送请求创建新的 AiChatSession
- 显示 Welcome Message 作为 AI 的第一条消息

#### 4.3.3 对话流程

1. 用户在底部输入框输入消息，点击发送
2. 前端调用 `POST /api/ai/chat-stream` 接口，传入：
   - courseId（当前选中的课程）
   - message（用户输入）
   - mode（当前模式：lecture 或 socratic）
3. 后端执行以下逻辑：
   - 根据 courseId 从数据库提取该 Course 下所有 Page 的 Markdown 内容
   - 组装 Prompt：`System Prompt + [CONTEXT: 课程资料] + 用户消息`
   - 调用 LLM API（流式）
   - 将流式响应转发给前端
   - 异步记录对话到 AiChatSession
4. 前端以流式（SSE 或 fetch stream）方式逐块渲染 AI 回复

#### 4.3.4 对话消息格式

每条消息包含：

| 字段 | 类型 | 说明 |
|------|------|------|
| role | string | "user" 或 "ai" |
| content | string | 消息内容（Markdown 格式） |
| createdAt | string | ISO 8601 时间戳 |

### 4.4 AI Gateway Proxy（后端安全核心）

#### 4.4.1 接口定义

**POST /api/ai/chat-stream**

请求体：

```json
{
  "courseId": "string",
  "message": "string",
  "mode": "LECTURE | SOCRATIC"
}
```

响应：Stream（Server-Sent Events 格式）

#### 4.4.2 核心处理逻辑

1. **参数校验**：验证 courseId、message、mode 必填
2. **加载配置**：根据 courseId 获取 CourseAiConfig，解析 LLM 提供商和模型
3. **加载知识库上下文**：根据 courseId 查询所有 Lesson -> Page，聚合 Markdown 内容
4. **组装 Prompt**：
   - 获取对应模式的 PromptTemplate（优先自定义，其次默认）
   - 拼接：`System Prompt` + `[CONTEXT_START]` + 课程资料 + `[CONTEXT_END]` + 用户消息
   - Socratic 模式额外注入引导指令：`"你是一个苏格拉底式的引导者。永远不要直接给出最终答案。将答案拆解成一系列反问和引导性问题，逐步启发用户自己得出结论。"`
5. **代理转发**：使用对应 LLM 提供商的 Node.js SDK 调用实际 API（流式）
6. **流式返回**：将 LLM 的流式 Chunk 以 SSE 格式转发给前端
7. **日志记录**：异步将本次对话写入 AiChatSession 表

#### 4.4.3 错误处理

- API 调用失败时，返回错误信息给前端并显示
- 支持重试机制（建议最多重试 2 次）
- 简单限流：同一 courseId 每分钟最多 10 次请求

---

## 5. API 接口规范

### 5.1 知识库相关接口

#### 5.1.1 课程 CRUD

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/courses | 获取所有 Course 列表 |
| GET | /api/courses/:id | 获取单个 Course（含下属 Lessons 和 Pages） |
| POST | /api/courses | 创建 Course |
| PUT | /api/courses/:id | 更新 Course |
| DELETE | /api/courses/:id | 删除 Course（级联删除 Lesson 和 Page） |

#### 5.1.2 章节 CRUD

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/courses/:courseId/lessons | 在指定 Course 下创建 Lesson |
| PUT | /api/lessons/:id | 更新 Lesson |
| DELETE | /api/lessons/:id | 删除 Lesson（级联删除 Page） |
| PUT | /api/lessons/:id/reorder | 调整 Lesson 排序 |

#### 5.1.3 页面 CRUD

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/lessons/:lessonId/pages | 在指定 Lesson 下创建 Page |
| GET | /api/pages/:id | 获取单个 Page（含 contentMd） |
| PUT | /api/pages/:id | 更新 Page（标题、contentMd、tags、排序） |
| DELETE | /api/pages/:id | 删除 Page |

#### 5.1.4 发布与版本

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/courses/:id/release | 发布 Course 快照（需 revisionNotes） |
| GET | /api/courses/:id/releases | 获取 Course 的所有 Release 历史 |
| GET | /api/releases/:releaseId | 获取某个 Release 的快照详情 |

#### 5.1.5 同步接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/sync/structure | 仅同步目录树结构（不覆盖内容） |
| POST | /api/sync/all | 全量同步结构和内容 |

> 前期实现 Mock 版本，返回假数据模拟外部 API 响应。

### 5.2 AI 相关接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/ai/chat-stream | 流式 AI 对话（SSE 响应） |
| GET | /api/ai/sessions | 获取某 Course 的对话记录 |
| POST | /api/ai/sessions | 创建新对话 |
| DELETE | /api/ai/sessions/:id | 删除对话 |
| GET | /api/ai/models | 获取可用的 LLM 模型列表 |
| GET | /api/ai/prompts | 获取 PromptTemplate 列表 |
| PUT | /api/ai/config | 保存 CourseAiConfig |
| GET | /api/ai/config/:courseId | 获取某 Course 的 AI 配置 |
| POST | /api/ai/config/:courseId/reset | 重置为默认配置 |

### 5.3 统一响应格式

所有 API 响应统一使用以下格式：

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "message": "操作成功"
}
```

错误时：

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "参数校验失败"
  }
}
```

---

## 6. 前端架构

### 6.1 项目结构

```
client/
├── src/
│   ├── components/
│   │   ├── layout/           # 布局组件
│   │   │   ├── Sidebar.tsx   # 左侧目录树
│   │   │   ├── Header.tsx    # 顶部导航
│   │   │   └── MainLayout.tsx
│   │   ├── knowledge/        # Knowledge System 组件
│   │   │   ├── CourseTree.tsx
│   │   │   ├── SearchBox.tsx
│   │   │   ├── SyncButtons.tsx
│   │   │   ├── PageEditor.tsx
│   │   │   ├── TagManager.tsx
│   │   │   └── PublishPanel.tsx
│   │   ├── ai-tutor/         # AI Tutor 组件
│   │   │   ├── ConfigPanel.tsx
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   └── ModeToggle.tsx
│   │   └── ui/               # 通用 UI 组件
│   ├── pages/
│   │   ├── KnowledgeSystem.tsx   # 知识库主页
│   │   └── AITutor.tsx           # AI Tutor 主页
│   ├── hooks/
│   │   ├── useCourses.ts
│   │   ├── usePages.ts
│   │   ├── useAI.ts
│   │   └── useLocalStorage.ts
│   ├── stores/
│   │   ├── knowledgeStore.ts     # Knowledge 状态管理
│   │   └── aiStore.ts            # AI 状态管理
│   ├── api/
│   │   ├── knowledge.ts
│   │   ├── ai.ts
│   │   └── client.ts             # axios 实例配置
│   ├── utils/
│   │   ├── markdown.ts           # Markdown 处理工具
│   │   └── version.ts            # 版本号生成工具
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

### 6.2 状态管理策略

- 使用 Zustand 管理全局状态（当前选中的 Course/Lesson/Page、AI 配置、对话状态等；2026-10-14 拍板）
- React Context 仅用于少量轻量配置（如界面偏好），不承载复杂状态
- 各模块状态尽量隔离，避免跨模块耦合
- 服务端状态可使用 React Query (TanStack Query) 管理

### 6.3 Markdown 编辑器配置

使用 `md-editor-v3` 的推荐配置：

```typescript
import MarkdownEditor from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';

<MarkdownEditor
  id="editor"
  value={content}
  onChange={handleChange}
  preview={false}
  codeTheme="atom"
  // 启用 KaTeX
  renderHook={{
    preRenderer: (code) => {
      // KaTeX 渲染逻辑
    }
  }}
  tools={[
    'bold', 'underline', 'italic', 'strikeThrough', '-', 
    'title', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', '-',
    'quote', 'unorderedList', 'orderedList', '-',
    'table', 'link', 'image', '-',
    'code', 'codeBlock', '-',
    'preview', 'fullscreen'
  ]}
/>
```

> 注意：需要额外配置 KaTeX 渲染器以支持 LaTeX 公式。建议安装 `md-editor-v3` 的 KaTeX 插件或使用 `react-markdown` + `remark-math` + `rehype-katex` 作为备选方案。

---

## 7. 开发步骤（Step-by-Step）

### Phase 1: 项目初始化

1. 分别创建 `server/` 和 `client/` 目录（2026-10-14 拍板：不采用 Monorepo）
2. 配置 PostgreSQL 数据库
3. 初始化 Prisma 并创建 Schema
4. 执行 `prisma migrate dev` 创建数据库表
5. 运行 Seed 脚本插入默认数据（PromptTemplate 等）

### Phase 2: 后端基础

1. 搭建 NestJS 服务器（2026-10-14 拍板）
2. 配置 TypeScript 编译环境
3. 实现 Prisma 客户端单例
4. 实现统一响应格式中间件
5. 实现错误处理中间件
6. 实现环境变量配置（`.env` 文件）

### Phase 3: Knowledge System 后端

1. 实现 Course CRUD 接口
2. 实现 Lesson CRUD 接口
3. 实现 Page CRUD 接口
4. 实现 Release/Publish 接口
5. 实现 Sync 接口（Mock 版本）
6. 实现接口鉴权中间件（基础版）

### Phase 4: Knowledge System 前端

1. 搭建项目骨架（Vite + React + TypeScript + Ant Design）
2. 实现 MainLayout 布局（左侧 Sidebar + 右侧 Tab 内容区）
3. 实现 CourseTree 树形组件
4. 实现 PageEditor 编辑器（集成 md-editor-v3 + KaTeX）
5. 实现 TagManager 标签管理
6. 实现 PublishPanel 发布面板
7. 实现 Sync 按钮逻辑
8. 对接后端 API

### Phase 5: AI Tutor 后端

1. 实现 PromptTemplate 管理接口
2. 实现 CourseAiConfig 配置接口
3. 实现 AI Gateway Proxy（策略模式）
   - 实现 OpenAI 适配器
   - 预留其他 Provider 的接口
4. 实现流式对话接口（SSE）
5. 实现对话记录接口

### Phase 6: AI Tutor 前端

1. 实现 AI Tutor 页面布局（左侧配置 + 右侧聊天）
2. 实现 ConfigPanel 配置面板
3. 实现 ModeToggle 模式切换
4. 实现 ChatWindow 对话窗口（流式渲染）
5. 实现 New Chat 功能
6. 对接后端 API

### Phase 7: 完善与优化

1. 文件上传转 Markdown 功能（整合 @firecrawl/anydoc 或 markitdown-ts）
2. 接口鉴权完善（JWT Token）
3. 错误边界与加载状态优化
4. 单元测试与集成测试

---

## 8. 环境变量配置

在 `server/` 目录创建 `.env` 文件（后端进程按 cwd 加载；Phase 1 实装起位置，2026-10-14 拍板更正原「项目根目录」表述）：

```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/learning_guide_db"

# JWT Secret（如需用户认证）
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# AI Provider 配置
OPENAI_API_KEY="sk-xxx"
OPENAI_BASE_URL="https://api.openai.com"

# 其他 Provider（按需启用）
# DEEPSEEK_API_KEY="xxx"
# ANTHROPIC_API_KEY="xxx"

# 服务器配置
PORT=3000
NODE_ENV=development

# 文件上传配置
MAX_FILE_SIZE=15728640  # 15MB
ALLOWED_EXTENSIONS="txt,md,pdf,html,xlsx,xls,doc,docx,csv,xml,epub,ppt"
```

---

## 9. 安全注意事项

### 9.1 API 密钥管理

- 所有 LLM Provider 的 API Key 必须存储在 `.env` 文件中
- 通过 `process.env` 读取，**绝不允许**出现在前端代码中
- 生产环境使用环境变量管理服务（如 AWS Secrets Manager、HashiCorp Vault）

### 9.2 AI 请求安全

- 前端**禁止**直接调用 LLM 厂商 API（如 api.openai.com）
- 所有 AI 请求必须经过后端代理（`/api/ai/chat-stream`）
- 后端代理负责：身份验证、请求签名、流式转发

### 9.3 输入验证

- 所有 API 入口必须对请求参数进行校验（类型、长度、格式）
- 文件上传必须校验文件类型和白名单
- 文件上传必须校验文件大小（最大 15MB）
- 使用 Zod 或 Joi 进行请求体校验

### 9.4 其他安全措施

- 启用 CORS 配置，限制允许的源
- 实现基础速率限制（rate limiting）
- 敏感操作（删除、发布）需要二次确认
- 数据库连接使用连接池

---

## 10. 文件上传规范

### 10.1 上传限制

| 限制项 | 规则 |
|--------|------|
| 文件数量 | 单次最多 1 个文件 |
| 文件大小 | 最大 15MB |
| 允许格式 | txt, md, pdf, html, xlsx, xls, doc, docx, csv, xml, epub, ppt |

### 10.2 处理流程

1. 前端校验文件类型和大小
2. 上传到后端 `POST /api/files/upload`
3. 后端校验文件类型和白名单
4. 存储到临时目录或对象存储
5. 调用转换服务（@firecrawl/anydoc 或 markitdown-ts）
6. 生成 Markdown 内容
7. 返回给前端编辑器或直接保存到 Page

### 10.3 转换服务选型建议

| 方案 | 优势 | 适用场景 |
|------|------|----------|
| @firecrawl/anydoc | 支持格式多（docx/xlsx/pptx/pdf/csv/epub 等） | 格式覆盖度优先 |
| markitdown-ts | TypeScript 原生，轻量 | Node/TS 工程化优先 |

> 注意：xml、xls、epub 等格式需要单独确认覆盖情况。

---

## 12. 待确认事项

以下事项需要在开发前与产品/架构师确认：

1. **用户认证**：是否需要用户登录、多用户、权限管理？还是先做单人私有部署？
2. **AI Provider**：初期接入哪些 LLM 提供商？（OpenAI、Claude、DeepSeek、本地模型）
3. **文件转换**：是否允许调用外部服务？还是必须尽量本地 Node 完成？
4. **外部同步源**：Sync 功能对接的外部 API 文档是否已就绪？接口格式如何？
5. **历史版本回滚**：是否需要从 Release 快照回滚到某个历史版本？
6. **AI 对话持久化**：对话记录是否需要长期保存？是否有数据保留策略？
7. **前端框架最终选定**：React + Vite 还是 Next.js？
8. **部署环境**：生产环境部署在何处？（云服务器、Vercel + Railway 等）

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
| Markdown 编辑器 | ~~md-editor-v3~~ **@uiw/react-md-editor**（需支持 LaTeX/KaTeX；2026-10-14 Phase 4 用户裁决改拍，见 §3.3.2） |
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
>
> **2026-10-16 结构扁平化改拍**：原三级 Course→Lesson→Page 简化为两级 Course→Page。
> Lesson（文件夹）层删除：原 Lesson 标题变为 Page.title（md 文件标题），原 Lesson 下属各 Page 的内容合并为该 Page 的 contentMd，以 `# {原Page标题}` 作为 H1 section 拼接。
> Page 新增 `sectionTags`（Json）：按 heading（H1-H6，2026-10-19 由 H1/H2/H3 扩展）slug 映射用户自定义 tags，用于 AI 投喂时的语义标注。

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
  currentReleaseId String?  // 激活版本指针（§3.4.3/§4.3.3）：AI Tutor 知识库读此 Release 快照
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  pages           Page[]
  releases        Release[]
  aiConfig        CourseAiConfig?
  // 反向关联（Prisma 双向关系要求）：users 为隐式多对多，
  // migrate 时生成联接表 _CourseToUser
  users           User[]
  aiChatSessions  AiChatSession[]
}

// 第二层：页面/内容 (Page)（2026-10-16 扁平化：原 Lesson → Page 合并）
model Page {
  id            String    @id @default(uuid())
  courseId      String
  course        Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title         String    // 原 Lesson 标题（md 文件标题）
  contentMd     String    @db.Text  // 合并后的 Markdown：各原 Page 以 `# {Page标题}` 为 H1 拼接（Lesson.title 不入内容）
  sectionTags   Json?     // H1-H6 级标签映射：{ "h1-slug": ["tag1"] }（2026-10-16：移除页面级 tags，仅保留 section tags 用于 AI 语义标注；2026-10-19：标签范围由 H1/H2/H3 扩展至 H1-H6）
  sortOrder     Int
  syncState     SyncState @default(SYNCED) // 外部源同步状态（§3.2.2）

  @@index([courseId, sortOrder])
}

// 全局 Tag 词库（2026-10-16 方案 B 轻量版：用户输入新 tag 自动沉淀，颜色自动分配）
model Tag {
  id      String @id @default(uuid())
  name    String @unique  // tag 名称（唯一）
  color   String          // 预设语义色（antd preset）或自动分配色
}

// 同步状态枚举（§3.2.2 外部源接管模型）
enum SyncState {
  SYNCED  // 与外部源一致
  STALE   // 本地独有或外部已变更，已失效（置灰，不作 AI Tutor 知识库）
}

// ==========================================
// 发布与版本控制
// ==========================================

model Release {
  id              String    @id @default(uuid())
  courseId        String
  course          Course    @relation(fields: [courseId], references: [id])
  versionTag      String    // 版本号，格式: "CourseName_YYYYMMDDHHmm"（精确到分钟）
  revisionNotes   String    @db.Text  // 本次修订的备注
  snapshotData    Json      // 完整内容快照: { pages: [{ id, title, contentMd, sectionTags }] }（2026-10-16 扁平化；去 tags）
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

Knowledge System 是系统的主界面，采用「顶部整宽 Tab 栏 + 下方左右两栏」布局：

- **顶部（整宽 Tab 栏）**："Knowledge Pages"（编辑器，含左侧 TOC）与 "Releases"（版本发布，2026-10-19 由 "Publish" 更名）两个 Tab，横跨下方整行、位于课程树列（含同步目标）**上方**
- **下方左侧**：课程目录树（Course → Page → Heading），搜索框，Sync 按钮（**仅 "Knowledge Pages" Tab 显示**；"Releases" Tab 下隐藏整个课程树栏，仅保留最左侧模块导航列 Knowledge/AI Tutor）
- **下方右侧**：当前 Tab 对应的内容（编辑器 / 版本发布）

> **2026-10-19 布局改拍**（对齐 Figma 帧 `1.1 Page Editor` 节点 665:543）：原 Tab 页签位于右侧内容列内、与左侧课程树列并排且略低于「同步目标」；现提升为**跨「课程树列 + 内容区」的整宽 Tab 栏**，置于同步目标上方。Tab 样式对齐 Figma：激活态主色 `#145CFF`、字号 16px/字重 600、底部 2px 激活下划线 + 整条底边线；非激活态 `#000000`。

> **2026-10-19 Releases Tab 调整**（用户裁决）：Tab 2 名称 `Publish` → **`Releases`**；列表上方新增标题行 `Knowledge Releases`；列 `Current Version` → `Latest Release`；Action 按钮 `Publish` → `Create Release`；`Releases` Tab 下隐藏左侧课程树栏（同步目标 / 课程树 / Sync 按钮），仅保留最左侧模块导航列。

> **2026-10-19 内容面板样式统一**（用户裁决「完全按 Figma」，覆盖 Knowledge Pages / Knowledge Releases / AI Tutor 三区）：所有页面**主内容区统一为白色内容面板**——填充 `#FFFFFF`、圆角 **12px**（`radius.lg`）、**无边框**、阴影 `shadow.card`（`0 1px 2px -1px rgba(0,0,0,.1), 0 1px 3px rgba(0,0,0,.1)`），置于页面底色 `#F8FAFC` 之上；**子内容块**（文本框/表格/公式区/下拉）圆角统一 **8px**（`radius.md`）；**输入类控件**（输入框/文本域/下拉）描边统一 `1px #E2E8F0`、底色 `#FAFBFC`（经主题 `components.Input/Select` 注入，token `color.inputBorder`/`color.inputBg`）。实现：AntD `Card` 封装层默认改为无边框 + 卡片阴影（圆角由主题 `borderRadiusLG=12` 提供），非 Card 区域（编辑器 / Releases）使用新增 `ui/Panel` 封装，输入类规格经 ConfigProvider `components` 注入；**不改动任何页面内容与布局结构**。
> **2026-10-19 左侧课程树列卡片化**（用户追加）：左侧课程树列（同步目标 / 课程树 / Sync 按钮）同样卡片化——`MainLayout` 的 `Sider` 去掉右边框、底色改为页面底色 `#F8FAFC` 并加内边距 `spacing.lg`，`Sidebar` 根节点改为 `ui/Panel`，使该列在灰底上**悬浮为白色圆角卡片**，与右侧内容面板**对称统一**（三段式骨架与页面底色均不变）。

> **2026-10-16 扁平化改拍**：原三级 Course→Lesson→Page 简化为两级 Course→Page。
> Lesson（文件夹）层删除：原 Lesson 标题变为 Page.title（md 文件标题），原 Lesson 下属各 Page 合并为该 Page 的 contentMd，各原 Page 标题作为 H1 section。
> 树结构扩展为 Course → Page → Heading（H1-H6）三级，Heading 级作为目录（TOC），点击可定位编辑器。
> **2026-10-19 层级扩展改拍**：Heading/TOC/标签支持范围由 H1/H2/H3 扩展至 **H1-H6**（BlockNote heading schema 原生支持 6 级，块编辑器右键插入菜单同步放开 H4-H6；sectionTags 迁移与 AI 上下文分段正则由 `#{1,3}` 放宽为 `#{1,6}`）。

> **Phase 4 排版对齐注记（2026-10-14，按用户设计稿）**：整体为「顶部 Header + 模块导航列 + 课程树列 + 内容区」四段——Header 白底，左侧 logo+产品名、右侧通知铃铛与当前用户（演示身份静态占位）；模块导航列含 **Knowledge / AI Tutor** 两个入口（当前模块高亮）；树列顶部搜索框、底部 Sync 按钮；预设标签配色：Core Knowledge 蓝 / Teaching Guidance 绿 / Misconception 橙 / Assessment 紫。

> **2026-10-19 模块导航列可收起**（用户裁决，完全收起隐藏；形态更新为**半圆括号式贴边把手**）：最左侧模块导航列（Knowledge / AI Tutor）新增收起/展开按钮——按钮为**半圆括号式贴边把手**（外侧整边圆弧、内侧平直，约 22×48），紧贴该列**右边缘垂直居中**（不跨边界）；点击后整列向左滑出隐藏（宽 160 → 0，带 0.2s 过渡），把手随停靠到最左边缘作为展开入口；方向符号用文本 **❮ / ❯**（fontSize 16 / fontWeight 700，加粗放大，随状态切换）。收起状态由 `MainLayout` 本地 state 维护，不改动 `ModuleNav` 组件本身。

### 3.2 左侧边栏（Sidebar）

#### 3.2.1 树形导航组件（2026-10-16 扁平化 + TOC）

- 实现三级嵌套树形组件：Course（一级）→ Page（二级，原 Lesson）→ Heading（三级，contentMd 中的 H1-H6，2026-10-19 扩展）
- **树按同步目标过滤**：树中只显示当前同步目标对应的本地课程；目标尚未同步时显示空态提示
- Course 节点**默认始终展开、不可折叠**，不显示展开箭头（2026-10-19 改）
- Page 节点点击→打开编辑器；点击行尾 chevron→展开其下 Heading 目录（TOC）
- Heading 节点（H1-H6，2026-10-19 扩展）点击→编辑器滚动定位到对应块（TOC 功能，2026-10-16 新增）
- 节点图标行内渲染；层级缩进收紧为 16px
- 支持搜索框，**匹配 Page 标题 + 全部 Heading（H1-H6）**（2026-10-19 改：原仅按标题过滤，且无结果时整棵树空白）。匹配范围**仅标题与 heading，不含正文**；命中规则：**标题命中→显示该页全部 Heading；仅 Heading 命中→只显示匹配的 Heading**；命中分支自动展开；点击命中的 Heading 直接定位（跨文件自动切换并滚动）；**无匹配结果时树区域显示「无匹配结果」空态提示**；搜索过滤时禁用拖拽排序
- **Course 节点悬停菜单**：新建页面、**上传文档建页**（见 §3.2.3）、删除课程（2026-10-19 改：上传入口从 Page 移至 Course）
- **Page 节点悬停菜单**：删除页面（2026-10-19 改：移除新建页面 / 上传文档建页）
- **Page 节点支持拖拽排序（2026-10-19 新增）**：鼠标悬停时行左侧显示拖拽把手（⣿），按住把手拖动即可调整 Page 在**同一 Course 内**的先后顺序；拖拽结束立即经 §5.1.2「批量排序接口」持久化 `sortOrder`；排序对全部 Page 生效（含外部同步页；再次执行同步结构可能被外部源覆盖）

#### 3.2.2 Sync 同步（外部源接管模型）

> **设计改拍（2026-10-14）**：原「全量强制覆盖」语义改为**非破坏性外部源接管模型**。外部源是课程主数据（master），本地在同步结果上做修改；再次同步**绝不覆盖或丢失本地内容**，过期内容以「灰度失效」标记交用户处置。
>
> **2026-10-16 扁平化改拍**：外部源仍为 Course→Lesson→Page 三级，本地为 Course→Page 两级。同步时将外部一个 Lesson 映射为本地一个 Page（contentMd = `# {Lesson.title}` + 各外部 Page 以 `# {Page.title}` 为 H1 拼接）。

**同步目标选取**：Sidebar 顶部为**外部课程选择器**（下拉列出外部源课程，带状态）。**选中即切换、无锁定机制**：切换目标前自动 `flushSave` 落盘当前草稿，树与编辑器随之切到新目标课程，并**自动选中该课程上次编辑的页面**。未选中时两个 Sync 按钮禁用。原「新建课程」入口**彻底移除**——所有课程来自外部源同步。

**两个按钮**：

| 按钮 | 接口 | 行为 |
|------|------|------|
| Sync Structure Only | POST /api/sync/structure `{ externalId }` | 仅同步目录树结构（页面标题、排序、增删节点），不写入正文 |
| Sync Structure & Course | POST /api/sync/all `{ externalId }` | 同步结构 + 内容（非破坏性，见下表） |

**同步算法（按 Lesson.title 匹配外部 Lesson ↔ 本地 Page）**：

| 情形 | 行为 |
|------|------|
| 外部有、本地无 | 新增 Page（contentMd 按上述规则拼接）；标题冲突按 `标题-new` 递增 |
| 两边都有、合并后 contentMd 一致 | 不动；全部一致返回 `unchanged` |
| Lesson.title 一致但合并 contentMd 变了 | 本地 Page 整体 `syncState=STALE` 并改名为 `{title} (old)`；新建 Page 装入外部最新合并内容 |
| 本地有、外部无 | 本地 Page `syncState=STALE`，交用户删除 |

**方案 C：sectionTags 迁移（2026-10-16 拍板）**：同步新建 Page 时，若对应 STALE 旧 Page 存在 `sectionTags`，按带层级前缀的 heading slug（`h{n}-slug`，小写、空格转 `-`、去特殊字符）匹配迁移——slug 相同的 tags 搬到新 Page，slug 不存在的（heading 文本改了）丢弃。

**STALE（灰度失效）节点**：树中置灰 + Tooltip。AI Tutor 快照过滤 STALE 节点。

**响应**：`{ created, staleMarked, unchanged }` 变更摘要。

> **Mock 实现**：外部源为后端内存 fixture（`server/src/sync/demo-fixtures.ts`），真实外部 API 接入后替换数据源、同步算法不变。

#### 3.2.3 上传文档建页（2026-10-15 实现落地；同日按用户设计稿改为两步弹窗「Upload and Parse」）

- **入口**：树中 Page 节点悬停菜单「上传文档建页」→ 打开弹窗（不再直接调系统文件选择器）
- **弹窗两步**（按用户设计稿）：
  1. **选择文件**：虚线拖拽区（Drag and drop file, or Browse）+ 文件 chip；前端预校验（扩展名白名单 + ≤15MB，§10.1）；文案按**实际白名单 10 格式**显示（设计稿中 epub/ppt 不支持；xls/doc 已于 2026-10-19 扩充支持）；Next 进入解析
  2. **转换预览**：`POST /api/files/convert`（仅 multipart `file`）→ 后端二次校验 → markitdown-ts **本地**转换 → 弹窗内预览返回的 Markdown 内容；**Import** 才真正建页：复用 `POST /api/courses/:courseId/pages`（§5.1.2）以 `{ title, contentMd: markdown }` 新建 Page（标题=文件名去扩展名，`syncState=SYNCED`）→ 前端刷新树并自动选中进编辑器
- **失败**：格式不支持/超限/转换失败/结果为空均 400（统一响应格式），弹窗内提示；Cancel 或关闭弹窗则什么都不落（转换阶段不建页、不落盘，内存 Buffer 直转）
- 音视频文件**不在本轮范围**（2026-10-15 拍板，随 §12 事项 #4 真实外部源接入一并设计）

### 3.3 右侧内容区 - Tab 1: Knowledge Pages（编辑器）

#### 3.3.1 页面布局

- 顶部显示当前选中 Page 的标题，**默认展示态 + 铅笔就地编辑（2026-10-19 改）**（对齐 Figma `1.1 Page Editor` 665:543）：
  - **展示态**：大标题文本（约 30px / 字重 700 / 黑色）+ 右侧常显铅笔按钮（16×16 图标的 20×20 容器）；标题下方一条分隔线
  - **编辑态**：点击铅笔 → 就地切换为输入框（自动聚焦）；`Enter` / 失焦保存，`Esc` 取消（回滚到进入编辑前的标题）
  - 原「常驻可编辑填充输入框」形态废弃
- 标题区右侧保留保存状态提示（页面级 Tags 已移除，见 §3.3.3）
- 主体区域为 Markdown 编辑器

#### 3.3.2 Markdown 编辑器要求（2026-10-15 改拍：Notion/Jupyter 式块编辑器，BlockNote 实现）

> **选型改拍（2026-10-15，用户裁决）**：原 `@uiw/react-md-editor` 全文 Markdown 编辑 + live 预览，不符合「逐块编辑、右键插入、无顶栏工具栏」的诉求。改用 **BlockNote**（`@blocknote/react`）实现 Notion/Jupyter 式块编辑器。

**核心不变量（必须守住）**：

- `Page.contentMd` 仍是**唯一存储格式**（§2 表结构不动；发布快照、AI 知识源、外部同步、上传转换全部基于 Markdown 字符串）。块只是**编辑视图**，保存时序列化回 md
- **KaTeX 公式必须可用**（课程核心内容）——经 `@blocknote/math-block` 官方包接入：`$$…$$` 为数学块、`$…$` 为行内公式，底层用 KaTeX 渲染
- **无源码模式切换**（2026-10-15 用户裁决移除）：纯块编辑，解析异常时仅提示不降级

**交互模型**（2026-10-15 用户拍板细化 + 冒烟修正）：

1. **输入=源码、失焦即渲染**：每个块编辑态显示可编辑文本，支持 Markdown 快捷语法（输入 `# ` 回车→H1、`- `→列表、`$$…$$`→数学块、`|a|b|`→表格等，BlockNote 原生 markdown shortcuts）；**失焦 / 切换到另一块 / 手动保存时**自动序列化回 md 并渲染预览态
2. **无顶栏工具栏**，插入操作两种入口：
   - **块左侧 ⋮ 柄菜单**（hover 显示）：在上方/下方插入块（段落、H1-H6、表格、图片、数学块、代码块、引用、有序/无序列表）、删除块、复制块、上移下移
   - **右键菜单**（编辑区任意位置 contextmenu）：在光标所在块下方插入指定类型块，每项带图标（段落/标题/列表/表格/代码/引用/数学/图片）——用原生 `contextmenu` 事件 + AntD Dropdown 实现
   - ~~斜杠命令 `/`~~：**已移除**（2026-10-15 冒烟反馈：触发白屏，移除）
3. **选中内容浮窗**（BlockNote 原生 `formattingToolbar`）：选中文本后自动弹出小工具栏，含：粗体 / 斜体 / 下划线 / 删除线 / 行内代码 / 链接 / 标记（高亮）/ 颜色 / 清除格式
4. **拖拽重排**：启用块左侧 drag handle（`sideMenu`），长按拖拽改变块顺序
5. 顶部仅保留：页面标题（展示态 + 铅笔就地编辑，见 §3.3.1）、保存状态（页面级 Tags 已移除，tag 仅在 H1-H6 section 下，2026-10-19 扩展）

**数据往返（md ↔ blocks）**：

| 方向 | API | 时机 |
|------|-----|------|
| 加载 | `tryParseMarkdownToBlocks(contentMd)` → `editor.replaceBlocks` | 选中页面、切换页面、激活版本后 |
| 保存 | `blocksToMarkdownLossy(blocks)` → `editDraft({ contentMd })` | 块内容变更后 500ms 防抖（store 层） |

> 解析失败（`tryParseMarkdownToBlocks` 返回空或异常）时仅 message 提示，不切换模式（无源码模式）。

**图片处理（待设计，本轮仅外链）**：

- 块编辑器图片块本轮**仅支持外链 URL**（右键/上传时 prompt 输入 URL）
- 本地图片上传需新增 `POST /api/files/image`（存库/磁盘 + 返回 URL），属于**待设计项**，不在本轮实现（与音视频一起随 §12 #4 接入）
- 表格插入：BlockNote 原生表格块，保存为 GFM 表格 md

**与现有链路的兼容性**：

- 上传建页（§3.2.3）产出的 `contentMd` 直接喂给 `tryParseMarkdownToBlocks`，无需改动转换侧
- AI 知识源（§4.3.3）读的是 `contentMd` 字符串，与编辑器无关，不受影响
- 发布快照存 `contentMd`，激活后同样经 `tryParseMarkdownToBlocks` 加载

**依赖**：`@blocknote/react@0.56.0`、`@blocknote/mantine@0.56.0`（提供默认 UI 组件，含格式化浮窗、侧边拖拽手柄）、`@blocknote/math-block@0.56.0`、`@blocknote/core@0.56.0`；注意：0.56 为无头架构，`BlockNoteViewRaw` 不提供 UI，必须使用 `@blocknote/mantine` 的 `BlockNoteView`（内部注入 `ComponentsContext`）才能启用 formattingToolbar/sideMenu 等默认浮窗；导出名：`BlockNoteView`（来自 `@blocknote/mantine`，非 `BlockNoteViewRaw`）、数学包名 `@blocknote/math-block`（非 `@blocknote/math`）；`@uiw/react-md-editor` / `remark-math` / `rehype-katex` 保留供 AI ChatWindow 渲染使用

#### 3.3.3 Tags 管理（2026-10-16 重构：移除页面级 tags，仅保留 section tags + 全局 Tag 词库方案 B）

- **页面级 tags 已移除**：编辑器顶部不再显示页面级 TagManager，`Page.tags` 字段删除。
- **section tags**（`Page.sectionTags`，Json 映射 `{ "h{n}-slug": ["tag1"] }`）：
  - 每个 H1-H6 标题下方显示一个轻量 TagManager，用户可为该 section 单独打 tag（2026-10-19：由 H1/H2/H3 扩展至 H1-H6）
  - key = `h{层级}-{slug}`，如 `h1-overview`、`h2-subsection`（层级前缀避免同名冲突）
  - slug = heading 文本小写、空格转 `-`、去特殊字符
  - 修改时实时更新 `sectionTags`，随 contentMd 一起保存
  - 用途：AI 投喂时为对应内容段落标注语义标签（如「核心概念」「易错点」），帮助 AI 精准引用
- **全局 Tag 词库（方案 B 轻量版）**：
  - 独立 `Tag` 表（name 唯一、color），初始内置 4 个预设 tag（Core Knowledge=蓝、Teaching Guidance=绿、Misconception=橙、Assessment=紫）
  - 用户输入 tag 时：输入框带 AutoComplete 联想已有 tag；命中词库则用其颜色
  - 输入未命中的新 tag → 自动分配颜色（按 name 哈希到预设色板）并**写入 Tag 词库**，供后续选择
  - 颜色自动分配：对 tag name 做哈希取模到色板（蓝/绿/橙/紫/红/青/金/粉），同名 tag 颜色稳定
  - 第一版不做独立 Tag 管理界面，靠「输入即沉淀」自动维护词库；删 tag/改色留后续

### 3.4 右侧内容区 - Tab 2: Releases（版本发布）

#### 3.4.1 发布列表

列表上方标题行显示 `Knowledge Releases`（2026-10-19 新增）。表格展示所有 Course 的发布状态，列包括：

| 列名 | 说明 |
|------|------|
| Course Name | 课程名称 |
| Revision Notes | **激活版本**的备注（2026-10-15 随激活模型改拍，原「最近一次发布的备注」；若无则显示 "No revision notes provided"） |
| Latest Release | **激活版本**版本号（`Course.currentReleaseId` 指向的 Release），格式 `CourseName_YYYYMMDDHHmm`，可点击（2026-10-19 由 "Current Version" 更名） |
| Action | Create Release 按钮（2026-10-19 由 "Publish" 更名） |

#### 3.4.2 Latest Release 交互

> **设计改拍（2026-10-15，用户裁决）**：原「只读查看、无回滚」改为**激活版本模型**——历史版本可浏览、可切换为激活版本。

- 点击版本号，弹出 Dropdown/Modal 展示该 Course 的历史版本列表
- 每个历史版本显示：版本号、发布时间、Revision Notes；**当前激活版本带「激活中」标识**
- 每个非激活的历史版本提供「切换到此版本」按钮（§12 事项 #5 拍板）：
  1. 二次确认弹窗：明确提示「切换将以该版本内容**覆盖当前可编辑草稿**（含未发布的修改），且 AI Tutor 知识库立即变为该版本」，用户确认后才执行
  2. 前端调用 `POST /api/courses/:id/activate-release`，传入 `{ releaseId }`
  3. 后端在**单事务**内：校验 releaseId 属于该 Course → 更新 `Course.currentReleaseId` → 用该 Release 的 snapshotData **重建 Page 草稿**（快照中仅含发布时刻的 SYNCED 节点，重建节点一律 `syncState=SYNCED`，后续 Sync 按标题匹配不受影响）
  4. 前端刷新课程树与编辑器（当前草稿指向的页面可能已不存在，需清空选中态）

#### 3.4.3 Create Release 流程

> **设计改拍（2026-10-15）**：Create Release 语义 = 创建快照 + **激活**（发布即激活）；快照仅收录 `syncState=SYNCED` 的节点（延续 §3.2.2「STALE 不作 AI 知识库」）。

1. 用户点击某个 Course 的 "Create Release" 按钮
2. 弹出 Modal，要求填写 Revision Notes（必填）
3. 确认后，前端调用 `POST /api/courses/:id/release` 接口，传入 revisionNotes
4. 后端在**单事务**内执行以下逻辑：
   - 读取当前 Course 下所有 Pages（**过滤 STALE 节点**）
   - 生成版本号：`CourseTitle_YYYYMMDDHHmm`
   - 将所有当前内容聚合为 JSON 快照：`{ pages: [{ id, title, contentMd, sectionTags }] }`
   - 写入 Release 表
   - 更新 `Course.currentReleaseId` = 新 Release（发布即激活）
5. 前端刷新 Releases 列表

> **重要**：Create Release 动作是发布整个 Course 下所有页面的快照，不是单个 Page。
> **2026-10-16 扁平化**：快照结构从 `{ lessons: [...] }` 改为 `{ pages: [...] }`，activate 时直接重建 Page（不再经过 Lesson）。

---

## 4. 模块 B：AI Tutor（AI 辅导）

### 4.1 功能概述

AI Tutor 是一个独立的功能板块，提供 AI 对话能力。其知识库来源于 Knowledge System 中选中的 Course。

页面布局（2026-10-15 改版对齐设计稿）：
- **顶部栏（全宽）**：左侧显示当前课程标题，右侧 "Change Course" 下拉选择器
- **左侧**：配置面板（System Prompt、Welcome Message、LLM Model、Reset/Save 按钮）
- **右侧**：测试对话窗口（头部显示激活版本号 + Testing 徽章、模式切换、New Chat、消息列表、输入框）

### 4.2 左侧配置面板

#### 4.2.1 System Prompt

- 文本域（Textarea，较大行数），支持编辑当前课程使用的 AI 人设
- 编辑后需点击 "Save" 才能持久化

#### 4.2.2 Welcome Message

- 文本域（Textarea），支持编辑欢迎语

#### 4.2.3 LLM Model 配置

- 下拉框，切换模型（数据源为 `AI_AVAILABLE_MODELS` env，逗号分隔）
- 后端需提供模型列表接口（`GET /api/ai/models`），支持扩展
- **默认模型**：取 `AI_AVAILABLE_MODELS` 列表第一个；当前为 `deepseek/deepseek-v4.1-flash`
- **用途**：所选模型即该课程 AI Tutor 对话使用的模型（含测试与学生端），保存后对该课程生效
- **API Key**：统一使用服务端全局 `OPENROUTER_API_KEY`，课程级 API Key 覆盖已下线（2026-10-15）；后端 `CourseAiConfig.apiKey` 字段及加密逻辑保留，仅前端不再暴露入口

#### 4.2.4 Reset 按钮

- 点击后，清空当前课程的自定义输入
- 恢复为对应模式的默认 PromptTemplate（从 PromptTemplate 表加载 isDefault=true 的记录）

#### 4.2.5 Save 按钮

- 保存当前修改到 CourseAiConfig 表
- 包括：lectureModeId、socraticModeId、customSystemPrompt、customWelcomeMsg、llmProvider、llmModel 等
- 配置面板底部左侧为 Reset 链接，中间显示 "Unsaved changes" 未保存提示，右侧为 "Save Configuration" 蓝色主按钮

### 4.3 右侧对话面板

#### 4.3.1 对话头部

- 左侧：当前课程激活版本号（`Course.currentReleaseId` 指向的 Release.versionTag）+ 绿色 "Testing" 徽章（固定显示，表示 AI 测试用知识库版本）
- 中间：Lecture / Socratic 模式切换
- 右侧：+ New Chat 按钮

#### 4.3.2 模式切换

- Segmented 切换 `Lecture` 和 `Socratic` 模式
- **关键逻辑**：切换模式时，左侧的 System Prompt 输入框应自动更新为对应模式的提示词（优先使用自定义配置，无自定义则使用模板默认值）

#### 4.3.3 New Chat

- 清空右侧对话框的当前聊天记录（含浏览器 localStorage 中的上次会话）
- 显示 Welcome Message 作为 AI 的第一条消息

> **对话持久化拍板（2026-10-14，§12 事项 #6）**：对话记录**不落库**。"上一次聊天"经浏览器 localStorage 持久化（按 courseId+mode 隔离），短时间退出页面再回来可恢复；点击 New Chat 清空；当前无长期记忆需求。`AiChatSession` 表保留（后续调试/持久化启用用），MVP 不写入，`/api/ai/sessions` 系列接口不实现。

#### 4.3.4 对话流程

1. 用户在底部输入框输入消息，点击发送
2. 前端调用 `POST /api/ai/chat-stream` 接口，传入：
   - courseId（当前选中的课程）
   - message（用户输入）
   - mode（当前模式：lecture 或 socratic）
3. 后端执行以下逻辑：
   - 知识库上下文来源（**2026-10-15 拍板改**）：读取 `Course.currentReleaseId` 指向的激活 Release 的 snapshotData 聚合课程资料，**不再读实时草稿**——创建 Release 后未再次发布的编辑不影响 AI；若课程从未发布（currentReleaseId 为空），返回错误提示「该课程尚未发布知识库版本，请先在 Knowledge 模块 Releases 页创建版本」（2026-10-19 文案随 Tab 更名更新）
   - 组装 Prompt：`System Prompt + [CONTEXT: 课程资料] + 用户消息`
   - 调用 LLM API（流式）
   - 将流式响应转发给前端
   - 对话不落库（2026-10-14 拍板，见 §4.3.2）
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
  "mode": "LECTURE | SOCRATIC",
  "history": [{ "role": "user | assistant", "content": "string" }]
}
```

> `history` 为可选字段（2026-10-14 补充）：前端把 localStorage 会话的最近若干条随请求携带，后端仅取最近 10 条拼入多轮上下文，保证对话连续性（对话本身仍不落库）。

响应：Stream（Server-Sent Events 格式）

#### 4.4.2 核心处理逻辑

1. **参数校验**：验证 courseId、message、mode 必填
2. **加载配置**：根据 courseId 获取 CourseAiConfig，解析 LLM 提供商和模型（apiKey 字段经 AES-256-GCM 解密后仅在内存中使用，环境变量 `AI_CONFIG_ENCRYPTION_KEY`，2026-10-14 拍板）
3. **加载知识库上下文**：读取 `Course.currentReleaseId` 指向的激活 Release 的 `snapshotData.pages`，按 H1-H6 section 切分 contentMd，每段拼接对应 `sectionTags`（如有），聚合为带语义标注的课程资料
4. **组装 Prompt**：
   - 获取对应模式的 PromptTemplate（优先自定义，其次默认）
   - 拼接：`System Prompt` + `[CONTEXT_START]` + 课程资料 + `[CONTEXT_END]` + 用户消息
   - Socratic 模式额外注入引导指令：`"你是一个苏格拉底式的引导者。永远不要直接给出最终答案。将答案拆解成一系列反问和引导性问题，逐步启发用户自己得出结论。"`
5. **代理转发**：经 Provider 适配器（策略模式，首批接入 OpenRouter，OpenAI 兼容接口，2026-10-14 §12 事项 #2 拍板）调用实际 API（流式）
6. **流式返回**：将 LLM 的流式 Chunk 以 SSE 格式转发给前端
7. **日志记录**：MVP 不落库（2026-10-14 拍板，见 §4.3.2；AiChatSession 表保留不写入）

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
| GET | /api/courses/:id | 获取单个 Course（含下属 Pages） |
| POST | /api/courses | 创建 Course |
| PUT | /api/courses/:id | 更新 Course |
| DELETE | /api/courses/:id | 删除 Course（级联删除 Page） |

> **删除保护（2026-10-14 拍板）**：Course 下已存在 Release 历史版本时拒绝删除，返回 409 `CONFLICT`。

#### 5.1.2 页面 CRUD（2026-10-16 扁平化：原 Lesson 端点删除，Page 直接挂 Course）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/courses/:courseId/pages | 在指定 Course 下创建 Page |
| GET | /api/pages/:id | 获取单个 Page（含 contentMd、sectionTags） |
| PUT | /api/pages/:id | 更新 Page（标题、contentMd、sectionTags、排序） |
| PUT | /api/courses/:courseId/pages/reorder | 批量重排 Course 下 Page 顺序：body `{ orderedIds: string[] }`（须为该 Course **全部** Page id 的一个排列）；事务内按数组下标重写 `sortOrder`（2026-10-19 新增，左侧树拖拽排序用） |
| DELETE | /api/pages/:id | 删除 Page |

> **批量排序接口校验**：`orderedIds` 必须无重复、且集合等于该 Course 现有全部 Page id，否则 400 `VALIDATION_ERROR`；`courseId` 不存在返回 404。
>
> 原 `POST /api/courses/:courseId/lessons`、`PUT/DELETE /api/lessons/:id`、`PUT /api/lessons/:id/reorder`、`POST /api/courses/:lessonId/pages` 已删除（2026-10-16；`reorder` 语义于 2026-10-19 以 Course 级批量排序接口重建）。

#### 5.1.3 发布与版本

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/courses/:id/release | 发布 Course 快照并**激活**（需 revisionNotes；快照仅含 SYNCED 节点；2026-10-15 改） |
| GET | /api/courses/:id/releases | 获取 Course 的所有 Release 历史（含 `isActive` 标识，2026-10-15 加） |
| GET | /api/releases/:releaseId | 获取某个 Release 的快照详情 |
| POST | /api/courses/:id/activate-release | 切换激活版本：`{ releaseId }`；事务内更新 currentReleaseId 并以该快照重建草稿树（2026-10-15 新增，§3.4.2） |

#### 5.1.4 同步接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/sync/external-courses | 列出外部源课程（含同步状态：未同步/已同步/有更新），供选择器 |
| POST | /api/sync/structure | 仅同步目录树结构，body `{ externalId }` |
| POST | /api/sync/all | 同步结构+内容（非破坏性），body `{ externalId }` |

> 同步语义详见 §3.2.2（外部源接管模型）。Mock 阶段外部源为后端内存 fixture；真实外部 API 接入（§12 事项 #4）后替换数据源。

#### 5.1.5 文件上传（2026-10-15 新增；同日按 §3.2.3 弹窗设计改为仅转换不建页）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/files/convert | multipart：`file`（白名单+≤15MB，§10.1）；本地转 Markdown（markitdown-ts 为主；`.xls`→SheetJS `xlsx`、`.doc`→`word-extractor`，2026-10-19 扩充），返回 `{ title, markdown }`；**不建页**——用户在弹窗预览确认后经 §5.1.2 `POST /api/courses/:courseId/pages` 建页；校验/转换失败 400 |

> 原 `POST /api/files/upload`（转换+建页一步完成）已废弃（2026-10-15），被两步流程取代。

#### 5.1.6 全局 Tag 词库（2026-10-16 方案 B 轻量版）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/tags | 列出所有 tag（name、color），供 TagManager AutoComplete 联想 |
| POST | /api/tags | 创建 tag：`{ name }`；name 已存在则返回已有记录；新 tag 颜色由后端自动分配（按 name 哈希到预设色板） |

### 5.2 AI 相关接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/ai/chat-stream | 流式 AI 对话（SSE 响应） |
| GET | /api/ai/models | 获取可用的 LLM 模型列表（数据源 `AI_AVAILABLE_MODELS` env） |
| GET | /api/ai/prompts | 获取 PromptTemplate 列表 |
| PUT | /api/ai/config | 保存 CourseAiConfig |
| GET | /api/ai/config/:courseId | 获取某 Course 的 AI 配置（apiKey 脱敏，绝不返回明文；含 currentReleaseTag 激活版本号用于对话头部展示） |
| POST | /api/ai/config/:courseId/reset | 重置为默认配置 |

> 对话记录接口（GET/POST/DELETE `/api/ai/sessions`）不实现（2026-10-14 拍板：对话不落库，见 §4.3.2），待长期持久化启用后再补。

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
│   ├── theme/
│   │   └── tokens.ts             # 设计 Token 单一来源（颜色/间距/字号/圆角/字重）
│   ├── components/
│   │   ├── layout/               # 布局组件
│   │   │   ├── Sidebar.tsx       # 左侧目录树
│   │   │   ├── Header.tsx        # 顶部导航
│   │   │   ├── ModuleNav.tsx     # 模块导航列
│   │   │   └── MainLayout.tsx
│   │   ├── knowledge/            # Knowledge System 组件
│   │   │   ├── CourseTree.tsx
│   │   │   ├── SearchBox.tsx
│   │   │   ├── SyncButtons.tsx
│   │   │   ├── PageEditor.tsx
│   │   │   ├── TagManager.tsx
│   │   │   ├── PublishPanel.tsx
│   │   │   └── UploadDocumentModal.tsx
│   │   ├── ai/                   # AI Tutor 组件
│   │   │   ├── ConfigPanel.tsx
│   │   │   └── ChatWindow.tsx
│   │   └── ui/                   # UI 封装层（Figma 迁移单一替换点；业务组件一律从此导入）
│   │       ├── index.ts          # barrel 统一出口
│   │       ├── Button.tsx  Card.tsx  Input.tsx  Select.tsx  Tag.tsx
│   │       ├── Modal.tsx  Table.tsx  Tree.tsx  Tabs.tsx  Segmented.tsx
│   │       └── Avatar.tsx  Typography.tsx  Layout.tsx
│   ├── pages/
│   │   ├── KnowledgeSystem.tsx   # 知识库主页
│   │   └── AITutor.tsx           # AI Tutor 主页
│   ├── stores/
│   │   ├── knowledgeStore.ts     # Knowledge 状态管理
│   │   └── aiStore.ts            # AI 状态管理
│   ├── api/
│   │   ├── knowledge.ts
│   │   ├── ai.ts
│   │   └── client.ts             # axios 实例配置
│   ├── App.tsx                   # ConfigProvider 注入 tokens 到 antd theme
│   ├── index.css                 # 全局样式 + CSS 变量（供第三方库覆盖）
│   └── main.tsx
├── package.json
└── vite.config.ts
```

> **Phase 4 实装注记（2026-10-14）**：本轮实装 layout/ 与 knowledge/ 组件、pages/KnowledgeSystem.tsx、api/ 与 stores/knowledgeStore.ts。`ai-tutor/` 组件与 `pages/AITutor.tsx`、`api/ai.ts`、`stores/aiStore.ts`、`hooks/useAI.ts` 属 Phase 6；`hooks/` 其余文件与 `utils/` 未建——zustand store 直接承载状态与动作（标准用法，hooks 薄包装属重复抽象），版本号生成由后端完成（§3.4.3 第 4 步），Markdown 渲染由 @uiw/react-md-editor 承担，前端无对应工具需求。dev 环境 `/api` 经 vite.config.ts 代理至后端 :3000。

> **UI 抽象层与设计 Token（2026-10-16 新增，为 Figma 设计库迁移铺路）**：
> - `theme/tokens.ts` 是颜色/间距/字号/圆角/字重的**单一事实来源**；`index.css` 的 `:root` CSS 变量与之同步，供 BlockNote / md-editor 等不读取 antd ConfigProvider 的第三方库覆盖。
> - `components/ui/` 是 UI 组件**唯一替换点**：所有业务组件（layout/knowledge/ai/pages）一律 `import from '../ui'`，禁止直接 `import from 'antd'`。未来无论接入 Figma Code Connect、独立组件库还是仅替换 token，都只需修改 `ui/` 与 `tokens.ts`，业务组件零改动。
> - `App.tsx` 通过 `ConfigProvider theme` 注入与 antd 默认值一致的 token（colorPrimary/success/warning/error/fontSize），确保零视觉变化；业务组件自身的边框/文字/圆角通过 `tokens.*` 内联样式控制。未来接入 Figma 设计库时可在此扩展注入范围。
> - 当前 token 值与既有 antd 默认值完全一致，**零视觉变化**。

### 6.2 状态管理策略

- 使用 Zustand 管理全局状态（当前选中的 Course/Lesson/Page、AI 配置、对话状态等；2026-10-14 拍板）
- React Context 仅用于少量轻量配置（如界面偏好），不承载复杂状态
- 各模块状态尽量隔离，避免跨模块耦合
- 服务端状态可使用 React Query (TanStack Query) 管理

### 6.3 Markdown 编辑器配置

> **Phase 4 实装拍板（2026-10-14 用户裁决）**：原推荐的 `md-editor-v3` 为 Vue 3 库、与 React 不兼容，改用 `@uiw/react-md-editor`，KaTeX 经 `remark-math` + `rehype-katex` 接入（§3.3.2 同步更正）。实装配置：

```typescript
import MDEditor from '@uiw/react-md-editor';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// 注意：@uiw/react-md-editor 的预览基于 @uiw/react-markdown-preview（react-markdown 体系），
// remark/rehype 插件必须经 previewOptions 传入，而非直接作为 MDEditor 顶层 props。
<MDEditor
  value={content}
  onChange={(value) => handleChange(value ?? '')}
  preview="live"           // 实时预览
  style={{ height: '100%' }}
  previewOptions={{
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],  // KaTeX：$…$ 与 $$…$$
  }}
/>
```

> 代码高亮由 @uiw/react-md-editor 内置（highlight.js）；表格原生支持；编辑内容 500ms 防抖自动保存经 store 调度（§3.3.2）。

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

> **鉴权基础版口径（2026-10-14 拍板，对应 §12 事项 #1）**：Phase 3 仅实现 Guard 骨架——全局注册 `ApiKeyGuard`，由环境变量 `AUTH_ENABLED`（默认 `false`）控制开关；开启时校验请求头 `X-API-Key` 等于 `AUTH_TOKEN`，不匹配返回 401 `UNAUTHORIZED`。完整用户认证（JWT/多用户）推迟至 Phase 7 再行确认。

### Phase 4: Knowledge System 前端

1. 搭建项目骨架（Vite + React + TypeScript + Ant Design）
2. 实现 MainLayout 布局（左侧 Sidebar + 右侧 Tab 内容区）
3. 实现 CourseTree 树形组件
4. 实现 PageEditor 编辑器（集成 @uiw/react-md-editor + KaTeX，2026-10-14 Phase 4 改拍）
5. 实现 TagManager 标签管理
6. 实现 PublishPanel 发布面板
7. 实现 Sync 按钮逻辑
8. 对接后端 API
9. 演示种子数据：`server/prisma/seed-demo.ts`（4 门含公式/表格/标签的示例课程，按标题幂等判重），运行 `npm run seed:demo`（仅本地测试用，不并入业务 Seed）

### Phase 5: AI Tutor 后端

1. 实现 PromptTemplate 管理接口
2. 实现 CourseAiConfig 配置接口
3. 实现 AI Gateway Proxy（策略模式）
   - 实现 OpenRouter 适配器（OpenAI 兼容，2026-10-14 拍板）
   - 预留其他 Provider 的接口
4. 实现流式对话接口（SSE）
5. 实现限流（10 次/分钟/courseId）与 CourseAiConfig apiKey 加密存储（对话不落库，§4.3.2 拍板）

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

# AI Provider 配置（首批接入 OpenRouter，OpenAI 兼容接口，2026-10-14 §12 事项 #2 拍板）
OPENROUTER_API_KEY="sk-or-xxx"
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
# 模型列表接口（GET /api/ai/models）数据源，逗号分隔；第一个为默认模型（§4.2.3）
AI_AVAILABLE_MODELS="deepseek/deepseek-v4.1-flash,deepseek/deepseek-r1,openai/gpt-4o-mini,anthropic/claude-haiku-5.5,google/gemini-3.5-flash,qwen/qwen3.6-flash,google/gemma-4-31b-it:free,nvidia/nemotron-3-super-120b-a12b:free"

# CourseAiConfig.apiKey 加密密钥（AES-256-GCM；64 位 hex 即 32 字节，2026-10-14 拍板）
AI_CONFIG_ENCRYPTION_KEY="0000...64位hex...0000"

# 其他 Provider（按需启用，适配器预留）
# DEEPSEEK_API_KEY="xxx"
# ANTHROPIC_API_KEY="xxx"

# 服务器配置
PORT=3000
NODE_ENV=development

# 文件上传配置
MAX_FILE_SIZE=15728640  # 15MB
ALLOWED_EXTENSIONS="txt,md,csv,pdf,docx,xlsx,html,xml,doc,xls"  # 与 §10.1 拍板白名单一致（2026-10-15 更正、2026-10-19 扩充 doc/xls；实际实现为 files.service.ts 常量，不读该 env）
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
| 允许格式 | txt, md, csv, pdf, docx, xlsx, html, xml, doc, xls |

> **白名单改拍（2026-10-15，用户裁决）**：原表（含 xls/doc/ppt/epub）按 markitdown-ts 实测支持面调整——旧二进制格式 xls/doc/ppt 与 epub 不支持（上传时明确提示「格式暂不支持」）。
>
> **白名单扩充（2026-10-19，用户裁决）**：重新支持旧版二进制 **.doc / .xls**——`.xls` 用 SheetJS（`xlsx`）解析转 Markdown 表格，`.doc` 用 `word-extractor` 提取纯文本；其余格式仍由 markitdown-ts 转换（ppt/epub 仍不支持）。**限制说明：`.doc` 仅提取纯文本，不含标题层级 / 表格 / 图片**。

### 10.2 处理流程

1. 弹窗步骤①：前端校验文件类型和大小（扩展名白名单 + ≤15MB）
2. 弹窗步骤②上传到后端 `POST /api/files/convert`（multipart `file`，§3.2.3/§5.1.5）
3. 后端二次校验文件类型白名单与大小（multer limits）
4. 内存 Buffer 直转，**不落临时目录**（2026-10-15 实现拍板）
5. 调用转换服务：**markitdown-ts** 为主（本地，§12 事项 #3 拍板）；`.xls`→**SheetJS `xlsx`** 转 Markdown 表格，`.doc`→**`word-extractor`** 提取纯文本（2026-10-19 扩充）
6. 生成 Markdown 内容，返回 `{ title, markdown }` 供弹窗预览
7. 用户点击 **Import** → 经 §5.1.2 页面创建接口在指定 Course 下新建 Page（标题=文件名去扩展名；2026-10-16 扁平化后无 Lesson 层，Page 直接挂 Course），前端刷新树自动选中；Cancel 则不落任何数据

### 10.3 转换服务选型建议

| 方案 | 优势 | 适用场景 |
|------|------|----------|
| @firecrawl/anydoc | 支持格式多（docx/xlsx/pptx/pdf/csv/epub 等） | 格式覆盖度优先 |
| markitdown-ts | TypeScript 原生，轻量 | Node/TS 工程化优先 |

> **选型拍板（2026-10-15）**：markitdown-ts。实测（真实 docx/pdf/md 样本）：docx/xlsx/pdf/html/xml/txt/md/csv 转换正常；xls/doc/ppt/epub 不支持；图片类需 LLM 视觉模型（不启用）。原「xml、xls、epub 需单独确认」事项已了结。
>
> **补充选型（2026-10-19，用户裁决）**：为覆盖 markitdown-ts 不支持的旧版二进制格式，新增专用库——`.xls` 用 **SheetJS**（`xlsx`，读 BIFF 转 Markdown 表格）、`.doc` 用 **`word-extractor`**（提取纯文本）；均为**纯本地 Node**，不引入外部程序 / 服务。

---

## 12. 待确认事项

以下事项需要在开发前与产品/架构师确认：

1. **用户认证**：是否需要用户登录、多用户、权限管理？还是先做单人私有部署？（Phase 3 已拍板：单人私有部署，鉴权仅预留骨架，见 §7 Phase 3 注记；完整方案 Phase 7 定）
2. **AI Provider**：初期接入哪些 LLM 提供商？（2026-10-14 拍板：**OpenRouter**（OpenAI 兼容接口，经策略模式适配器接入）；具体启用模型清单由用户后续确认，数据源为 `AI_AVAILABLE_MODELS` env；其他 Provider 仅预留适配器接口）
3. **文件转换**：是否允许调用外部服务？还是必须尽量本地 Node 完成？（2026-10-15 拍板：**本地 markitdown-ts**，不调外部服务；支持面实测见 §10.1；2026-10-19 扩充：新增纯本地库 SheetJS `xlsx` / `word-extractor` 以支持 .xls/.doc，仍不调外部服务）
4. **外部同步源**：Sync 功能对接的外部 API 文档是否已就绪？接口格式如何？
5. **历史版本回滚**：是否需要从 Release 快照回滚到某个历史版本？（2026-10-15 拍板：**需要**，采用「激活版本」模型——历史版本可切换为激活版本，AI 知识库与可编辑草稿同步变为该版本，覆盖草稿前二次确认；详见 §3.4.2/§3.4.3/§4.3.3）
6. **AI 对话持久化**：对话记录是否需要长期保存？是否有数据保留策略？（2026-10-14 拍板：**不落库**；上次会话经浏览器 localStorage 持久化，New Chat 清空；无长期记忆需求，见 §4.3.2）
7. **前端框架最终选定**：React + Vite 还是 Next.js？
8. **部署环境**：生产环境部署在何处？（云服务器、Vercel + Railway 等）

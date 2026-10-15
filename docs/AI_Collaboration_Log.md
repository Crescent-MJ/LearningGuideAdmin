# AI 协作日志（Learning Guide BackOffice）

> 规范（2026-10-14 用户确立）：每完成一个 Phase 或做出重大决策，必须将【AI协作日志】落盘本文档。
> 新条目追加在最前（倒序）。条目字段：日期 / 任务 / 用户拍板 / 变更清单 / 自测证据 / 审查结论 / Git / 下一步。

---

## 2026-10-15 ｜ 细节调整：Publish 激活版本模型（历史版本可切换 + AI 知识源改读快照）

- **任务**：用户手动冒烟 Phase 4/5/6 后反馈 Knowledge 流程差距（4 点梳理），本轮实现其中第 4 点：Publish = ①浏览历史并切换 ②发布后 AI Tutor 以该版为知识库、草稿同步变为该版可编辑版
- **用户拍板**：
  - ① AI Tutor 知识源=**读激活 Release 快照**（不再读实时草稿；未发布课程 chat-stream 报 400 提示先 Publish）
  - ② 切换历史版本=**覆盖草稿**（二次确认弹窗明示不可撤销）
  - ③ 外部源音视频数据**本轮不处理**（留 §12 事项 #4 真实 API 接入时一并设计）
  - ④ Publish 表格 Revision Notes 列语义=**激活版本的备注**（Review 设计偏差上报，用户裁决改文档不改实现）
  - ⑤ 协作规则（长期有效）：每次大迭代完成后**先询问用户**是否推送新分支用于合并；`.env` 缺失 4 项（PORT/NODE_ENV/AUTH_ENABLED/AUTH_TOKEN）不补全，依赖代码默认值；OPENROUTER_API_KEY 由用户自行填写，AI 不经手密钥值
  - ⑥ AI_AVAILABLE_MODELS 改为仅 `deepseek/deepseek-v4.1-flash`（经 OpenRouter /models 公开接口核查 462 模型确认存在；不加 AI_MOCK 开关，key 留空即天然安全验证态）
- **变更清单**：
  - **设计文档先行同步**：§2 Course 增 `currentReleaseId String?`（普通标量列不建外键）；§3.4.1 列语义；§3.4.2 历史版本可切换（激活中标识+二次确认+事务重建草稿树）；§3.4.3 发布即激活、快照仅含 SYNCED 节点；§4.3.3 AI 知识源改读激活快照；§5.1.4 增 `POST /api/courses/:id/activate-release`、releases 列表带 isActive；§12 事项 #5 标记已拍板
  - **Schema/迁移**：`20261015030120_add_course_current_release_id`（ALTER TABLE 可空列）
  - **后端**：`releases.service.ts` publish 单事务（读取→快照→激活指针，Review Blocking 修复项）、新增 activate（事务内 deleteMany+按快照重建 Lesson/Page、一律 SYNCED、更新指针、归属校验 404）、findAllByCourse 标注 isActive；`releases.controller.ts` 新路由；`dto/activate-release.dto.ts`；`ai-chat.service.ts` buildContext 改读激活快照（未发布 400）
  - **前端**：`api/knowledge.ts`（ReleaseSummary.isActive、ReleaseDetail 改 Omit+可选、activateRelease 封装）；`knowledgeStore.ts` 新增 afterActivateRelease（清防抖定时器+丢弃草稿+刷新树，防旧草稿写回已覆盖的树）；`PublishPanel.tsx`（Current Version/Revision Notes 列改按激活版本渲染、历史 Modal「激活中」绿标+「切换到此版本」danger 二次确认）
- **自测证据**：server `tsc --noEmit` 0 错误；单测 8 套件 **30/30**（含发布即激活、事务内 SYNCED 过滤断言、activate 重建/归属 404、isActive 标注）；e2e 3 套件 **38/38**（新增 activate 端到端切版本重建草稿树+新 ID 回写、未发布课程 400、限流夹具前置发布；ai 夹具 afterAll 补删 Release 防外键）；空库重放：临时库 `migrate deploy` 3 迁移全部成功（验证后已删）；client `tsc -b` 0 错误。冒烟按新口径由用户手动执行
- **审查结论**：Review Agent 独立审查首轮 **REQUEST_CHANGES**（1 Blocking：publish 快照读取在事务外，违反 §3.4.3「单事务」；修复移入 $transaction 后复审 **APPROVE**）。Non-blocking 处置：#2 ReleaseDetail.isActive 类型已修、#3 §3.4.1 措辞经用户裁决已修；留档后续：#4 activate N+1 可改 createMany、#5 边界用例补充（空 releaseId 400/courseId 404/全 STALE 空快照）、#6 悬空指针 400 提示语义；已知限制：快照不含 duration，切换版本后章节时长丢失（当前无功能消费，若启用先改文档 §2 快照结构）
- **Git**：未推送（待用户裁决是否建分支/PR，见下）
- **下一步**：用户重启后端后手动冒烟（发布→编辑→切历史版本→AI 对话验证知识源为激活版）→ 反馈修复 → Phase 7 剩余项

---

## 2026-10-14 ｜ Phase 4/5/6 完成：Knowledge UI + 外部同步重设计 + AI Tutor 前后端

- **任务**：开发文档 §7 Phase 4（Knowledge System 前端）、Phase 5（AI Tutor 后端）、Phase 6（AI Tutor 前端），用户指示一次性完成 5/6
- **用户拍板**：
  - ① 测试口径（长期有效）：**AI 不做任何冒烟测试**，仅代码测试/接口测试；冒烟由用户手动测试（要符合其需求）；先完成所有阶段再回头微调（微调归 Phase 7）
  - ② AI Provider = **OpenRouter**（用户持 key，含多模型，具体可用模型清单后续确认；接口按 OpenAI 兼容实现）
  - ③ 对话持久化 = **不落库**：New Chat 清空；短时退出再进保留上次聊天（localStorage 按 courseId+mode 隔离）；无长期记忆需求
  - ④ 同意新增 env 加密密钥 `AI_CONFIG_ENCRYPTION_KEY`（AES-256-GCM，64 位 hex）
  - ⑤ 外部同步重设计（Phase 4 内）：非破坏性幂等同步 + 同步前选择器锁定目标外部课程 + STALE 置灰不删除本地数据
- **变更清单**：
  - **Phase 4 前端**（client/src/）：MainLayout/Sidebar/Header、CourseTree（STALE 置灰斜体+Tooltip）、SearchBox、SyncButtons（接同步摘要、未锁定禁用）、PageEditor（@uiw/react-md-editor 4.1.2 + remarkMath + rehypeKatex，500ms 防抖）、TagManager、PublishPanel（发布/历史版本回放）、api/client.ts + api/knowledge.ts + stores/knowledgeStore.ts；清理 Phase 1 脚手架残留
  - **Phase 4 同步后端**（server/src/sync/）：新增 3 接口 GET /api/sync/external-courses（带同步状态）、POST /api/sync/structure、POST /api/sync/all；非破坏性幂等算法（事务、新增/STALE 标记/STALE 恢复/标题冲突处理、绝不覆盖用户已编辑 contentMd）；内存 fixture `demo-fixtures.ts`；Prisma migration `20261014113129_add_sync_state`（enum+两列 DEFAULT SYNCED）；`seed-demo.ts`（4 课程含公式/表格/标签，幂等）
  - **Phase 5 后端**（server/src/ai/，9 源文件）：LlmProvider 策略接口 + ProviderRegistry + OpenRouter 适配器（原生 fetch 解析 SSE，零厂商 SDK）；CryptoService（AES-256-GCM，`iv:tag:ciphertext` hex）；AiConfigService（CRUD 视图仅 `hasApiKey` 绝无 apiKey 字段；resolvePrompts custom>课程模板>isDefault；resolveRuntime 课程级解密兜底 env）；AiChatService（限流→Prompt 组装：System+SOCRATIC 固定引导语+`[CONTEXT_START]` 仅 SYNCED Lesson/Page `[CONTEXT_END]`+history≤10；首字节前重试≤2）；RateLimitService（内存滑动窗口 10 次/分钟/courseId，超限 429）；chat-stream SSE 豁免（先 `await gen.next()` 使限流/404 走全局过滤器 JSON，流中途失败下发 error 帧）；`.env.example` 补 4 个 AI 变量
  - **Phase 6 前端**（client/src/）：api/ai.ts（fetch+ReadableStream 按 `\n\n` 分帧解析 SSE，非 2xx 解析信封抛错）、stores/aiStore.ts（localStorage 会话 `aitutor.chat.${courseId}.${mode}`、effectivePrompts 与后端同口径）、ConfigPanel（课程/模型/API Key 脱敏编辑+清除/System Prompt/Welcome/Reset/Save）、ChatWindow（LECTURE/SOCRATIC 切换、New Chat、流式渲染经 `MDEditor.Markdown`+KaTeX——React 19 下 react-markdown 类型冲突不可直接 import）、pages/AITutor.tsx
  - **设计文档同步（先行回填）**：§3.1/§3.2.2（同步接口与 Mock 口径）/§4.3.2/§4.3.3/§4.4.1/§4.4.2/§5.2/§8/§12 #2 #6/Phase 5 步骤；README、agents/dev-agent.md
- **自测证据**（按新口径，无浏览器冒烟）：`npm run build`（server）✅；单测 8 套件 28 用例 ✅（crypto 随机 IV/篡改/坏密钥、rate-limit 第 11 次/课程隔离/窗口滑出等）；e2e 3 套件 35 用例 ✅（app 4 + knowledge 21 + ai 10；假 Provider 零触网；断言 prompt 组装/STALE 排除/限流 429/响应与 DB 双端脱敏/同步幂等）；`npm run build`（client）✅（bundle 2.48MB，chunk 警告留 Phase 7）
- **审查结论**：Review Agent 独立审查首轮 **REQUEST_CHANGES**（2 Blocking 均为文档侧：B1 §3.2.2 响应多写 `updated` 字段、B2 fixture 路径误写 `external-source.ts`），当场修复后复审 **APPROVE**。9 项 Non-blocking 留后续迭代：OpenRouter 死三元、错误消息内部细节、buildContext 钩子注释、同步并发唯一约束、章级 STALE 恢复对称性、流式中禁用课程/模式切换、ConfigPanel 保存失败提示、chunk 拆分、e2e 命令勘误（正确入口 `npm run test:e2e`）
- **Git**：`feature/phase4-knowledge-ui` 推送；PR #4 建立并代合入 main
- **环境待办（用户侧）**：`server/.env` 的 `OPENROUTER_API_KEY=` 留空待填真实 key；`AI_CONFIG_ENCRYPTION_KEY` 已随机生成写入；后端进程此前被终止，需 `cd server; npm run start:dev` 重启后手动冒烟（前端 `cd client; npm run dev`，http://localhost:5173）
- **下一步**：用户手动冒烟 Phase 4/5/6（Knowledge UI、同步 5 场景、AI Tutor 对话/配置）→ 反馈问题修复 → Phase 7（微调、完整认证、Non-blocking 项收口、§12 剩余事项）

---

## 2026-10-14 ｜ Phase 3 完成：Knowledge System 后端

- **任务**：开发文档 §7 Phase 3（Course/Lesson/Page CRUD、Release/Publish、Sync Mock、接口鉴权基础版，共 §5.1 全部 18 端点）
- **前置核验**：用户要求独立复核 Phase 1/2 完成情况——git 历史（PR #1/#2 均合入）、prisma validate、build、10 单测 + e2e、数据库 8 表 + `_CourseToUser` + 迁移 + seed 2 行、client build（antd 5.x）全部通过，确认无误后开工
- **用户拍板**：① 鉴权=**仅预留骨架**（`ApiKeyGuard` 全局注册，`AUTH_ENABLED` 默认 false 不拦截；开启后校验 `X-API-Key == AUTH_TOKEN`，不符 401；完整认证 Phase 7 定，对应 §12 事项 #1）② 删除保护=**Course 存在 Release 历史时拒删 409 CONFLICT**（级联仅 Lesson/Page）
- **变更清单**（均在 server/，除文档）：
  - 新增 `src/courses|lessons|pages|releases|sync` 五模块：18 端点 + class-validator DTO（Create/Update/Reorder）；sortOrder 缺省自动追加末尾；Release 快照 versionTag=`CourseName_YYYYMMDDHHmmss`、snapshotData 全量固化、历史列表 select 排除 snapshotData；Sync 两端点返回 Mock 假数据
  - 新增 `src/common/app-setup.ts`：全局 `/api` 前缀 + ValidationPipe(whitelist/transform)，main.ts 与 e2e 共用
  - 新增 `src/common/guards/api-key.guard.ts`：鉴权骨架（口径见上）；`.env.example` 补 AUTH_ENABLED/AUTH_TOKEN 占位
  - 依赖：新增 class-validator/class-transformer；**@nestjs/mapped-types 锁 2.1.1**（npm latest 12.0.0 为 ESM-only，jest CJS 管线不兼容，实测后降级；2.0.6 因 peer 仅支持 Nest≤10 不可用）
  - 设计文档同步：§5.1.1 删除保护注记、§7 Phase 3 鉴权口径注记、§12 事项 #1 拍板落文
  - 测试：新增 3 单测套件（courses 删除保护/404、releases 快照结构/versionTag、guard 开关语义）+ `test/knowledge.e2e-spec.ts` 全流程 22 用例（真实库自建自清，E2E- 前缀 afterAll 清理）
- **自测证据**：`npm run build` ✅；单测 6 套件 22 用例 ✅；e2e 2 套件 23 用例 ✅（含 400 校验、404 无泄露、409 删除保护、快照回放）；`node dist/main` 冒烟 GET /api/courses 返回 §5.3 信封 ✅
- **审查结论**：Review Agent 独立审查 **APPROVE，无 Blocking**。Non-blocking：#1（PUT /api/courses 缺 e2e）#5（^ 写法与"锁 2.1.1"口径不符）已当场修复（commit 475f683，e2e 增至 23 用例）；#2（删除三步非事务 TOCTOU）#3（token 非常数时间比较）#4（versionTag 本地时区）单用户本地部署可接受，**留待 Phase 7 完整认证时一并处理**
- **Git**：`feature/phase3-knowledge-api`（129d241 + 475f683）推送；PR #3 建立并代合入 main（679550f）：https://github.com/Crescent-MJ/KnowledgeSystem/pull/3
- **下一步**：Phase 4 Knowledge System 前端（MainLayout/CourseTree/PageEditor md-editor-v3+KaTeX/TagManager/PublishPanel/Sync 按钮，对接本轮 API；顺带清理 Phase 1 遗留 client 脚手架残留文件）

---

## 2026-10-14 ｜ Phase 2 完成：NestJS 后端基础

- **任务**：开发文档 §7 Phase 2（TS 编译环境、Prisma 客户端单例、统一响应格式中间件、错误处理中间件、环境变量配置）
- **用户拍板**：PR #1 由主智能体代合（已合入 main fc886ec）；§8「项目根目录 .env」措辞更正为 `server/.env`；Review Non-blocking 项修复授权
- **变更清单**（均在 server/，除文档）：
  - `tsconfig.json` 完整 `"strict": true`（上期延后项落实）；`tsconfig.build.json` exclude prisma（修复 start:prod 产物路径，上期遗留缺陷）
  - 新增 `src/prisma/`：PrismaService 单例（OnModuleInit/Destroy）+ @Global PrismaModule
  - 新增 `src/config/env.validation.ts` + `@nestjs/config ^4.0.4`（v12 ESM-only 与 Nest 11 CJS 不兼容，Review 核实成立）：isGlobal、缺 DATABASE_URL 启动即失败
  - 新增 `src/common/`：TransformInterceptor（§5.3 成功信封，SSE 豁免点注释）、AllExceptionsFilter（状态码/Prisma 错误映射，响应体无堆栈/SQL/路径）、api-response 接口
  - 更新 main.ts（PORT 经 ConfigService）、app.module.ts、e2e 断言信封；`.env.example` 补 PORT/NODE_ENV 占位
  - 开发文档 §8 措辞更正（server/.env）
- **自测证据**：`npm run build` ✅；单测 3 套件 10 用例 ✅；e2e 1 用例 ✅；GET / 返回 `{"success":true,"data":"Hello World!","error":null,"message":"操作成功"}`；GET 未知路由 404 信封无泄露；`node dist/main`（start:prod）冒烟 ✅（测后端口已释放）
- **审查结论**：Review Agent 独立审查 **APPROVE**（无 Blocking）。Non-blocking #1（start:prod）#3（envFilePath 注释）已修；#2（本日志条目）即本条；设计偏差 §8 措辞经用户批准更正
- **Git**：`feature/phase2-backend-base` 推送，PR #2 建立并代合入 main
- **下一步**：Phase 3 Knowledge System 后端（Course/Lesson/Page CRUD、Release/Publish、Sync Mock、基础鉴权）；开工前按 §12 确认用户认证口径

---

## 2026-10-14 ｜ Phase 1 完成：server/client 骨架与 PostgreSQL 环境

- **任务**：开发文档 §7 Phase 1（初始化 server/ 与 client/、配置 PostgreSQL、Prisma 建模与 Seed）
- **用户拍板**：后端 NestJS；状态管理 Zustand（全局）+ React Context（少量轻量配置）；PostgreSQL 本机安装、账号/密码均 admin；antd 由 6.6.6 降级 5.x；§2 Schema 双向关系修正 1/2a/3 批准回填（User↔Course 多对多方案 a）；Prisma 实装锁 6.x
- **变更清单**：
  - 新增 `server/`：NestJS 11 + Prisma 6.19.3，schema 按 §2 建 8 表，迁移 `20261014083707_init`，幂等 seed（lecture-default / socratic-default），`.env.example` 占位符
  - 新增 `client/`：Vite + React 19 + TS + Ant Design 5.x + Zustand 最小骨架（ConfigProvider zhCN + 占位标题；stores/api 空目录占位）
  - 修改 `docs/Learning_Guide_BackOffice_Agent_Development_Document.md`：版本信息表/Phase 2/§6.2 拍板落文；§2 Schema 双向关系回填 + Prisma 6.x 注记；联接表名事实更正 `_CourseToUser`
  - 修改 `README.md`（技术栈表 + 启动说明）、`agents/dev-agent.md`（技术约束同步）
- **自测证据**：空库迁移成功；seed 执行两次仍 2 行（幂等）；:3000 与 :5173 均 HTTP 200（测后关闭）；`prisma validate` + 双端 build 通过
- **审查结论**：Review Agent 独立审查 **APPROVE**（无 Blocking）。Non-blocking 处理：联接表名更正、README 回填已修；延后：tsconfig 完整 strict（Phase 2 动工前补）、client 脚手架残留清理（Phase 4）、统一响应格式（Phase 2）
- **Git**：`feature/phase1-init`（05482a3）已推送；PR #1 已建（https://github.com/Crescent-MJ/KnowledgeSystem/pull/1）
- **下一步**：Phase 2 后端基础（Prisma 单例、统一响应格式中间件、错误处理中间件、环境变量配置、tsconfig strict）

---

## 2026-10-14 ｜ 重大决策：项目推倒重来，开发基准切换为 Learning Guide BackOffice

- **任务**：KnowledgeSystem 仓库大更新——废弃旧 AI Tutor 运行时路线，转向 Learning Guide BackOffice（结构化课程知识库管理系统）
- **用户拍板**：① 全程依照 `docs/Learning_Guide_BackOffice_Agent_Development_Document.md`；② 旧文档 `AI_Tutor_Runtime_Design_Spec.md`、`Development_Plan.md` 删除；③ Docker 板块仅删相关内容（§11.2 示例、§11.1 容器化行、Phase 7 部署条目，保留 PostgreSQL/Nginx/PM2）；④ 后端 Node.js、框架待定（后于 Phase 1 拍板 NestJS）；⑤ 目录结构 server/ + client/（不采用 Monorepo）；⑥ 所有方案性建议须经用户同意
- **变更清单**：删除 2 个旧设计文档；开发文档移除 Docker + Phase 1 目录拍板落文；重写 `agents/dev-agent.md`、`agents/review-agent.md`、`.trae/rules/project_rules.md`（新增「用户裁决优先」「变更同步纪律」）、`README.md`；.gitignore 补 .env/node_modules 防护
- **验证**：grep 确认无 Docker/Monorepo 残留；仓库最终 6 文件
- **Git**：main 提交 `0a76321` 已推送（直连被重置，走代理 127.0.0.1:18081 成功）
- **下一步**：Phase 1（已完成，见上条）

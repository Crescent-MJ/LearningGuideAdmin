# AI 协作日志（Learning Guide BackOffice）

> 规范（2026-10-14 用户确立）：每完成一个 Phase 或做出重大决策，必须将【AI协作日志】落盘本文档。
> 新条目追加在最前（倒序）。条目字段：日期 / 任务 / 用户拍板 / 变更清单 / 自测证据 / 审查结论 / Git / 下一步。

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

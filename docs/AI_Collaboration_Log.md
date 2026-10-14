# AI 协作日志（Learning Guide BackOffice）

> 规范（2026-10-14 用户确立）：每完成一个 Phase 或做出重大决策，必须将【AI协作日志】落盘本文档。
> 新条目追加在最前（倒序）。条目字段：日期 / 任务 / 用户拍板 / 变更清单 / 自测证据 / 审查结论 / Git / 下一步。

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

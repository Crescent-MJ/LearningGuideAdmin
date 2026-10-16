# AI 协作日志（Learning Guide BackOffice）

> 规范（2026-10-14 用户确立）：每完成一个 Phase 或做出重大决策，必须将【AI协作日志】落盘本文档。
> 新条目追加在最前（倒序）。条目字段：日期 / 任务 / 用户拍板 / 变更清单 / 自测证据 / 审查结论 / Git / 下一步。

---

## 2026-10-15 ｜ 细节调整第六轮：AI Tutor 布局改版对齐设计稿 + 版本号去秒

- **任务**：用户提供 AI Tutor 设计稿，要求按设计调整 AI Tutor 板块内容（不动 Knowledge/顶部/左侧导航）：① 顶部栏显示课程标题 + Change Course 下拉 ② 左侧配置重排为 System Prompt → Welcome Message → LLM Model，底部 Reset 链接 + Unsaved changes 提示 + Save Configuration ③ 对话头部显示激活版本号 + Testing 徽章（固定）④ 输入框占位符 "Ask the tutor a question..."、Send 按钮。另：用户发现版本号含秒，确认改为 `YYYYMMDDHHmm`（去秒）
- **用户拍板**：
  - 版本号格式去秒：`YYYYMMDDHHmm`（原 `YYYYMMDDHHmmss`）
  - Testing 徽章固定显示（表示 AI 测试用知识库版本）
  - Change Course 从左侧配置面板移到顶部全宽栏
- **变更清单**：
  - **后端**：
    - `releases.service.ts`：`timestamp()` 去掉 `getSeconds()`，输出 12 位；注释同步
    - `ai-config.service.ts`：`AiConfigView` 增加 `currentReleaseTag`；`ensureCourse` 返回 `{id, currentReleaseId}`；`toView` 改 async 查询激活 Release.versionTag；getConfig/saveConfig/resetConfig 三处调用加 await + 传 currentReleaseId
    - `releases.service.spec.ts`：正则 `\d{14}`→`\d{12}`；mock 数据 versionTag 同步 12 位
  - **前端**：
    - `api/ai.ts`：`AiConfigView` 增加 `currentReleaseTag: string | null`
    - `stores/aiStore.ts`：增加 `initialForm` 快照 + `isDirty()` 方法；selectCourse/setMode/save/reset 四处维护 initialForm 确保模式切换不误报 dirty
    - `pages/AITutor.tsx`：新增顶部栏（课程标题 + Change Course 下拉），主体改为 column flex
    - `components/ai/ConfigPanel.tsx`：移除 Change Course；重排 System Prompt(rows=8,等宽字体) → Welcome Message → LLM Model；底部三栏（Reset 链接 / Unsaved changes / Save Configuration）
    - `components/ai/ChatWindow.tsx`：头部三栏（版本号+Testing 徽章 / Lecture-Socratic / New Chat）；占位符 "Ask the tutor a question..."；按钮 "Send"
  - **文档**：§2/§3.4.1/§3.4.3 版本号去秒；§4.1/§4.2/§4.3 布局改版（§4.3.1 对话头部新增）；§5.2 接口说明加 currentReleaseTag；§4.3.3→§4.3.4 编号修正
  - **其他**：`schema.prisma` versionTag 注释去秒；`review-agent.md` 审查标准版本号格式同步
- **自测证据**：前端 `npx tsc --noEmit` 0 错；后端 `npx tsc --noEmit` 0 错；后端 `npm test` 9 suites / 35 tests 全绿
- **审查结论**：Review Agent 独立审查 **APPROVE，0 Blocking**。3 项 Non-blocking：① schema.prisma versionTag 注释漂移（**已修**）② review-agent.md 格式未同步（**已修**）③ AI 协作日志（本条补）
- **Git**：本地 main 攒批未推送
- **下一步**：用户重启后端（使 currentReleaseTag 生效）+ 前端冒烟验证：顶部栏课程标题/Change Course、配置面板重排与 Unsaved changes 提示、对话头部版本号+Testing 徽章、新版本发布的 versionTag 是否为 12 位（去秒）

---

## 2026-10-15 ｜ 细节调整第五轮：AI Tutor 模型清单扩展 + 布局错位修复 + API Key 课程级覆盖下线

- **任务**：用户针对 AI Tutor 板块提 3 点：① 读取 OpenRouter 可行模型并扩充 LLM Model 下拉（仅热门+免费额度，挑 8 个，必须含 deepseek flash 作测试）② AI Tutor 配置面板位置错位（应在 Knowledge/AI Tutor 导航栏右侧而非下方）③ 移除 API Key 课程级覆盖输入块（已配全局 OPENROUTER_API_KEY）
- **用户拍板**：
  - ① 8 模型清单：`deepseek/deepseek-v4.1-flash`（默认，测试用）、`deepseek/deepseek-r1`、`openai/gpt-4o-mini`、`anthropic/claude-haiku-5.5`、`google/gemini-3.5-flash`、`qwen/qwen3.6-flash`、`google/gemma-4-31b-it:free`、`nvidia/nemotron-3-super-120b-a12b:free`；所选模型即该课程对话用模型（测试+学生端）
  - ② 布局修复方案：`MainLayout` 内层 `<Layout>` 加 `style={{ flexDirection: 'row' }}`（AntD Layout 无 Sider 时默认 column，导致 ModuleNav 与 Content 垂直堆叠）
  - ③ 仅移除前端 UI，保留后端 `CourseAiConfig.apiKey` 字段与加密逻辑（最小改动、未来可恢复）
  - 新增通用规则：「有问题先提问，跟用户沟通确认后再下决定」→ 写入 `.trae/rules/project_rules.md`
- **变更清单**：
  - `server/.env` + `server/.env.example`：`AI_AVAILABLE_MODELS` 扩充为 8 模型，deepseek-v4.1-flash 居首（后端 `defaultModel()` 取列表第一个）
  - `client/src/components/layout/MainLayout.tsx`：内层 Layout 加 `flexDirection: 'row'`
  - `client/src/components/ai/ConfigPanel.tsx`：移除 API Key Form.Item（含清除按钮）+ Tag import，更新顶部注释
  - `client/src/stores/aiStore.ts`：AiForm 移除 `apiKeyInput`/`clearApiKey`；save/reset/selectCourse 中相关逻辑清理
  - `client/src/api/ai.ts`：saveConfig 入参类型移除 `apiKey?`
  - 设计文档 §4.2.3（默认模型/用途/API Key 下线说明）+ §8 env 示例同步 8 模型
  - `.trae/rules/project_rules.md`：「用户裁决优先」节新增第 3 条规则
- **自测证据**：前端 `npx tsc --noEmit` 0 错；后端 `npx tsc --noEmit` 0 错；后端 `npm test` 9 suites / 35 tests 全绿
- **审查结论**：Review Agent 独立审查 **APPROVE，0 Blocking**。2 项 Non-blocking：① 文档 §8 示例漂移（**已当场修**：同步为 8 模型）② 前端 `hasApiKey` 字段无组件消费（保留，后端仍返回、留作未来 UI 提示）
- **Git**：本地 main 攒批未推送（与 bf4ef55 等一起，待用户冒烟后统一推分支/PR）
- **下一步**：用户重启后端（使新 AI_AVAILABLE_MODELS 生效）+ 前端冒烟验证：① LLM Model 下拉是否显示 8 个模型、默认是否为 deepseek-v4.1-flash ② AI Tutor 配置面板是否在导航栏右侧横向排列 ③ API Key 块是否已移除、Save 是否正常

---

## 2026-10-15 ｜ 细节调整第四轮：Markdown 编辑器改 BlockNote 块编辑器（§3.3.2）

- **任务**：§3.3.2 编辑器选型由 `@uiw/react-md-editor` 全文编辑改为 **BlockNote**（用户拍板 Notion/Jupyter 式）；存储不变（`Page.contentMd` 唯一事实来源，`blocksToMarkdownLossy` 序列化），源码模式保留兜底
- **用户拍板**：输入=源码快捷语法、失焦/切块自动保存渲染；拖拽重排启用；模式切换按钮放 Tags 左侧；右键菜单插入块 + 选中浮窗；图片本轮仅外链 URL
- **实现要点**：
  - 依赖：`@blocknote/react@0.56.0` + `@blocknote/math-block@0.56.0` + `@blocknote/core@0.56.0`（注意：`BlockNoteView` 实际导出名是 `BlockNoteViewRaw`；数学包是 `@blocknote/math-block` 而非不存在的 `@blocknote/math`）
  - Schema：`BlockNoteSchema.create` 扩展 `mathBlock` 块 + `math` 行内内容；`SuggestionMenuController` 注入默认 + `getMathSlashMenuItems`
  - 数据往返：`tryParseMarkdownToBlocks` 加载 / `blocksToMarkdownLossy` 保存；`lastLoadedMd` ref 防源码↔块模式切换数据丢失；`loadingRef` + rAF 屏蔽加载期 onChange
  - 右键插入：AntD `Dropdown` trigger contextMenu + `getTextCursorPosition` + `insertBlocks(after)`；标题映射 `heading1/2/3 → heading + props.level`
  - 选中浮窗：BlockNote 原生 `formattingToolbar`（粗体/斜体/下划线/删除线/行内代码/链接/高亮）
  - 图片：`uploadFile` prompt 索取外链 URL，slash 菜单与右键入口一致
- **已知限制（下轮补）**：选中浮窗「转公式」按钮未实现（需 ProseMirror 级选区替换为 math 行内内容）；当前可通过 `$…$` 语法或 `/` 斜杠菜单插入公式
- **自测证据**：client `tsc -b` 0 错、`vite build` 成功（chunk 3.6MB 为 BlockNote+KaTeX 体积，正常）；后端单测 35/35、e2e 44/44（无变更）
- **审查结论**：首轮 REQUEST_CHANGES（2 Blocking：标题块类型 heading1/2/3 错误、源码→块模式数据丢失）+ 6 Non-blocking；修复后复审 **APPROVE（0 Blocking）**。Non-blocking 中 5 项已修（双重防抖、降级提示、加载期屏蔽保存、空结果降级、图片双轨），N2 转公式按钮留作已知限制
- **Git**：用户拍板本地提交 main 攒批（与 c5958b5/0be4959/e89ff21 一起，冒烟反馈修完后统一推分支/PR）
- **下一步**：用户重启前端冒烟（块编辑/数学/拖拽/右键/模式切换/上传 md 自动加载）→ 反馈修复；N2 转公式按钮下轮补全

---

## 2026-10-15 ｜ 细节调整第三轮：树格式修正 + 上传改两步弹窗（Upload and Parse）+ 编辑器块化拍板 BlockNote 方向

- **任务**：用户手动冒烟第二轮后反馈 3 点：① 课程名应顶栏最左（`visibility:hidden` 仍占位留白）、图标与标题换行错位需修 ② 上传按设计稿改两步弹窗（选文件→转换预览→Import 建页）③ md 编辑器块化（Notion/Jupyter 式）——第 ③ 点仅讨论拍方向，不动代码
- **用户拍板**：
  - ① 方案经确认执行：树 `display:none` 去占位+行内自绘图标+indent 16px；接口拆为 `POST /api/files/convert`（仅转换返回 `{title, markdown}` 不建页），Import 复用 §5.1.3 建页；弹窗文案按实际白名单 8 格式（设计稿中 xls/doc/epub/ppt 不支持）；预览区显示原始 md 文本（与设计稿一致）
  - ③ 编辑器块化技术路线=**BlockNote**（用户调研建议+我方案对齐确认）：存储仍 `contentMd` 单一事实来源（`tryParseMarkdownToBlocks` 加载 / `blocksToMarkdownLossy` 保存，不动表结构）；保留「源码模式」兜底防 fidelity 损失；图片上传端点为待设计项。本轮无代码
- **变更清单**：
  - **设计文档先行同步**：§3.2.1（display:none+行内图标+16px indent）、§3.2.3 重写两步弹窗流程、§5.1.6（upload→convert、原端点废弃注记）、§10.2 流程 7 步、§8 env 示例白名单笔误修正（Review 设计偏差上报项）
  - **后端**：`files.service.ts` `uploadAndCreatePage`→`convertFile`（去 PagesService 依赖，白名单/15MB/空结果/busboy latin1 乱码修复全保留）；`files.controller.ts` `POST /files/convert`（无 lessonId）；`files.module.ts` 去 PagesModule import；`pages.module.ts` 回退 exports；删 `dto/upload-file.dto.ts`；spec 5 用例、e2e 6 用例改写（含 convert 不建页计数断言 + 两步完整流程落库校验）
  - **前端**：`api/knowledge.ts`（uploadFile→convertFile+ConvertedDocument）；`knowledgeStore.ts`（uploadDocument→importDocument）；新组件 `UploadDocumentModal.tsx`（Dragger 预校验→Next 转换→预览→Import；代际号防关闭竞态）；`CourseTree.tsx`（去 showIcon/隐藏 input，行内图标+标题 ellipsis，菜单项开弹窗）；`index.css`（switcher display:none、indent-unit 16px）
- **自测证据**：server `tsc --noEmit` 0 错、client `tsc -b` 0 错；单测 9 套件 **35/35**；e2e 4 套件 **44/44**（files e2e 6 用例：convert 返回不建页、两步流程建页落库、.exe 400、无 file 400、15MB+1→400、信封脱敏）。冒烟由用户手动执行
- **审查结论**：Review Agent 独立审查 **APPROVE，0 Blocking**。6 项 Non-blocking：#1 转换中关闭弹窗竞态（**已当场修**：genRef 代际号丢弃 in-flight 结果）、#2 onRemove 死代码（**已当场修**：删除）、#3 步骤②无返回按钮（UX 备忘）、#4 本日志（已补）、#5 convert 无速率限制（沿用遗留，§9.4 口径待用户裁决）；另 §8 白名单笔误（设计偏差上报）**已回填**
- **Git**：用户拍板本地提交 main 攒批（与 c5958b5/0be4959 一起，冒烟反馈修完后统一推分支/PR）
- **下一步**：用户重启前后端手动冒烟（树对齐、两步弹窗上传真实 docx/pdf、Import 建页）→ 反馈修复；第 ③ 点出 BlockNote 详细设计稿（交互细节+md fidelity 映射表+图片上传方案）供拍板

---

## 2026-10-15 ｜ 细节调整第二轮：Knowledge 左侧面板（目标过滤 + 去锁 + 点击展开 + 文档上传）

- **任务**：用户附截图反馈 Knowledge 面板 4 点调整：① 课程树按同步目标过滤（选 Calculus Fundamentals 只显示其 lessons，不混显 Population Growth）② 移除同步目标上锁/解锁功能 ③ 点击课程名下拉 lessons、隐藏原生箭头并另设提示 ④ 实现此前未落地的文档上传功能
- **用户拍板**：
  - ① 转换引擎=**markitdown-ts 本地转换**（内存 Buffer 直转、不落盘、不调外部服务；§12 事项 #3 落文）
  - ② 上传落地=**指定 Lesson 下新建 Page**，标题=文件名去扩展名，新页 syncState=SYNCED
  - ③ 切换同步目标=先 flushSave 再清空编辑器，之后恢复该课程**上次编辑页**（lastPageIdByCourse 记忆）
  - ④ 白名单按 markitdown-ts 实测支持面调整：**.txt/.md/.csv/.pdf/.docx/.xlsx/.html/.xml**（xls/doc/ppt/epub 不支持，原 §10.1 清单勘误）
  - ⑤ 展开提示方案=CSS 隐藏 `.ant-tree-switcher` + 行尾 chevron（收起▸/展开▾旋转）
- **变更清单**：
  - **设计文档先行同步**：§3.2.1（树过滤+隐藏箭头+chevron）、§3.2.2（无锁常驻下拉+flushSave+上次编辑页）、**新增 §3.2.3**（上传流程：预校验→multipart file+lessonId→白名单/15MB 二次校验→本地转换→建页）、§5.1.6（POST /api/files/upload）、§10.1/10.2/10.3、§12 #3 拍板落文
  - **后端**：新增 `src/files/`（module/controller/service/dto）——FileInterceptor memoryStorage + `limits:{fileSize:15MB, files:1}`；`markitdown.convertBuffer(buffer,{file_extension:'.docx'})`（**扩展名必须带点**，实测教训）；复用 PagesService 建页（pages.module 加 exports）；转换失败原始错误仅 logger.warn 不外泄；`fixFilenameEncoding` 修复 busboy 按 latin1 解析 multipart 中文文件名乱码；`all-exceptions.filter.ts` 增 413→400 映射（Nest `transformException` 先把全部 MulterError 转 PayloadTooLargeException，原 MulterError 分支为死代码已删，Review 核实成立）；app.module 注册 FilesModule
  - **前端**：`api/knowledge.ts`（uploadFile FormData 封装 timeout 60s、白名单/上限常量与后端逐字一致）；`knowledgeStore.ts`（删 externalLocked/unlockExternal 全仓无残留、selectExternal 改 async、lastPageIdByCourse、uploadDocument 动作）；`Sidebar.tsx`（锁卡片 UI 移除、常驻 Select）；`CourseTree.tsx`（visibleCourseId 过滤、行点击 toggleRow 展开、chevron、Lesson 菜单「上传文档建页」+前端预校验、双分支空态）；`SyncButtons.tsx` 去锁依赖；`index.css` 加 `.course-tree-no-switcher`
  - **依赖**：server +`markitdown-ts`、+`@types/multer`（devDep）
- **自测证据**：server `tsc --noEmit` 0 错误、client `tsc -b` 0 错误；单测 9 套件 **35/35**（新增 files 5 用例：md 真实转换建页、.exe/.epub 400、空 buffer/无扩展名 400、转换结果空 400、latin1 乱码文件名还原）；e2e 4 套件 **46/46**（新增 files 8 用例：md 上传 201+落库校验、.exe 400、缺 lessonId 400、非法 UUID 400、lesson 不存在 404、无 file 字段 400、15MB+1→400「文件大小超过 15MB 限制」、错误信封不泄露堆栈）；开发前真实样本实测：docx 6799 字符、pdf 1567 字符转换成功。冒烟按口径由用户手动执行
- **审查结论**：Review Agent 独立审查（新上下文）首轮即 **APPROVE，0 Blocking**。9 项 Non-blocking 留档：#1 selectExternal 在 flushSave 失败时仍清空草稿（网络异常可静默丢草稿）、#2 快速连续切换目标竞态（await 后未复查当前目标）、#3 toggleRow 在 setState updater 内调 store 副作用（StrictMode 双调用抖动）、#4 上传端点无速率限制（§9.4 泛化要求，口径需用户裁决）、#5 413→400 映射全局生效（当前仅 files 端点产生 413，无实际影响）、#6 过滤器 413 分支无直接单测（e2e 已覆盖端到端）、#7 无扩展名文件前端预校验提示文案（"Makefile"→提示「格式暂不支持：e」）、#8 §3.2.1 chevron 措辞仅提课程行（实现同样用于章节行，下轮文档回填顺带补）、#9 本日志条目（已补）
- **Git**：用户拍板不建分支，本地提交 main（与上轮 c5958b5 攒批，未推送；冒烟反馈修完后统一推分支/PR）
- **下一步**：用户重启后端手动冒烟四项（切换目标树过滤、点击展开交互、真实 docx/pdf 上传建页、去锁后同步按钮行为）→ 反馈修复 → 攒批推送分支

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
- **Git**：用户拍板不建分支，本地提交 main `c5958b5`（ahead 1，未推送；后续攒调整一起推）
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

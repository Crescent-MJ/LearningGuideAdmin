# AI 协作日志（Learning Guide BackOffice）

> 规范（2026-10-14 用户确立）：每完成一个 Phase 或做出重大决策，必须将【AI协作日志】落盘本文档。
> 新条目追加在最前（倒序）。条目字段：日期 / 任务 / 用户拍板 / 变更清单 / 自测证据 / 审查结论 / Git / 下一步。

---

## 2026-10-19 ｜ 内容面板样式统一（Knowledge Pages / Releases / AI Tutor 三区对齐 Figma）

- **任务**：用户要求结合 Figma 设计缓存（`figma/tools/design-cache/YL-KS+AI_UIIFinal-20261019-105235`）中的「1 knowledge」与「2 Ai tutor 配置」，将 Knowledge 与 AI Tutor 的**页面内容框格式统一**，**不增删内容，仅做内容框外观设计**。
- **用户裁决**（AskUserQuestion）：① 统一口径 = **完全按 Figma**（主面板 白/圆角12/无边框/卡片阴影；子块圆角8；输入类 1px #E2E8F0 + 底 #FAFBFC）；② 覆盖范围 = **三个内容区全统一**（Knowledge Pages、Knowledge Releases、AI Tutor 两面板）。
- **Figma 规格提炼**（经子代理读取 3.8MB 导出 JSON）：主面板 `#FFFFFF` / 圆角 `12` / 无边框 / 阴影 `0 1px 2px -1px rgba(0,0,0,.1), 0 1px 3px rgba(0,0,0,.1)`；子块圆角 `8`；输入类 `1px #E2E8F0` + 底色 `#FAFBFC`；标签药丸圆角 `999`；页面底色 `#F7FAFC`。两内容页容器材质一致，尺寸因布局不同。
- **变更清单**：
  - **设计文档**（先改后实现）：§3.1 新增注记「2026-10-19 内容面板样式统一（对齐 Figma 1 Knowledge / 2 AI Tutor）」，含主面板 / 子块 / 输入类三段规格；并修复被覆盖的「2026-10-16 扁平化改拍」行
  - **新增 `ui/Panel.tsx`**：内容面板统一外壳——`background: bg.container`(白) / `borderRadius: radius.lg`(12) / `border:none` / `boxShadow: shadow.card`，`padding` 默认 `spacing.lg`(16)（可传 0 关闭）
  - **`ui/index.ts`**：导出 `Panel` / `PanelProps`
  - **`ui/Card.tsx`**：默认 `variant="borderless"` + `boxShadow: tokens.shadow.card`（圆角 12 由主题 `borderRadiusLG` 提供）——使 AI Tutor 使用 Card 的两面板自动与 Knowledge 的 `Panel` 外观统一
  - **`theme/tokens.ts`**：新增输入语义色 `color.inputBorder`(`#E2E8F0`) / `color.inputBg`(`#FAFBFC`)
  - **`App.tsx`**：ConfigProvider 主题新增 `borderRadiusLG: tokens.radius.lg`(12)，并新增 `components.Input` / `components.Select` 覆盖——描边 `#E2E8F0`、底色 `#FAFBFC`（落实口径「输入类 1px #E2E8F0 + 底 #FAFBFC」）
  - **`knowledge/PageEditor.tsx`**：根节点 `<div>` → `<Panel style={{display:'flex',flexDirection:'column'}}>`（新导入 Panel）；正文内框圆角 `radius.sm`(6) → `radius.md`(8) 对齐 Figma 子块；**空状态修正**——未选中页面时原提前 `return <Empty style={{marginTop:120}}>` 裸渲染（无面板），现补齐套 `Panel` 并居中（`alignItems/justifyContent:center`），使内容区**任何状态**都显示白面板
  - **`knowledge/PublishPanel.tsx`**：根节点 `<div>` → `<Panel style={{overflow:'auto'}}>`（新导入 Panel）
  - AI Tutor `ConfigPanel.tsx` / `ChatWindow.tsx`：**无需改动**（依赖 `ui/Card` borderless+shadow、主题圆角 12 与输入类 components 覆盖自动生效）
  - **左侧课程树列卡片化（用户追加）**：`layout/MainLayout.tsx` 的 `Sider` 去掉右边框、底色改页面灰底 `bg.layout`、加内边距 `spacing.lg`（与 Content 对称）；`layout/Sidebar.tsx` 根节点 `<div>`（原 `padding: spacing.md`）→ `<Panel style={{display:'flex',flexDirection:'column'}}>`（新导入 Panel），使「同步目标 / 课程树 / Sync 按钮」整列在灰底上悬浮为白色圆角卡片
- **自测证据**：前端 `npx tsc --noEmit` 0 错误；`npm run build`（tsc -b && vite build）✓ built in 1.12s。冒烟按口径由用户手动执行
- **审查结论**：Review Agent（独立新上下文）首轮 **REQUEST_CHANGES**（1 Blocking：口径「输入类 1px #E2E8F0 + 底 #FAFBFC」未落地）→ 已补 `tokens.color.inputBorder/inputBg` + 主题 `components.Input/Select` 覆盖并回填 §3.1 → 复审 **APPROVE**（0 Blocking，3 Non-blocking）。**追加**：用户反馈「未选中页面时内容区无变化」——定位为 PageEditor 空状态裸 `<Empty>` 未套 Panel，已补套 `Panel` 并居中，属既定「三区统一白面板」范围内的遗漏补齐；范围经用户裁决为**仅统一内容区白面板、底色保持 `#F8FAFC`**（不做布局重构）→ 该增量复审 **APPROVE**（无 Blocking；已核验父链高度确定使 `Panel height:100%` 正常解析、Empty 居中无横向溢出、无越界）。**再追加**：用户指出左侧「同步课程」列未做卡片形式 → 已把 `Sider` 去右边框 / 改灰底 / 加内边距、`Sidebar` 根节点改 `Panel`，卡片化并与右侧内容面板对称统一 → 增量复审 **APPROVE**（无 Blocking，3 Non-blocking：① `MainLayout` JSDoc 描述过时——**已当场修**（改为「内容区与课程树列为灰底上的白色圆角卡片」）；② `overflow: visible` 稳健性提示；③ 卡片内边距使树区可用宽度 276→236，与右侧对称、符合 §3.1）
- **Git**：本地未提交（攒批，等待用户指令再推送）
- **下一步**：用户手动冒烟外观（Knowledge Pages 空/满、左侧课程树列卡片、Releases、AI Tutor 配置与对话）

---

## 2026-10-19 ｜ 左侧树搜索扩展（匹配标题+Heading）并修复无结果空白 bug

- **任务**（用户反馈）：① Bug——搜索无匹配结果时下方 md 文件全部消失（整树空白，无提示）；② 需求——搜索除 Page 标题外，还应匹配全部 Heading 以定位（左栏本就列出所有 heading）。
- **用户裁决**（AskUserQuestion）：① 无结果时→**显示「无匹配结果」空态提示**；② 命中展示→**标题命中显示该页全部 Heading，仅 Heading 命中则只显示匹配的 Heading**；③ 匹配范围→**仅 Page 标题 + Heading，不含正文**。
- **根因**：原实现 [CourseTree.tsx:139](file:///c:/Users/Jackcao/Desktop/晓秒科技公司文档/KnowledgeSystem/client/src/components/knowledge/CourseTree.tsx) 在无匹配时 Course 节点返回 `null`，`treeData` 变空 → 整片空白且无空态提示。
- **变更清单**：
  - **设计文档**（先改后实现）：§3.2.1 搜索条描述更新为「匹配 Page 标题 + 全部 Heading（H1-H6）；标题命中→显示该页全部 Heading、仅 Heading 命中→只显示匹配 Heading；无结果时显示空态提示」
  - **前端 `CourseTree.tsx`**：`treeData` 内 Page 过滤逻辑改为 `flatMap`——`titleMatch` 或 `visibleHeadings.length>0` 才纳入；`visibleHeadings = !kw ? 全部 : titleMatch ? 全部 : 仅匹配 heading`；新增无结果分支：`kw && treeData.length===0` 时渲染 `<Empty>无匹配结果</Empty>` 替代 `<Tree>`（关键字清空后自动恢复全部 md 文件）
  - **前端 `SearchBox.tsx`**：placeholder「搜索页面标题…」→「搜索标题或 heading…」，注释同步
- **自测证据**：前端 `npx tsc --noEmit` 0 错误；`npm run build`（tsc -b && vite build）✓ built in 1.06s
- **审查结论**：Review Agent（独立新上下文）**APPROVE**（0 Blocking，3 Non-blocking）：① `parseHeadings` 逐行正则不识别代码围栏，代码块内 `# 注释` 可能被当作 heading 误匹配（**既有解析器局限**，非本次引入）；② heading 节点 key 为 `course:page:level:text`，同页同层级同名 heading 会重复 key（罕见，与既有 slug 碰撞问题同源）；③ 空态条件 `kw && treeData.length===0` 在搜索瞬间详情未加载时也会落入（窗口极短，非阻塞）。评审实测：client tsc 0 错 / build ✓；四项口径逐条核对一致
- **Git**：本地未提交（攒批，等待用户指令再推送）
- **下一步**：用户手动冒烟（无结果提示 / 标题命中显示全 heading / 仅 heading 命中只显示匹配项 / 点击 heading 定位）

---

## 2026-10-19 ｜ .doc/.xls 扩充复审后收尾（.xls 魔数校验 + §10.2 陈旧引用修正）

- **任务**：处理上一条目 Review 提出的 3 项 Non-blocking 裁决结果并收尾。
- **用户裁决**（AskUserQuestion）：① `xlsx@0.18.5` CVE → **保持现状（接受风险）**（既有风险，markitdown-ts 早已依赖；npm registry 无更高版本）；② `.xls` → **加魔数校验**；③ 设计文档 §10.2 → **一并修正陈旧引用**。
- **变更清单**：
  - **后端 `files.service.ts`**：`convertFile` 在大小校验后新增 `.xls` 内容签名校验——非 OLE/BIFF 直接 `BadRequestException('文件内容不是有效的 .xls 格式（请确认文件类型）')`；新增私有方法 `isLegacyXls`（匹配 OLE 复合文档头 `D0 CF 11 E0 A1 B1 1A E1`，或裸 BIFF BOF 小端首字节 `0x09`），避免 SheetJS 对被改扩展名的纯文本宽松解析产出垃圾表格
  - **设计文档 §10.2**：步骤 2 交叉引用 `§5.1.6` → `§5.1.5`；步骤 7「经 §5.1.3 页面创建接口在指定 Lesson 下新建 Page」→「经 §5.1.2 …在指定 Course 下新建 Page（2026-10-16 扁平化后无 Lesson 层，Page 直接挂 Course）」
  - **测试**：`files.service.spec.ts` 新增 1 条（伪装 .xls 纯文本应 reject 且消息含「不是有效的 .xls」，并验证 `.md` 不走该分支）；`files.e2e-spec.ts` 新增 1 条（POST /api/files/convert 上传 fake.xls 应 400 且含同文案）
  - xlsx CVE：按用户裁决**不改动**（保留现状）
- **自测证据**：
  - 后端 `npx tsc --noEmit` 0 错误；`npm test` **52/52 PASS**；`npm run test:e2e` **58/58 PASS**
  - 前端 `npx tsc --noEmit` 0 错误；`npm run build`（tsc -b && vite build）✓ built in 1.05s
- **审查结论**：Review Agent（独立新上下文）**APPROVE**（0 Blocking，7 Non-blocking）：全部非阻塞项无新增风险——① `.xls` 裸 BIFF 第二字节判定 `<=0x08` 略宽，可收敛为版本白名单（影响极小，SheetJS 解析兜底）；② `.doc` 无显式魔数校验（符合本次「仅 .xls 加」裁决，口径可后续统一）；③ 表格仅转义 `|`/换行，其余 Markdown/HTML 原样透传（与既有 txt/md/html 同一风险类，非本次引入）；④ `.doc` 真实样例单测软依赖（既有策略）；⑤ `xlsx@0.18.5` CVE（用户已裁决保持现状，既有风险）；⑥ `server/e2e_out.txt` 疑似 e2e 调试残留（本 9 文件范围外，建议清理/加 `.gitignore`）；⑦ §10.3 选型表未新增表格行（仅注记补充，不影响一致性）。评审实测复核：server tsc 0 错 / 单测 52/52 / e2e 58/58；client tsc 0 错 / build ✓
- **Git**：本地未提交（攒批，等待用户指令再推送）
- **下一步**：Review 复审 → 用户手动冒烟上传 `sample_legacy.xls` / `sample_doc_legacy.doc` 验证预览与建页

---

## 2026-10-19 ｜ 文件上传扩充旧版格式 .doc / .xls（专用库 + 测试样例）

- **任务**：用户要求文件上传功能新增支持旧版二进制 `.doc` / `.xls`，并在 `test_files/upload/` 生成两种格式样例供手动测试。
- **用户裁决**（AskUserQuestion）：① 转换方案 = **新增专用库**——`.xls` 用 SheetJS（`xlsx`）转 Markdown 表格、`.doc` 用 `word-extractor` 提取纯文本，其余仍走 markitdown-ts（已知限制：`.doc` 仅纯文本，无标题层级/表格/图片）；② `.doc` 样例 = **用本机 Word COM 自动生成**。
- **变更清单**：
  - **设计文档**（先改后实现）：§10.1 允许格式行加 `doc,xls` + 新增「白名单扩充（2026-10-19）」注记（含限制说明）；§10.2 第 5 步（转换分支）；§10.3 补充选型注记；§3.2.3 文案「8 格式」→「10 格式」；§5.1.5 接口说明；§9 env 示例；§12 事项 #3
  - **后端 `files.service.ts`**：`ALLOWED_EXTENSIONS` 增 `.doc`/`.xls`；`convertFile` 增分支（`.xls`→`xlsToMarkdown`、`.doc`→`docToMarkdown`、其余→markitdown-ts）；新增私有方法 `xlsToMarkdown`（SheetJS 逐表转 Markdown 表格）、`rowsToMarkdownTable`（空行过滤/列宽对齐/`|` 转义/换行替换）、`docToMarkdown`（`word-extractor.getBody()`）；导入 `import * as XLSX from 'xlsx'`、`import WordExtractor from 'word-extractor'`
  - **新增 `server/src/types/word-extractor.d.ts`**：word-extractor 无官方类型，做最小 ambient 声明（`export = WordExtractor`，`extract(string|Buffer): Promise<{ getBody(): string }>`）
  - **依赖**：`server/package.json` 新增直接依赖 `xlsx@0.18.5`、`word-extractor@1.0.4`（lock 已固化 integrity）
  - **前端 `api/knowledge.ts`**：`UPLOAD_ALLOWED_EXTENSIONS` 增 `.doc`/`.xls`（弹窗格式文案由该数组派生，自动含 DOC、XLS）
  - **测试**：`files.service.spec.ts` 新增 3 条（.xls 转表格 / .doc·.xls 白名单断言 + .doc 损坏报「转换失败」/ .doc 真实样例提取纯文本，样例缺失则 `it.skip`）；`files.e2e-spec.ts` 新增 1 条 .xls 上传 e2e
  - **测试样例**：`test_files/upload/sample_legacy.xls`（SheetJS，双表 Syllabus/Glossary）、`sample_doc_legacy.doc`（Word COM 另存为 97-2003，24576B）
- **自测证据**：
  - 后端 `npx tsc --noEmit` 0 错误；`npm test` **51/51 PASS**；`npm run test:e2e` **57/57 PASS**
  - 前端 `npx tsc --noEmit` 0 错误；`npm run build` ✓ built in 1.04s
- **审查结论**：Review Agent（独立新上下文）**APPROVE**（0 Blocking，5 Non-blocking）：① 本次 AI 协作日志（本条，已补）；② `xlsx@0.18.5` 携带高危 CVE（Prototype Pollution/ReDoS，npm registry 上限即 0.18.5，`fixAvailable:false`）——**既有风险（markitdown-ts 早已依赖并解析 .xlsx），非本次引入**，建议改用 SheetJS 官方 CDN 0.20.x 或 exceljs，需用户裁决；③ `.xls` 对非 xls 内容 SheetJS 宽松解析不报错，建议加 OLE/BIFF 魔数（`D0 CF 11 E0 A1 B1 1A E1`）校验；④ `.doc` 真实样例单测对 `test_files` 存在性有软依赖（缺失静默 skip）；⑤ 送审范围提示（工作树另有大量无关未提交变更，需另行送审/拆分提交）
- **设计偏差上报**：§10.2 存在两处陈旧交叉引用（步骤 2 引「§5.1.6」应为 §5.1.5；步骤 7 写「经 §5.1.3…在指定 Lesson 下建 Page」应为 §5.1.2 且 2026-10-16 扁平化后**无 Lesson 层**）——既有问题，本次未引入，待用户裁决是否修订
- **Git**：本地未提交（攒批）
- **下一步**：用户手动冒烟——上传 `sample_legacy.xls` 与 `sample_doc_legacy.doc`，确认弹窗预览为 Markdown 表格 / 纯文本且可 Import 建页；并裁决 N②（xlsx CVE）与 N③（.xls 魔数校验）是否处理

---

## 2026-10-19 ｜ 模块导航列收起把手改版（半圆括号贴边把手 + ❮/❯ 文本符号）

- **任务**：用户对刚实现的「最左侧模块导航列可收起」按钮提出改版——做得更大、**不要圆形**，改为**类似括号的贴边样式**；并使「<」「>」符号**加粗、加大一号**。
- **用户裁决**（AskUserQuestion）：形状选**半圆括号（贴边把手）**——外侧整边圆弧、内侧平直、紧贴导航列右边缘垂直居中（不再跨边界）；符号采用**文本符号加大加粗**（AntD 图标为填充路径无法用 `font-weight` 加粗，故换文本字符）。
- **变更清单**：
  - **设计文档**（先改后实现）：`:224` 注记更新为「形态更新为半圆括号式贴边把手（外侧整边圆弧、内侧平直，约 22×48）+ 方向符号用文本 ❮ / ❯（fontSize 16 / fontWeight 700）」
  - **前端 `MainLayout.tsx`**：移除 `LeftOutlined/RightOutlined` 导入；收起把手按钮改为 `width:22 height:48`、`borderRadius:'0 50% 50% 0'`（右侧整边半椭圆弧）、`borderLeft:'none'`（内侧平直，与面板右边框不叠线）；定位改为 `left: navCollapsed ? 0 : NAV_WIDTH` + `top:'50%'` + `transform:'translateY(-50%)'`（仅垂直居中，**不再用 `translate(-50%, …)` 跨边界**）；`transition` 收敛为仅 `left 0.2s ease`（与列宽过渡同步）；内容改为 `<span>` 文本符号 `{navCollapsed ? '❯' : '❮'}`，字号 `tokens.fontSize['2xl']`(16)、字重 `tokens.fontWeight.bold`(700)、`lineHeight:1`；文件头注释同步
- **自测证据**：
  - 前端 `npx tsc --noEmit`：0 错误；`npm run build`（tsc -b && vite build）：✓ built in 1.19s
- **审查结论**：Review Agent（独立新上下文）**APPROVE**（0 Blocking，3 Non-blocking：① `NAV_WIDTH` 与 `ModuleNav.tsx` 内 `width:160` 重复；② 把手几何 `22/48`、`zIndex:10` 为字面量；③ 送审范围仅本次 2 文件，工作树其余未提交变更需另行送审）。评审确认几何换算（22×48 + `0 50% 50% 0` 形成完整半椭圆弧）、收起/展开定位、Token 复用、无残留导入、文档一致
- **Git**：本地未提交（攒批）
- **下一步**：用户手动冒烟——① 把手是否为「外侧圆弧、内侧平直」的半圆括号贴边形态且紧贴右边缘垂直居中；② 收起后是否停靠最左边缘完整可见；③ ❮ / ❯ 是否明显加粗放大

---

## 2026-10-19 ｜ 最左侧模块导航列（Knowledge / AI Tutor）可向左收起

- **任务**：用户要求最左侧模块导航列（Knowledge / AI Tutor）增加「向左收起」功能，按钮置于该列右边缘垂直居中、贴板块最右侧。
- **用户拍板**（AskUserQuestion）：形态为**完全收起隐藏**（整列向左滑出隐藏，按钮随停靠到最左边缘），而非收成窄条/仅图标条。
- **变更清单**：
  - **设计文档**（先改后实现）：§3.1 布局附近（约 `:224`）新增「2026-10-19 模块导航列可收起」注记
  - **前端 `MainLayout.tsx`**：新增 `useState` 与 `LeftOutlined/RightOutlined` 导入；新增常量 `NAV_WIDTH = 160` 与 `navCollapsed` state；将 `ModuleNav` 包进 `position: relative` 外层 wrapper，内层 div `width: navCollapsed ? 0 : NAV_WIDTH` + `overflow: hidden` + `transition: width 0.2s ease`（整列向左滑出裁切）；新增绝对定位圆钮（22×22，`borderRadius: 50%`，`boxShadow: tokens.shadow.card`）——展开态 `left: NAV_WIDTH` + `translate(-50%, -50%)`（跨在列右边缘上），收起态 `left: 0` + `translateY(-50%)`（贴最左边缘完整显示，避免被视口裁掉一半）；图标 `LeftOutlined`（展开态）/ `RightOutlined`（收起态）；补 `aria-label`/`title`；`transition: 'left 0.2s ease, transform 0.2s ease'` 与列宽度过渡同步
- **自测证据**：
  - 前端 `tsc --noEmit`：0 错误；`npm run build`（tsc -b && vite build）：✓ built in 1.21s
- **审查结论**：Review Agent（独立新上下文）**APPROVE**（0 Blocking，5 Non-blocking）。评审确认收起/展开逻辑、按钮定位（含收起态防裁切）、过渡动画正确；已处理 **N1**（按钮补 `transition: 'left 0.2s ease, transform 0.2s ease'`）；其余 Non-blocking 见「遗留」
- **Git**：本地未提交（攒批）
- **下一步**：用户手动冒烟——① 点击右边缘按钮，确认导航列整列向左滑出隐藏、按钮停到最左边缘；② 再次点击确认展开复位；③ 按钮位于该列右边缘垂直居中、贴板块最右侧
- **遗留/备注**（Review Non-blocking，未处理）：**N2** `NAV_WIDTH` 常量与 `ModuleNav.tsx` 内 `width: 160` 重复，可提取共享常量；**N4** 收起态未持久化（刷新后恢复展开，如需记忆需接 localStorage）；**N5** 按钮 22px 为取值决定，如与 Figma 规范有出入可再调

---

## 2026-10-19 ｜ Releases（原 Publish）面板 5 项调整 + 更名文案贯通

- **任务**（用户提出 5 点修正）：① Releases 界面下不应显示左侧课程树边栏（同步目标/课程树/Sync 按钮），但保留最左侧模块导航列；② Tab 名 `Publish` → `Releases`；③ 列表上方新增标题行 `Knowledge Releases`；④ 列 `Current Version` → `Latest Release`；⑤ 按钮 `Publish` → `Create Release`
- **用户裁决**（AskUserQuestion）：① **隐藏整个课程树边栏，但不隐藏 Knowledge/AI Tutor 模块导航列**；④ 拼写用 **Latest Release**（用户原写 Lastest，确认为笔误）；后追加：AI Tutor 用户可见提示文案「请先在 Knowledge 模块 Publish」**一并改为 Releases**
- **变更清单**：
  - **设计文档**（先改后实现）：§3.1 布局（Tab 名 `Releases`、Releases 下隐藏课程树栏）、新增「2026-10-19 Releases Tab 调整」注记、§3.4 标题/表格列（`Knowledge Releases` 标题行、`Latest Release`、`Create Release`）、§3.4.2 标题、§3.4.3 标题与流程文字、§4.4 未发布提示文案
  - **前端 `KnowledgeTabBar.tsx`**：TABS 第二项 label `Publish` → `Releases`（tab key 内部仍为 `'publish'`）
  - **前端 `PublishPanel.tsx`**：新增 `Typography.Title level={4}` 标题行 `Knowledge Releases`；列 title → `Latest Release`；Action 按钮 → `Create Release`；发布 Modal 说明 → `Create Release …`；文件头注释同步
  - **前端 `App.tsx`**：`sidebar` 增加 tab 条件——`activeModule === 'knowledge' && knowledgeTab === 'pages'` 才渲染侧栏；`topBar`（Tab 栏）与 `MainLayout` 最左侧 `ModuleNav` 不受影响
  - **后端 `ai-chat.service.ts`**：两处未发布错误文案 → 「该课程尚未发布知识库版本，请先在 Knowledge 模块 Releases 页创建版本」；`buildContext` 注释同步
  - **测试 `server/test/ai.e2e-spec.ts`**：断言 `toContain('Publish')` → `toContain('Releases')`
- **自测证据**：
  - 前端 `tsc --noEmit` 0 错误；`npm run build`（tsc -b && vite build）✓ built
  - 后端 `tsc --noEmit` 0 错误；`npm test` **48/48 PASS**；`npm run test:e2e` **56/56 PASS**
- **审查结论**：Review Agent（独立新上下文）首轮 **REQUEST_CHANGES**（5 点本体全对；1 Blocking：AI Tutor 用户可见文案「用户可见的过时 Publish 文案」未同步）；经用户裁决一并修改后复审 **APPROVE**（0 Blocking）。评审过程同时确认 `topBar`/`ModuleNav` 保留、`Current Version` 无残留、`Typography.Title` 导出链正常
- **Git**：本地未提交（攒批）
- **下一步**：用户手动冒烟——① 切到 Releases tab，确认左侧课程树栏消失、最左侧模块导航仍在，切回 Knowledge Pages 恢复；② Tab 名、标题行、列名、按钮文案；③ AI Tutor 未发布课程时提示文案指向 Releases
- **遗留/备注**：切 tab 会卸载 `Sidebar`，切回时 `loadExternalCourses` 会重复拉取、课程树展开态/搜索词重置（既有机制，Store 数据不丢，非本次引入）；`PublishPanel` 组件名与 tab key `'publish'` 作为内部标识保留

---

## 2026-10-19 ｜ Heading 标签/TOC 支持范围由 H1/H2/H3 扩展至 H1-H6

- **任务**：用户指出「md 编辑功能目前只有 heading1/2/3 支持标签，希望所有 heading 都支持标签」。经排查，BlockNote heading schema 原生支持 6 级（`HEADING_LEVELS=[1..6]`），但项目只在 H1/H2/H3 范围内实现标签与 TOC。
- **用户拍板**（AskUserQuestion）：**全部扩展到 H1-H6**——标签、左侧 TOC、右键插入菜单同步放开 H4-H6，后端 sectionTags 迁移过滤与 AI 上下文分段正则一并由 `#{1,3}` 放宽为 `#{1,6}`。
- **变更清单**：
  - **设计文档**（先改后实现）：§2 schema 注释（`:96`）、§2 历史叙述注记（`:55`）、§3.2 扁平化注记补「2026-10-19 层级扩展改拍」（`:218`）、§3.2.1 树形导航（`:226`/`:230`）、§3.3.2 块菜单与第 5 条（`:303`/`:308`）、§3.3.3 section tags（`:337`）、§4.4.2 知识库上下文（`:505`）
  - **前端 `PageEditor.tsx`**：4 处 `querySelectorAll('h1,h2,h3')` → `'h1,h2,h3,h4,h5,h6'`（TOC 定位 / tag 位置更新 / heading key 列表 / headingKeys 变化后定位）；右键菜单 heading 子项新增 heading4/5/6「四级/五级/六级标题」；相关注释同步
  - **前端 `CourseTree.tsx`**：`parseHeadings` 正则 `^(#{1,3})` → `^(#{1,6})`；注释同步（字体层级维持 level1=md / level2=sm / 3-6=xs）
  - **后端 `sync.service.ts`**：`extractHeadingKeys`（sectionTags 迁移过滤）正则 `#{1,3}` → `#{1,6}`
  - **后端 `ai-chat.service.ts`**：`splitByHeadings`（AI 上下文分段）正则 `#{1,3}` → `#{1,6}`
  - **注释一致性**：`schema.prisma`、`create-page.dto.ts`、`client/api/knowledge.ts`、`client/stores/knowledgeStore.ts` 的 `H1/H2/H3` → `H1-H6`（注释级，无 Schema 变更、无需迁移）
- **自测证据**：
  - 前端 `tsc --noEmit`：0 错误；`npm run build`：✓ built
  - 后端 `tsc --noEmit`：0 错误；`npm test`：**48/48 PASS**；`npm run test:e2e`：**56/56 PASS**
- **审查结论**：Review Agent（独立新上下文）**APPROVE**（0 Blocking，5 Non-blocking）。已落地的 Non-blocking：① CourseTree `HeadingInfo` 注释 `(1-3)`→`(1-6)`；② 设计文档 §2 历史注记同步层级范围。其余待办：AI 协作日志本条（正在补）、同级同名 heading 的 `h{n}-slug` key 碰撞（既有问题，扩至 6 级后触发面上升）、H4-H6 专项用例缺失（可选补）
- **Git**：本地未提交（攒批）
- **下一步**：用户手动冒烟——① 编辑器内插入 H4/H5/H6 后右侧是否出现标签按钮；② 左侧 TOC 是否展示 H4-H6 且点击可定位；③ 后端同步迁移/AI 上下文对 H4-H6 标签是否生效。完成后询问用户是否推送分支/发 PR
- **遗留/已知限制**：同级同名标题（如多个 `#### 注意事项`）会生成相同 `h{n}-slug`，导致标签覆盖层 React key 重复与 TOC 节点 key 冲突（H1-H3 时已存在，本次未引入）；如需修复需引入出现次序消歧，涉及 headingKey 规则变更，待用户裁决

---

## 2026-10-19 ｜ 页面标题铅笔按钮位置 + LaTeX 粘贴自动转公式块

- **任务**：用户两项需求——① 调整页面标题（md 文件名称）右侧铅笔按钮位置，使其紧贴标题名称右侧并垂直居中；② 复制 LaTeX 内容粘贴时被 BlockNote 默认转为 code block，要求粘贴后直接渲染为公式。
- **用户拍板**：
  - 铅笔位置：标题 div 移除 `flex: 1`（收缩到文字宽度），保存状态 Tag 加 `marginLeft: 'auto'` 仍贴右，铅笔按钮靠 `gap` 紧贴标题右侧，`alignItems: 'center'` 保证垂直居中
  - LaTeX 粘贴：**方案 A**（自定义粘贴拦截）；复制来源 VSCode + 网页；普通代码保持 code block
- **变更清单**：
  - `PageEditor.tsx` 标题展示态 div 移除 `flex: 1`，保存 Tag 加 `marginLeft: 'auto'`
  - 新增工具函数 `looksLikeLatex(text)`（触发条件：`$$...$$` 块公式 / 常见 LaTeX 命令 / `$...$` 内含已知命令，避免 `\n` `\d` 普通转义误判）和 `extractCodeFromHtml(html)`（DOMParser 提取所有 `<pre>`/`<code>` textContent，正确处理实体）
  - `useCreateBlockNote` 新增 `pasteHandler` 选项（而非 React onPaste，因 BlockNote 内部已在 view.dom 注册原生 paste 并 preventDefault，React onPaste 会在其后触发导致重复插入）：优先用 text/plain 判断 LaTeX，否则从 text/html 代码块提取；命中则 `tryParseMarkdownToBlocks` + `convertMathParagraphs` 解析插入（空段落 replace、否则 after；空文档追加末尾），用 insertBlocks/replaceBlocks 返回的带 id 块定位光标，`return true` 拦截；非 LaTeX 或解析空结果 `return defaultPasteHandler()` 走默认；异常 `message.warning`
- **自测证据**：
  - 前端 `tsc --noEmit`：0 错误；`vite build`：✓ built（tsc -b && vite build）
- **审查结论**：Review Agent 复审 **APPROVE**（首轮 REQUEST_CHANGES，2 Blocking：B1 改用 pasteHandler 解决重复插入、B2 用插入返回值带 id 块定位光标；4 Non-blocking 全部落实：N1 收紧条件3、N2 空结果回退默认、N3 提取所有代码块、N4 DOMParser 处理实体）
- **Git**：本地未提交（攒批）
- **下一步**：用户手动冒烟——① 铅笔按钮是否紧贴标题右侧且垂直居中；② 从 VSCode/网页复制 `$$...$$` / `$...$` 粘贴是否直接渲染为公式块；③ 粘贴普通代码是否仍保留 code block；④ 空段落粘贴替换 / 非空段落 after 插入 / 空文档追加末尾三种场景

---

## 2026-10-19 ｜ Knowledge 整宽 Tab 栏 + 页面标题铅笔就地编辑（对齐 Figma 1.1 Page Editor）

- **任务**：用户要求两处 Knowledge System UI 调整——① 将「Knowledge Pages / Publish」整行 Tab 位置提升到课程树「同步目标」栏的上方；② 页面标题（md 文件名称）编辑改为 Figma「Population Growth」形式：默认展示大标题 + 右侧常显铅笔按钮，点击就地变输入框编辑。格式对齐 Figma 缓存 `YL-KS+AI_UIIFinal-20261019-105235` 中的帧 `1.1 Page Editor`（节点 665:543，1672×941）。
- **用户拍板**（AskUserQuestion）：
  - 布局调整：**整宽 Tab 栏**——把「Knowledge Pages / Publish」整行提升为跨「课程树列 + 编辑器」的整宽 Tab 栏，位于同步目标上方（模块导航列保持左侧整高）
  - 标题编辑：**常显铅笔 + 就地编辑**——默认展示态大标题 + 右侧常显铅笔按钮，点击就地变输入框，Enter/失焦保存、Esc 取消回滚
  - Tab 样式：**按 Figma 调整**——激活 `#145CFF`、16px/600、底部 2px 激活下划线 + 整条底边线；非激活 `#000000`
- **Figma 关键事实**（缓存 JSON 解析）：帧 `1.1 Page Editor` 布局为 Header(y0–68) → 模块导航列(宽 280 全高) → 其右侧顶部整宽 Tab 栏(y68–131，`Rectangle 6` 从 x281 延伸至右缘) → 下方课程树面板(含同步目标，y152 起) 与编辑器卡片(`Rectangle 8`，x583 起)。Tab：`Knowledge Pages` 16px/600 `#145CFF`（激活）、`Publish` 16px/600 `#000000`，激活下划线 `Rectangle 5` 138×2。标题：`Population Growth` 30px/700 `#000000`，右侧 `Frame 42`(20×20) 含 16×16 铅笔 vector(`edit-icon`)，下方分隔线 `Line 67`。
- **变更清单**：
  - **设计文档**：§3.1 改写为「顶部整宽 Tab 栏 + 下方左右两栏」并新增 2026-10-19 改拍注记（对齐 Figma 帧 665:543，Tab 样式规范）；§3.3.1 改写为「常显大标题（约 30px/700/黑）+ 右侧常显铅笔按钮（16×16 图标 / 20×20 容器）；点击铅笔→就地输入框；Enter/失焦保存、Esc 取消回滚；标题下方分隔线」；§3.3.2 第 5 条措辞更新
  - **前端**：`MainLayout.tsx` 新增 `topBar` 插槽（props 增加 `topBar?: React.ReactNode`，结构改为模块导航列 + 右列[topBar + 左右两栏]）；**新建** `knowledge/KnowledgeTabBar.tsx`（自绘 Figma 风格 Tab，role=tablist/tab/aria-selected，激活 #145CFF + 2px 下划线）；`App.tsx` 新增 `knowledgeTab` 状态并传 `topBar`；`KnowledgeSystem.tsx` 移除 antd `Tabs`，改为接收 `tab` prop 的内容渲染器；`PageEditor.tsx` 标题区改为展示态/编辑态切换（`editingTitle` 状态 + `titleBeforeEdit` ref；展示态 30px/700 `#000000` 大标题 + 20×20 常显铅笔按钮（`EditOutlined` 16px）；编辑态 `Input` autoFocus，Enter/失焦保存、Esc 回滚）
- **自测证据**：
  - 前端 `tsc --noEmit`：0 错误；`vite build`：✓ built in 1.06s；后端不受影响（无后端变更）
- **审查结论**：Review Agent **APPROVE**（0 Blocking，6 Non-blocking）；已采纳修补：铅笔按钮尺寸对齐 Figma（20×20 容器 / 16px 图标）、标题色改纯黑 `#000000`（原 `text.primary #1E293B`）；用户裁决采纳 Non-blocking #1：统一空标题文案（编辑态 placeholder「页面标题」→「未命名页面」，与展示态回退一致）；其余 Non-blocking（原生 button 注释、Esc 与防抖中间写库语义、tabpanel/键盘导航、工作区攒批文件提交范围）为可选/固有语义
- **Git**：本地未提交（攒批）
- **下一步**：用户手动冒烟（Tab 整宽位置与样式、点击铅笔就地编辑标题、Enter/失焦保存、Esc 取消、刷新后标题持久化）→ 确认后询问用户是否推送分支/发 PR

---

## 2026-10-19 ｜ 左侧课程树 Page 拖拽排序（悬停把手 + 批量排序接口）

- **任务**：用户要求「lesson 的左侧添加拖动机制，能够调整它们的位置」——即课程树中 Page 节点的拖拽排序。
- **用户拍板**（AskUserQuestion）：
  - 拖拽范围：**全部 Page 均可拖拽**（含 STALE/外部同步页）
  - 把手交互：**悬停显示把手**（行左侧 ⣿，按住把手拖动）
  - 排序接口：**新增批量排序接口** `PUT /api/courses/:courseId/pages/reorder`，body `{ orderedIds: string[] }`，事务内按数组下标重写 `sortOrder`
- **变更清单**：
  - **设计文档**：§3.2.1 树形导航新增「Page 节点支持拖拽排序（2026-10-19 新增）」条目并补「搜索过滤时禁用拖拽」；§5.1.2 表格新增 `PUT /api/courses/:courseId/pages/reorder` 行 + 校验说明（orderedIds 须无重复且集合等于该 Course 全部 Page id，否则 400 VALIDATION_ERROR；courseId 不存在 404）
  - **后端**：新增 `pages/dto/reorder-pages.dto.ts`（`@IsArray + @ArrayNotEmpty + @IsString({each:true})`）；`pages.service.ts` 新增 `reorder()`（校验 courseId 存在→校验 orderedIds 为全部 Page 的完整排列→`$transaction` 批量 `update sortOrder=index`）；`pages.controller.ts` 新增 `@Put('courses/:courseId/pages/reorder')`；`test/knowledge.e2e-spec.ts` 新增 5 用例（成功重排 + 非完整排列 400 + 空数组 400 + 含重复 id 400 + 课程不存在 404）
  - **前端**：`api/knowledge.ts` 新增 `reorderPages(courseId, orderedIds)`；`knowledgeStore.ts` 新增 `reorderPages`（乐观更新本地 sortOrder + 失败 `refreshDetail` 回滚）；`CourseTree.tsx` 用原生 HTML5 DnD（非 antd 内置 draggable，避免整行拖拽/reparenting）实现悬停把手拖拽：新增 `draggingId`/`dropTarget` 状态、`resolveDropPos`（按指针 Y 与行中点判定 before/after）、`performReorder`（移除再插入、顺序不变不发请求、失败 message.error），行根 div 绑定 onDragOver/onDragLeave/onDrop + 插入线 boxShadow，左侧 `HolderOutlined` 把手 `draggable` 触发 onDragStart；`index.css` 新增 `.page-drag-handle` 悬停显隐/光标样式
- **自测证据**：
  - 后端 `tsc --noEmit`：0 错误；单测 48/48 PASS；**e2e 56/56 PASS**（含新增 5 个 reorder 用例：成功/非完整排列/空数组/重复 id/课程不存在）
  - 前端 `tsc --noEmit`：0 错误；`vite build`：✓ built in 1.41s；`eslint`：0 errors（4 warnings 为既有 react-hooks 告警）
- **审查结论**：Review Agent **APPROVE**（0 Blocking）；4 项 Non-blocking：① 工作区 40 文件为历史攒批，提交时须只暂存本功能 10 文件（建议采纳）；② 补重复 id e2e 用例（**已采纳，补后 e2e 56/56**）；③ §5.1.2 对「0 页 Course 空数组」未明确（UI 不可达，忽略）；④ reorder 无并发乐观锁（可接受）
- **Git**：本地未提交（攒批）
- **下一步**：送 Review Agent 独立审查 → 用户手动冒烟（悬停出现把手、按住把手拖拽、插入线提示、松手排序持久化、刷新后顺序保持）→ 确认后询问用户是否推送分支

---

## 2026-10-16 ｜ Tag 体系重构：移除页面级 tags，section tags 扩展至 H1-3，引入全局 Tag 词库（方案 B 轻量版）

- **任务**：用户确认当前 tag 方案后裁决——移除页面级 tags，仅保留 section tags；section tags 从仅 H2 扩展到 H1/H2/H3（key 改为 `h{n}-slug` 带层级前缀）；引入全局 Tag 词库（方案 B 轻量版：输入即沉淀、颜色自动分配、AutoComplete 联想）。
- **用户拍板**：
  - 移除页面级 `Page.tags`，仅保留 `sectionTags`
  - section tags 绑定 H1/H2/H3，key = `h{n}-{slug}`（层级前缀避免同名冲突）
  - 方案 B 轻量版：独立 `Tag` 表，初始 4 个预设 tag（Core Knowledge=蓝、Teaching Guidance=绿、Misconception=橙、Assessment=紫）；用户输入新 tag 自动写入词库，颜色按 name 哈希自动分配；第一版不做独立管理界面
- **变更清单**：
  - **设计文档**：§2 Page 模型删 tags、新增 Tag 模型；§3.3.3 重写（去页面级 tags、section tags 支持 H1-3、方案 B 词库）；§3.3.2 顶部栏去 tags；§3.2.2 同步方案 C 去页面级 tags 迁移；§3.4 快照去 tags；§4.4.2 AI 上下文按 H1-3 切分；§5.1.2 Page 更新去 tags；新增 §5.1.6 Tag 词库接口
  - **后端**：`schema.prisma` 删 `Page.tags`、新增 `Tag(name unique, color)`；迁移 `20261016072726_remove_page_tags_add_tag_table`；新增 `tags/` 模块（`TagsService.listTags/createTag`、颜色哈希分配 `pickColor`、`TagsController` GET/POST `/api/tags`），注册到 AppModule；Pages DTO/Service 去 tags；Sync `migrateTags` 返回仅 sectionTags、`extractHeadingKeys` 支持 H1-3；Releases 快照/激活去 tags；AI `buildContext` 用 `splitByHeadings`（H1-3）+ `headingKey` 切分拼接 `[TAGS: ...]`；seed 新增 4 个预设 tag
  - **前端**：`api/knowledge.ts`（PageNode/ReleaseDetail 去 tags、新增 `TagItem` 类型与 `listTags/createTag` 接口）；`knowledgeStore.ts`（PageDraft 去 tags、新增 `tags` 词库状态与 `loadTags/createTag`）；`TagManager.tsx` 重写（AutoComplete 联想词库、命中用词库配色、未命中调 createTag 沉淀、同名颜色稳定）；`PageEditor.tsx`（去顶部页面级 TagManager、H1/H2/H3 下方 portal 注入 section tags、key 用 `headingKey`）；`ui/index.ts` 透传 AutoComplete
  - **测试**：`releases.service.spec.ts`、`knowledge.e2e-spec.ts` 去 tags，改用 sectionTags（`h{n}-slug` 格式）
- **自测证据**：
  - 后端 `tsc --noEmit`：0 错误；单测 35/35 PASS；e2e 40/40 PASS
  - 前端 `tsc -b --noEmit`：0 错误；`vite build`：✓ built in 1.30s
  - 数据库验证：4 个预设 tag 正确入库（Assessment=purple、Core Knowledge=blue、Misconception=orange、Teaching Guidance=green）
- **审查结论**：待 Review Agent 审查
- **Git**：本地未提交
- **下一步**：送 Review Agent 审查 → 用户冒烟（H1-3 section tags 编辑、新词库 tag 自动沉淀配色、同步 STALE 迁移）→ 确认后推送分支

---

## 2026-10-16 ｜ 扁平化改造：Knowledge System 三级→两级（Course→Page）+ TOC + H2 section tags

- **任务**：用户要求将 Course → Lesson → Page 三级结构扁平化为 Course → Page 两级，新增目录（TOC）功能，每个 H2 heading 可单独打用户自定义 tags（sectionTags，用于 AI 语义标注）。同步 STALE 方案 C：整页 STALE + 重建，但按 heading slug 迁移旧 Page 的 sectionTags。
- **用户拍板**：
  - 数据可重置（删库重建 + 新 seed）
  - TOC 集成在课程树列内（Course → Page → Heading 三级展开），不另开窗口
  - H2 sectionTags：`{ "heading-slug": ["tag1","tag2"] }`，key 为 H2 文本 slug
  - 同步方案 C：整页 STALE + 重建，按 H2 slug 迁移旧 sectionTags
- **变更清单**：
  - **设计文档**：§2 数据模型（删 Lesson、Page 加 courseId+sectionTags、Release snapshotData={pages:[...]}）；§3（扁平结构、TOC、H2 section tags、同步方案 C）；§5 API（删 Lesson 端点、Page 路由改 `/courses/:courseId/pages`）；§4.4.2（读 snapshot.pages）
  - **后端**：`schema.prisma` 删 Lesson、Page 加 `courseId`+`sectionTags Json?`；新迁移 `20261016055712_flatten_course_page`；删 `server/src/lessons/`；Pages/Courses/Sync/Releases/AI 全量适配；`mergeLessonContent` 合并外部 Lesson→Page；`migrateTags` 按 H2 slug 过滤 sectionTags；`ai-chat.service.ts` buildContext 按 H2 切分并拼接 `[TAGS: ...]`（slugify 与 sync/前端一致）；seed 用合并逻辑生成扁平 Page
  - **前端**：`api/knowledge.ts`（删 Lesson 端点、PageNode 加 sectionTags）；`knowledgeStore.ts`（createPage 两参、PageDraft 加 sectionTags、新增 tocScrollTarget/scrollToHeading/clearTocScrollTarget）；`CourseTree.tsx`（Course→Page→Heading 三级树、解析 contentMd 提取 H1/H2/H3、heading 点击 scrollToHeading）；`PageEditor.tsx`（监听 tocScrollTarget 滚动定位、H2 下方 portal 注入 TagManager 编辑 sectionTags）；`UploadDocumentModal.tsx`（目标改 Course）
  - **测试**：releases.service.spec.ts、knowledge.e2e-spec.ts、ai.e2e-spec.ts、files.e2e-spec.ts 适配新结构
- **自测证据**：
  - 后端 `tsc --noEmit`：0 错误；单测 35/35 PASS；e2e 40/40 PASS
  - 前端 `tsc -b --noEmit`：0 错误；`vite build`：✓ built in 1.43s
- **审查结论**：Review Agent **APPROVE**，3 Non-blocking（已主动补齐第 1 条：AI 上下文使用 sectionTags；第 2 条 e2e 覆盖、第 3 条生产数据迁移为后续项）
- **Git**：本地未提交（含上一轮 Figma 基础设施攒批）
- **下一步**：用户手动冒烟（TOC 展开/滚动、H2 section tags 编辑、上传文档建页、发布快照）；确认后推送分支并发 PR

---

## 2026-10-16 ｜ 细节调整第七轮：建立 Figma 设计库迁移基础设施（设计 Token + UI 封装层）

- **任务**：用户有 Figma 设计库但尚未接入，评估当前前端（Ant Design 5.x 全量直接使用、100% 内联样式、硬编码颜色/间距）能否平滑迁移。经评估风险高（无组件封装层、硬编码 token 遍布 12 文件、未用 antd 主题系统），用户拍板先建立迁移基础设施，不改业务逻辑、零视觉变化。
- **用户拍板**：
  - 目标：建立迁移基础设施（封装层 + token），不直接接入 Figma 库
  - 封装全部 20 个 antd 组件（非仅高频），间距/字号也 token 化
  - token 值与既有 antd 默认值一致，零视觉变化
- **变更清单**（仅 client/）：
  - **新增 `theme/tokens.ts`**：颜色/间距/字号/圆角/字重单一来源（color.primary=#1677ff、spacing.xs..2xl=4/8/12/16/24/48、radius.sm/md/lg=6/8/12、fontSize.xs..2xl=10..16、fontWeight.normal/medium/semibold=400/500/600）
  - **新增 `components/ui/` 封装层**（14 文件 + index.ts barrel）：Button/Card/Input/Select/Tag/Modal/Table/Tree/Tabs/Segmented/Avatar/Typography/Layout。业务组件一律 `import from '../ui'`，禁止直接 `import from 'antd'`。封装层纯透传 props，不强制覆盖外观（保持 antd 默认圆角等），未来替换 Figma 组件仅改本层
  - **`App.tsx`**：ConfigProvider theme 注入与 antd 默认一致的 token（colorPrimary/success/warning/error/fontSize），**不**注入 borderRadius/colorBorder/colorText/colorTextSecondary（避免改变 antd 组件内部外观）
  - **12 个业务组件**（layout/knowledge/ai/pages）：import 从 `'antd'` 改为 `'../ui'`；硬编码颜色（#1677ff/#f0f0f0/#52c41a/#faad14/#8c8c8c/#999/#bfbfbf 等）→ `tokens.color.*`；硬编码间距（4/8/12/16/24）→ `tokens.spacing.*`；硬编码字号/圆角/字重 → `tokens.*`
  - **`index.css`**：新增 `:root` CSS 变量（与 tokens.ts 同步），供 BlockNote/md-editor 等第三方库覆盖；`.ai-mode-segmented` 选中色改用 CSS 变量
  - **文档**：§6.1 项目结构更新（新增 theme/、ui/，修正 ai-tutor→ai、补充 UploadDocumentModal/ModuleNav）；新增 UI 抽象层与设计 Token 说明
- **自测证据**：
  - `npx tsc -b --noEmit`：0 错误
  - `npm run build`：✓ built in 1.06s 成功（仅 chunk >500kB 警告，非失败）
  - Grep `from 'antd'`（排除 ui/）：仅 App.tsx 2 处（ConfigProvider + locale），符合例外规则
  - Grep 业务组件 hex 颜色：无硬编码（仅 tokens.ts / index.css 定义处）
- **审查结论**：Review Agent 初审 REQUEST_CHANGES（3 Blocking：ConfigProvider 注入了与 antd 默认不一致的 borderRadius/colorBorder/colorText/colorTextSecondary 导致全局视觉变化；Button/Card 封装层强制 borderRadius=8）；修复后复审 **APPROVE，0 Blocking**
- **Git**：本地 main 攒批未推送
- **下一步**：等用户手动冒烟测试（确认视觉无变化）；Figma 设计库形态确定后，修改 tokens.ts 和 ui/ 封装层即可迁移，业务组件零改动

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

import { useEffect, useRef } from 'react'
import { Alert, App, Dropdown, Empty, Input, Tag } from 'antd'
import type { MenuProps } from 'antd'
import {
  BlockNoteView,
} from '@blocknote/mantine'
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from '@blocknote/core'
import { en } from '@blocknote/core/locales'
import {
  useCreateBlockNote,
} from '@blocknote/react'
import {
  createReactMathBlockSpec,
  createReactInlineMathSpec,
} from '@blocknote/math-block'
import '@blocknote/react/style.css'
import '@blocknote/mantine/style.css'
import {
  AlignLeftOutlined,
  FontSizeOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  TableOutlined,
  CodeOutlined,
  MessageOutlined,
  FunctionOutlined,
  PictureOutlined,
} from '@ant-design/icons'
import { useKnowledgeStore } from '../../stores/knowledgeStore'
import { TagManager } from './TagManager'

/**
 * Page 编辑器（§3.3.2，2026-10-15 改：BlockNote 块编辑器）
 * - BlockNote（Notion/Jupyter 式）：数学块、拖拽重排、选中浮窗、右键插入菜单
 * - 存储仍为 contentMd（blocksToMarkdownLossy）
 * - 编辑后防抖保存到 store.editDraft → PUT /api/pages/:id
 * - 2026-10-15 用户反馈修正：移除 / 命令（白屏）、移除源码模式切换、
 *   修复拖拽手柄可见性、右键菜单加图标
 */

/** 自定义 schema：默认块/行内/样式 + 数学块 + 行内公式 */
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    mathBlock: createReactMathBlockSpec(),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    math: createReactInlineMathSpec(),
  },
  styleSpecs: defaultStyleSpecs,
})

const SAVE_LABEL: Record<string, { text: string; color: string }> = {
  idle: { text: '', color: '' },
  dirty: { text: '未保存…', color: 'orange' },
  saving: { text: '保存中…', color: 'blue' },
  saved: { text: '已保存', color: 'green' },
  error: { text: '保存失败', color: 'red' },
}

/**
 * 把段落/列表项 content 中的 `$...$` 文本拆分为 math 行内内容项。
 * 先处理 `$$...$$`（块公式），再处理 `$...$`（行内公式），避免顺序冲突。
 * 跳过代码块内容（代码块不解析公式）。
 */
function processInlineMath(content: any[]): any[] {
  if (!Array.isArray(content)) return content
  const result: any[] = []
  for (const item of content) {
    if (item.type !== 'text' || typeof item.text !== 'string') {
      result.push(item)
      continue
    }
    const regex = /\$([^$\n]+?)\$/g
    let lastIndex = 0
    let m: RegExpExecArray | null
    let hasMatch = false
    while ((m = regex.exec(item.text)) !== null) {
      hasMatch = true
      if (m.index > lastIndex) {
        result.push({ ...item, text: item.text.slice(lastIndex, m.index) })
      }
      result.push({ type: 'math', content: m[1].trim() })
      lastIndex = m.index + m[0].length
    }
    if (hasMatch) {
      if (lastIndex < item.text.length) {
        result.push({ ...item, text: item.text.slice(lastIndex) })
      }
    } else {
      result.push(item) // 无匹配，原样保留一次
    }
  }
  return result
}

/**
 * 处理表格单元格中的行内 $...$：遍历 rows[].cells[]，
 * 每个 cell 是 InlineContent[]，调用 processInlineMath。
 */
function processTableInlineMath(tableContent: any): any {
  if (!tableContent || !Array.isArray(tableContent.rows)) return tableContent
  return {
    ...tableContent,
    rows: tableContent.rows.map((row: any) => ({
      ...row,
      cells: row.cells.map((cell: any) => {
        // cell 可能是 string 或 InlineContent[]
        if (typeof cell === 'string') {
          return processInlineMath([{ type: 'text', text: cell, styles: {} }])
        }
        if (Array.isArray(cell)) return processInlineMath(cell)
        // TableCell 对象形式 { type, props, content }
        if (cell && Array.isArray(cell.content)) {
          return { ...cell, content: processInlineMath(cell.content) }
        }
        return cell
      }),
    })),
  }
}

/**
 * 后处理：
 * 1. 把 `$$...$$` 段落块转换为 mathBlock
 * 2. 把段落/列表项 content 中的 `$...$` 文本转为 math 行内内容项
 * 3. 表格单元格中的 `$...$` 同样处理
 * 原因：@blocknote/math-block 只提供 HTML/MathML 解析，不提供 markdown 解析。
 */
function convertMathParagraphs(blocks: any[]): any[] {
  return blocks.map((block) => {
    // 1. 整段 $$...$$ → mathBlock
    if (block.type === 'paragraph') {
      const text = (block.content || [])
        .map((c: any) => c.text || '')
        .join('')
      const match = text.match(/^\$\$\s*([\s\S]*?)\s*\$\$$/)
      if (match) {
        const latex = match[1].replace(/\\\s*\n/g, '\n').replace(/\n\\/g, '\n').trim()
        return {
          type: 'mathBlock',
          content: latex ? [{ type: 'text', text: latex, styles: {} }] : [],
        }
      }
    }
    // 2. 行内 $...$（段落、列表项等含 content 数组的块）
    if (Array.isArray(block.content)) {
      block = { ...block, content: processInlineMath(block.content) }
    }
    // 3. 表格单元格中的行内 $...$
    if (block.type === 'table' && block.content) {
      block = { ...block, content: processTableInlineMath(block.content) }
    }
    // 4. 递归处理嵌套 children（列表项的子块）
    if (Array.isArray(block.children) && block.children.length) {
      block = { ...block, children: convertMathParagraphs(block.children) }
    }
    return block
  })
}

/**
 * 把表格单元格中的 math 行内内容项转回 `$latex$` 文本。
 */
function tableInlineMathToText(tableContent: any): any {
  if (!tableContent || !Array.isArray(tableContent.rows)) return tableContent
  return {
    ...tableContent,
    rows: tableContent.rows.map((row: any) => ({
      ...row,
      cells: row.cells.map((cell: any) => {
        if (Array.isArray(cell)) {
          return cell.map((c: any) =>
            c.type === 'math'
              ? { type: 'text', text: `$${c.content}$`, styles: {} }
              : c,
          )
        }
        if (cell && Array.isArray(cell.content)) {
          return {
            ...cell,
            content: cell.content.map((c: any) =>
              c.type === 'math'
                ? { type: 'text', text: `$${c.content}$`, styles: {} }
                : c,
            ),
          }
        }
        return cell
      }),
    })),
  }
}

/**
 * 把块中的 math 行内内容项转回 `$latex$` 文本（供内置序列化器输出）。
 * 递归处理 children 和表格单元格。
 */
function inlineMathToText(blocks: any[]): any[] {
  return blocks.map((block) => {
    const b = { ...block }
    if (Array.isArray(b.content)) {
      b.content = b.content.map((c: any) =>
        c.type === 'math'
          ? { type: 'text', text: `$${c.content}$`, styles: {} }
          : c,
      )
    }
    if (b.type === 'table' && b.content) {
      b.content = tableInlineMathToText(b.content)
    }
    if (Array.isArray(b.children) && b.children.length) {
      b.children = inlineMathToText(b.children)
    }
    return b
  })
}

/**
 * 自定义序列化：mathBlock → `$$...$$`，行内 math → `$...$`，其余内置。
 * 按 mathBlock 分段，保证非 math 连续段（含嵌套列表）序列化正确。
 */
function blocksToMarkdownWithMath(editor: any, blocks: any[]): string {
  const parts: string[] = []
  let buffer: any[] = []
  for (const block of blocks) {
    if (block.type === 'mathBlock') {
      if (buffer.length) {
        parts.push(editor.blocksToMarkdownLossy(inlineMathToText(buffer)))
        buffer = []
      }
      const latex = (block.content || [])
        .map((c: any) => c.text || '')
        .join('')
      parts.push(`$$\n${latex}\n$$`)
    } else {
      buffer.push(block)
    }
  }
  if (buffer.length) parts.push(editor.blocksToMarkdownLossy(inlineMathToText(buffer)))
  return parts.join('\n\n')
}

export function PageEditor() {
  const draft = useKnowledgeStore((s) => s.draft)
  const editDraft = useKnowledgeStore((s) => s.editDraft)
  const { message } = App.useApp()

  /** 最后一次加载进块编辑器的 md（用于判断是否需重载） */
  const lastLoadedMd = useRef<string>('')
  /** 加载期间屏蔽 onChange（避免 replaceBlocks 触发无意义保存） */
  const loadingRef = useRef(false)

  const editor = useCreateBlockNote({
    schema,
    // / 命令已关闭，覆盖默认占位符（BlockNote 0.56 用 dictionary 而非废弃的 placeholders）
    dictionary: {
      ...en,
      placeholders: {
        ...en.placeholders,
        default: 'Enter text to start',
      },
    },
    // 图片仅支持外链 URL
    uploadFile: async () => {
      const url = window.prompt('请输入图片 URL（仅支持外链）')
      return { url: url || '' }
    },
  })

  /** 保存：blocks → md（mathBlock 自定义序列化，其余内置；防抖交给 store） */
  const onContentChange = () => {
    if (loadingRef.current) return
    try {
      const md = blocksToMarkdownWithMath(editor, editor.document)
      lastLoadedMd.current = md
      if (md !== draft?.contentMd) {
        editDraft({ contentMd: md })
      }
    } catch {
      // 序列化失败不打扰用户，下次变更重试
    }
  }

  // 切换页面：contentMd 与已加载不一致时重新加载 blocks
  useEffect(() => {
    if (!draft) return
    if (lastLoadedMd.current === draft.contentMd) return
    loadingRef.current = true
    try {
      const raw = editor.tryParseMarkdownToBlocks(draft.contentMd)
      // 后处理：把 $$...$$ 段落转为 mathBlock（math-block 包不提供 md 解析）
      const blocks = convertMathParagraphs(raw)
      if (blocks.length === 0 && draft.contentMd.trim()) {
        throw new Error('empty')
      }
      editor.replaceBlocks(editor.document, blocks)
      lastLoadedMd.current = draft.contentMd
    } catch {
      message.warning('该页面 Markdown 结构解析异常，部分内容可能未正确显示')
    } finally {
      requestAnimationFrame(() => {
        loadingRef.current = false
      })
    }
  }, [draft, editor, message])

  if (!draft) {
    return (
      <Empty
        description="从左侧目录树选择一个页面开始编辑"
        style={{ marginTop: 120 }}
      />
    )
  }

  const save = SAVE_LABEL[draft.saveState]

  /** 右键插入菜单：在光标所在块下方插入指定类型块 */
  const insertBlockAfterCursor = (
    type: string,
    props: Record<string, unknown> = {},
  ) => {
    const pos = editor.getTextCursorPosition()
    if (!pos?.block) return
    const newBlock: Record<string, unknown> = { type }
    // table 块需要 content: TableContent 结构（2 行 3 列空表格）
    if (type === 'table') {
      newBlock.content = {
        type: 'tableContent',
        rows: [
          { cells: ['', '', ''] },
          { cells: ['', '', ''] },
        ],
      }
    } else {
      newBlock.props = props
    }
    const inserted = editor.insertBlocks(
      [newBlock as never],
      pos.block,
      'after',
    )
    // 插入后把光标移到新块（表格→首个单元格；其余→末尾）
    if (inserted[0]) editor.setTextCursorPosition(inserted[0], 'end')
    editor.focus()
  }

  const contextMenu: MenuProps['items'] = [
    { key: 'paragraph', label: '段落', icon: <AlignLeftOutlined /> },
    {
      key: 'heading',
      label: '标题',
      icon: <FontSizeOutlined />,
      children: [
        { key: 'heading1', label: '一级标题' },
        { key: 'heading2', label: '二级标题' },
        { key: 'heading3', label: '三级标题' },
      ],
    },
    { key: 'bulletListItem', label: '无序列表', icon: <UnorderedListOutlined /> },
    { key: 'numberedListItem', label: '有序列表', icon: <OrderedListOutlined /> },
    { key: 'table', label: '表格', icon: <TableOutlined /> },
    { key: 'codeBlock', label: '代码块', icon: <CodeOutlined /> },
    { key: 'quote', label: '引用', icon: <MessageOutlined /> },
    { key: 'mathBlock', label: '数学公式块', icon: <FunctionOutlined /> },
    { type: 'divider' },
    { key: 'image', label: '图片（外链 URL）', icon: <PictureOutlined /> },
  ]

  const onContextMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'image') {
      const url = window.prompt('请输入图片 URL（仅支持外链）')
      if (url) insertBlockAfterCursor('image', { url })
      return
    }
    const headingMatch = key.match(/^heading([1-6])$/)
    if (headingMatch) {
      insertBlockAfterCursor('heading', { level: Number(headingMatch[1]) })
      return
    }
    insertBlockAfterCursor(key)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <Input
          variant="filled"
          style={{ flex: 1, minWidth: 200, fontSize: 16, fontWeight: 600 }}
          value={draft.title}
          onChange={(e) => editDraft({ title: e.target.value })}
          placeholder="页面标题"
        />
        <TagManager
          tags={draft.tags}
          onChange={(tags) => editDraft({ tags })}
        />
        {save.text && <Tag color={save.color}>{save.text}</Tag>}
      </div>
      {draft.saveState === 'error' && (
        <Alert
          type="error"
          showIcon
          message="自动保存失败，请检查后端服务后重试（修改仍保留在本地）"
          style={{ marginBottom: 8 }}
        />
      )}
      <div
        data-color-mode="light"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          border: '1px solid #f0f0f0',
          borderRadius: 6,
          // 左侧留出 sideMenu（拖拽手柄+添加按钮）空间，防止被裁剪
          paddingLeft: 48,
        }}
      >
        <Dropdown
          menu={{ items: contextMenu, onClick: onContextMenuClick }}
          trigger={['contextMenu']}
        >
          <div style={{ minHeight: '100%' }}>
            <BlockNoteView
              editor={editor}
              theme="light"
              formattingToolbar
              slashMenu={false}
              sideMenu
              linkToolbar
              tableHandles
              onChange={onContentChange}
            />
          </div>
        </Dropdown>
      </div>
    </div>
  )
}


import { useEffect, useRef, useState } from 'react'
import { Alert, App, Dropdown, Empty, Input, Segmented, Tag } from 'antd'
import type { MenuProps } from 'antd'
import MDEditor from '@uiw/react-md-editor'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from '@blocknote/core'
import {
  BlockNoteViewRaw,
  SuggestionMenuController,
  useCreateBlockNote,
  getDefaultReactSlashMenuItems,
} from '@blocknote/react'
import {
  createReactMathBlockSpec,
  createReactInlineMathSpec,
  getMathSlashMenuItems,
} from '@blocknote/math-block'
import '@blocknote/react/style.css'
import { useKnowledgeStore } from '../../stores/knowledgeStore'
import { TagManager } from './TagManager'

/**
 * Page 编辑器（§3.3.2，2026-10-15 改：BlockNote 块编辑器 + 源码模式兜底）
 * - 块模式：BlockNote（Notion/Jupyter 式），支持数学块、拖拽重排、选中浮窗、
 *   右键插入菜单；存储仍为 contentMd（blocksToMarkdownLossy）
 * - 源码模式：@uiw/react-md-editor（KaTeX 渲染），用于复杂 md 结构兜底
 * - 切换页面：tryParseMarkdownToBlocks 加载，失败自动降级源码模式
 * - 编辑后 500ms 防抖保存到 store.editDraft → PUT /api/pages/:id
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

type EditorMode = 'block' | 'source'

export function PageEditor() {
  const draft = useKnowledgeStore((s) => s.draft)
  const editDraft = useKnowledgeStore((s) => s.editDraft)
  const { message } = App.useApp()

  const [mode, setMode] = useState<EditorMode>('block')
  /** 最后一次加载进块编辑器的 md（用于判断是否需重载，解决源码→块模式数据不同步 B2） */
  const lastLoadedMd = useRef<string>('')
  /** 加载期间屏蔽 onChange（避免 replaceBlocks 触发无意义保存 N4） */
  const loadingRef = useRef(false)
  /** 块解析失败是否已自动降级（避免反复弹提示） */
  const fallBackNotified = useRef<string | null>(null)

  const editor = useCreateBlockNote({
    schema,
    // 图片本轮仅支持外链 URL（§3.3.2）：本地上传 prompt 索取 URL，slash 菜单与右键入口行为一致
    uploadFile: async () => {
      const url = window.prompt('请输入图片 URL（本轮仅支持外链）')
      return { url: url || '' }
    },
  })

  /** 保存：blocks → md（防抖交给 store.editDraft 的 500ms，N1） */
  const onContentChange = () => {
    if (loadingRef.current) return
    try {
      const md = editor.blocksToMarkdownLossy()
      lastLoadedMd.current = md // 标记为已加载，避免 effect 立即重载
      if (md !== draft?.contentMd) {
        editDraft({ contentMd: md })
      }
    } catch {
      // 序列化失败不打扰用户，下次变更重试
    }
  }

  // 切换页面 / 源码→块模式：contentMd 与已加载不一致时重新加载 blocks
  useEffect(() => {
    if (!draft || mode !== 'block') return
    if (lastLoadedMd.current === draft.contentMd) return
    loadingRef.current = true
    try {
      const blocks = editor.tryParseMarkdownToBlocks(draft.contentMd)
      // N5：解析结果为空但原文非空 → 降级源码模式
      if (blocks.length === 0 && draft.contentMd.trim()) {
        throw new Error('empty')
      }
      editor.replaceBlocks(editor.document, blocks)
      lastLoadedMd.current = draft.contentMd
    } catch {
      // 解析失败 → 降级源码模式
      if (fallBackNotified.current !== draft.pageId) {
        fallBackNotified.current = draft.pageId
        message.warning('该页面含块编辑器暂不支持的 Markdown 结构，已切换为源码模式')
        setMode('source')
      }
    } finally {
      // replaceBlocks 同步触发 onChange，下一帧再解除屏蔽
      requestAnimationFrame(() => {
        loadingRef.current = false
      })
    }
  }, [draft, mode, editor, message])

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
    editor.insertBlocks(
      [{ type: type as never, props: props as never }],
      pos.block,
      'after',
    )
    editor.focus()
  }

  const contextMenu: MenuProps['items'] = [
    { key: 'paragraph', label: '段落' },
    {
      key: 'heading',
      label: '标题',
      children: [
        { key: 'heading1', label: '一级标题' },
        { key: 'heading2', label: '二级标题' },
        { key: 'heading3', label: '三级标题' },
      ],
    },
    { key: 'bulletListItem', label: '无序列表' },
    { key: 'numberedListItem', label: '有序列表' },
    { key: 'table', label: '表格' },
    { key: 'codeBlock', label: '代码块' },
    { key: 'quote', label: '引用' },
    { key: 'mathBlock', label: '数学公式块' },
    { type: 'divider' },
    { key: 'image', label: '图片（外链 URL）' },
  ]

  const onContextMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'image') {
      const url = window.prompt('请输入图片 URL（本轮仅支持外链）')
      if (url) insertBlockAfterCursor('image', { url })
      return
    }
    // B1 修复：BlockNote 标题块类型为 heading + props.level（无 heading1/2/3）
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
        {/* 模式切换：块模式 / 源码模式（放在 Tags 左侧，§3.3.2） */}
        <Segmented
          size="small"
          value={mode}
          onChange={(v) => setMode(v as EditorMode)}
          options={[
            { label: '块编辑', value: 'block' },
            { label: '源码', value: 'source' },
          ]}
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
        }}
      >
        {mode === 'block' ? (
          <Dropdown
            menu={{ items: contextMenu, onClick: onContextMenuClick }}
            trigger={['contextMenu']}
          >
            <div style={{ height: '100%' }}>
              <BlockNoteViewRaw
                editor={editor}
                theme="light"
                formattingToolbar
                slashMenu
                sideMenu
                linkToolbar
                tableHandles
                onChange={onContentChange}
              >
                <SuggestionMenuController
                  triggerCharacter="/"
                  getItems={async (query) =>
                    [...getDefaultReactSlashMenuItems(editor), ...getMathSlashMenuItems(editor)].filter(
                      (item) =>
                        item.title.toLowerCase().includes(query.toLowerCase()),
                    )
                  }
                />
              </BlockNoteViewRaw>
            </div>
          </Dropdown>
        ) : (
          <div data-color-mode="light" style={{ height: '100%' }}>
            <MDEditor
              style={{ height: '100%' }}
              value={draft.contentMd}
              onChange={(value) => editDraft({ contentMd: value ?? '' })}
              preview="live"
              previewOptions={{
                remarkPlugins: [remarkMath],
                rehypePlugins: [rehypeKatex],
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

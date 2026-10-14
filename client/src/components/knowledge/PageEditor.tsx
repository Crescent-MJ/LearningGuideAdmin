import { Alert, Empty, Input, Tag } from 'antd'
import MDEditor from '@uiw/react-md-editor'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { useKnowledgeStore } from '../../stores/knowledgeStore'
import { TagManager } from './TagManager'

const SAVE_LABEL: Record<string, { text: string; color: string }> = {
  idle: { text: '', color: '' },
  dirty: { text: '未保存…', color: 'orange' },
  saving: { text: '保存中…', color: 'blue' },
  saved: { text: '已保存', color: 'green' },
  error: { text: '保存失败', color: 'red' },
}

/**
 * Page 编辑器（§3.3 / §6.3）：
 * - 顶部标题可编辑；右上角 Tags 管理
 * - @uiw/react-md-editor 实时预览；KaTeX 经 previewOptions 的
 *   remarkPlugins=[remarkMath] + rehypePlugins=[rehypeKatex] 渲染 $…$/$$…$$
 * - 编辑后 500ms 防抖自动保存（store.editDraft → PUT /api/pages/:id）
 */
export function PageEditor() {
  const draft = useKnowledgeStore((s) => s.draft)
  const editDraft = useKnowledgeStore((s) => s.editDraft)

  if (!draft) {
    return (
      <Empty
        description="从左侧目录树选择一个页面开始编辑"
        style={{ marginTop: 120 }}
      />
    )
  }

  const save = SAVE_LABEL[draft.saveState]

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
      {/* data-color-mode 固定浅色主题；编辑器撑满剩余高度 */}
      <div data-color-mode="light" style={{ flex: 1, minHeight: 0 }}>
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
    </div>
  )
}

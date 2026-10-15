import { App, Button, Space } from 'antd'
import { SyncOutlined } from '@ant-design/icons'
import { useKnowledgeStore } from '../../stores/knowledgeStore'
import type { SyncSummary } from '../../api/knowledge'

/**
 * Sync 同步按钮（§3.2.2 外部源接管模型）：
 * - Sync Structure Only：仅同步目录树结构，新增页内容为空
 * - Sync Structure & Course：结构 + 内容全量同步
 * 非破坏性：外部变更不会覆盖本地，失效内容标记 STALE（树中置灰）。
 * 同步目标为侧栏顶部下拉当前选中课程（2026-10-15 改：无锁定机制）。
 */
export function SyncButtons() {
  const { message } = App.useApp()
  const selectedExternalId = useKnowledgeStore((s) => s.selectedExternalId)
  const syncing = useKnowledgeStore((s) => s.syncing)
  const runSync = useKnowledgeStore((s) => s.runSync)

  const doSync = async (kind: 'structure' | 'all') => {
    try {
      const summary: SyncSummary = await runSync(kind)
      if (summary.unchanged) {
        message.info('已与外部源一致，无变更')
      } else {
        message.success(
          `同步完成：新增 ${summary.created} 个节点` +
            (summary.staleMarked > 0
              ? `，标记 ${summary.staleMarked} 个失效节点（置灰，不作为 AI Tutor 知识库）`
              : ''),
        )
      }
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  const disabled = !selectedExternalId

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={4}>
      <Button
        block
        type="link"
        icon={<SyncOutlined spin={syncing} />}
        disabled={disabled || syncing}
        onClick={() => void doSync('structure')}
      >
        Sync Structure Only
      </Button>
      <Button
        block
        type="primary"
        loading={syncing}
        disabled={disabled}
        onClick={() => void doSync('all')}
      >
        Sync Structure &amp; Course
      </Button>
      {disabled && (
        <span style={{ fontSize: 12, color: '#999' }}>
          请先在上方选择同步目标
        </span>
      )}
    </Space>
  )
}

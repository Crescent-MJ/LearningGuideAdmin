import { useEffect, useState } from 'react'
import { Select, Tag, Typography } from '../ui'
import { SearchBox } from '../knowledge/SearchBox'
import { CourseTree } from '../knowledge/CourseTree'
import { SyncButtons } from '../knowledge/SyncButtons'
import { useKnowledgeStore } from '../../stores/knowledgeStore'
import type { ExternalCourseStatus } from '../../api/knowledge'
import { tokens } from '../../theme/tokens'

const STATUS_META: Record<
  ExternalCourseStatus['status'],
  { color: string; label: string }
> = {
  not_synced: { color: 'default', label: '未同步' },
  synced: { color: 'green', label: '已同步' },
  has_updates: { color: 'orange', label: '有更新' },
}

/**
 * 左侧边栏（§3.1/§3.2.2）：外部课程选择器 + 目录树 + 搜索框 + 底部 Sync 按钮。
 * 同步目标选中即切换（2026-10-15 改：锁定/解锁机制移除），树只显示目标对应本地课程；
 * 本地课程由同步产生，不提供手动新建课程入口（用户拍板：新建课程彻底移除）。
 */
export function Sidebar() {
  const externalCourses = useKnowledgeStore((s) => s.externalCourses)
  const selectedExternalId = useKnowledgeStore((s) => s.selectedExternalId)
  const loadExternalCourses = useKnowledgeStore((s) => s.loadExternalCourses)
  const selectExternal = useKnowledgeStore((s) => s.selectExternal)

  const [keyword, setKeyword] = useState('')

  // 首次进入拉取外部源列表
  useEffect(() => {
    void loadExternalCourses()
  }, [loadExternalCourses])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: tokens.spacing.md,
      }}
    >
      <div style={{ marginBottom: tokens.spacing.sm }}>
        <Typography.Text type="secondary" style={{ fontSize: tokens.fontSize.md }}>
          同步目标（外部源课程）
        </Typography.Text>
        <Select
          style={{ width: '100%', marginTop: tokens.spacing.xs }}
          placeholder="选择外部课程作为同步目标"
          value={selectedExternalId ?? undefined}
          onSelect={(v: string) => void selectExternal(v)}
          options={externalCourses.map((e) => ({
            value: e.externalId,
            label: (
              <span
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: tokens.spacing.sm,
                  width: '100%',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {e.title}
                </span>
                <Tag color={STATUS_META[e.status].color} style={{ marginInlineEnd: 0, flexShrink: 0 }}>
                  {STATUS_META[e.status].label}
                </Tag>
              </span>
            ),
          }))}
        />
      </div>
      <SearchBox value={keyword} onChange={setKeyword} />
      <div style={{ flex: 1, overflow: 'auto', marginTop: tokens.spacing.sm }}>
        <CourseTree keyword={keyword} />
      </div>
      <div style={{ marginTop: tokens.spacing.sm }}>
        <SyncButtons />
      </div>
    </div>
  )
}

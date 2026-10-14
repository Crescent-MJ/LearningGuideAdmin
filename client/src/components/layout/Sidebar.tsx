import { useEffect, useState } from 'react'
import { Button, Select, Tag, Typography } from 'antd'
import { LockOutlined, UnlockOutlined } from '@ant-design/icons'
import { SearchBox } from '../knowledge/SearchBox'
import { CourseTree } from '../knowledge/CourseTree'
import { SyncButtons } from '../knowledge/SyncButtons'
import { useKnowledgeStore } from '../../stores/knowledgeStore'
import type { ExternalCourseStatus } from '../../api/knowledge'

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
 * 同步目标先在外部源列表中定位并「锁定」，解锁后才能更换；本地课程由同步产生，
 * 不提供手动新建课程入口（用户拍板：新建课程彻底移除）。
 */
export function Sidebar() {
  const externalCourses = useKnowledgeStore((s) => s.externalCourses)
  const selectedExternalId = useKnowledgeStore((s) => s.selectedExternalId)
  const externalLocked = useKnowledgeStore((s) => s.externalLocked)
  const loadExternalCourses = useKnowledgeStore((s) => s.loadExternalCourses)
  const selectExternal = useKnowledgeStore((s) => s.selectExternal)
  const unlockExternal = useKnowledgeStore((s) => s.unlockExternal)

  const [keyword, setKeyword] = useState('')

  // 首次进入拉取外部源列表
  useEffect(() => {
    void loadExternalCourses()
  }, [loadExternalCourses])

  const selected = externalCourses.find((e) => e.externalId === selectedExternalId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 12 }}>
      <div style={{ marginBottom: 8 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          同步目标（外部源课程）
        </Typography.Text>
        {externalLocked && selected ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginTop: 4,
              padding: '6px 8px',
              border: '1px solid #91caff',
              borderRadius: 6,
              background: '#e6f4ff',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <LockOutlined style={{ color: '#1677ff' }} />
              <Typography.Text ellipsis style={{ maxWidth: 140 }}>
                {selected.title}
              </Typography.Text>
              <Tag color={STATUS_META[selected.status].color} style={{ marginInlineEnd: 0 }}>
                {STATUS_META[selected.status].label}
              </Tag>
            </span>
            <Button
              size="small"
              type="text"
              icon={<UnlockOutlined />}
              onClick={unlockExternal}
            >
              解锁
            </Button>
          </div>
        ) : (
          <Select
            style={{ width: '100%', marginTop: 4 }}
            placeholder="选择外部课程以定位同步目标"
            value={selectedExternalId ?? undefined}
            onSelect={(v: string) => selectExternal(v)}
            options={externalCourses.map((e) => ({
              value: e.externalId,
              label: (
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span>{e.title}</span>
                  <Tag color={STATUS_META[e.status].color} style={{ marginInlineEnd: 0 }}>
                    {STATUS_META[e.status].label}
                  </Tag>
                </span>
              ),
            }))}
          />
        )}
      </div>
      <SearchBox value={keyword} onChange={setKeyword} />
      <div style={{ flex: 1, overflow: 'auto', marginTop: 8 }}>
        <CourseTree keyword={keyword} />
      </div>
      <div style={{ marginTop: 8 }}>
        <SyncButtons />
      </div>
    </div>
  )
}

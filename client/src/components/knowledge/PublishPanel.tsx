import { useCallback, useEffect, useState } from 'react'
import { App, Button, Input, Modal, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { knowledgeApi, type ReleaseSummary } from '../../api/knowledge'
import { useKnowledgeStore } from '../../stores/knowledgeStore'

/**
 * Publish 版本发布面板（§3.4）：
 * - 表格列：Course Name / Revision Notes / Current Version（可点击）/ Action
 * - 点击版本号 → Modal 展示历史版本（版本号、发布时间、备注；只读，无回滚）
 * - Publish → Modal 必填 Revision Notes → POST /api/courses/:id/release → 刷新
 */
export function PublishPanel() {
  const { message } = App.useApp()
  const courses = useKnowledgeStore((s) => s.courses)
  const [latest, setLatest] = useState<Record<string, ReleaseSummary[]>>({})
  const [historyCourse, setHistoryCourse] = useState<string | null>(null)
  const [publishCourse, setPublishCourse] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [publishing, setPublishing] = useState(false)

  const loadReleases = useCallback(async () => {
    const map: Record<string, ReleaseSummary[]> = {}
    await Promise.all(
      courses.map(async (c) => {
        map[c.id] = await knowledgeApi.listReleases(c.id)
      }),
    )
    setLatest(map)
  }, [courses])

  useEffect(() => {
    void loadReleases()
  }, [loadReleases])

  const doPublish = async () => {
    if (!publishCourse || !notes.trim()) return
    setPublishing(true)
    try {
      await knowledgeApi.publish(publishCourse, notes.trim())
      message.success('发布成功')
      setPublishCourse(null)
      setNotes('')
      await loadReleases()
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setPublishing(false)
    }
  }

  const columns: ColumnsType<(typeof courses)[number]> = [
    { title: 'Course Name', dataIndex: 'title' },
    {
      title: 'Revision Notes',
      key: 'notes',
      render: (_, record) => {
        const list = latest[record.id]
        const note = list?.[0]?.revisionNotes
        return note || (
          <Typography.Text type="secondary">No revision notes provided</Typography.Text>
        )
      },
    },
    {
      title: 'Current Version',
      key: 'version',
      render: (_, record) => {
        const current = latest[record.id]?.[0]
        if (!current) {
          return <Typography.Text type="secondary">未发布</Typography.Text>
        }
        return (
          <a onClick={() => setHistoryCourse(record.id)}>{current.versionTag}</a>
        )
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button type="primary" size="small" onClick={() => setPublishCourse(record.id)}>
          Publish
        </Button>
      ),
    },
  ]

  const historyList = historyCourse ? latest[historyCourse] ?? [] : []

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={courses}
        pagination={false}
        size="middle"
      />

      {/* 历史版本列表（§3.4.2：只读查看，无回滚） */}
      <Modal
        open={!!historyCourse}
        title="历史版本"
        footer={null}
        onCancel={() => setHistoryCourse(null)}
        width={640}
      >
        {historyList.length === 0 ? (
          <Typography.Text type="secondary">暂无发布记录</Typography.Text>
        ) : (
          historyList.map((r) => (
            <div key={r.id} style={{ marginBottom: 12 }}>
              <Tag color="geekblue">{r.versionTag}</Tag>
              <Typography.Text type="secondary">
                {new Date(r.createdAt).toLocaleString('zh-CN')}
              </Typography.Text>
              <div>
                <Typography.Text>{r.revisionNotes}</Typography.Text>
              </div>
            </div>
          ))
        )}
      </Modal>

      {/* 发布 Modal（§3.4.3：Revision Notes 必填） */}
      <Modal
        open={!!publishCourse}
        title={`发布课程「${courses.find((c) => c.id === publishCourse)?.title ?? ''}」全部页面快照`}
        okText="发布"
        cancelText="取消"
        confirmLoading={publishing}
        okButtonProps={{ disabled: !notes.trim() }}
        onOk={doPublish}
        onCancel={() => {
          setPublishCourse(null)
          setNotes('')
        }}
      >
        <Typography.Paragraph type="secondary">
          Publish 将发布整个课程下所有页面的快照（非单个页面）。
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          placeholder="Revision Notes（必填）"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
        />
      </Modal>
    </div>
  )
}

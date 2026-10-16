import { useEffect } from 'react'
import { Select, Typography } from '../components/ui'
import { ConfigPanel } from '../components/ai/ConfigPanel'
import { ChatWindow } from '../components/ai/ChatWindow'
import { useAiStore } from '../stores/aiStore'
import { tokens } from '../theme/tokens'

const { Title } = Typography

/**
 * AI Tutor 页面（§4.1）：
 * 顶部栏（课程标题 + Change Course）+ 左侧配置面板 + 右侧对话窗口。
 */
export function AITutor() {
  const init = useAiStore((s) => s.init)
  const courses = useAiStore((s) => s.courses)
  const selectedCourseId = useAiStore((s) => s.selectedCourseId)
  const selectCourse = useAiStore((s) => s.selectCourse)
  const selectedCourse = courses.find((c) => c.id === selectedCourseId)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <div
      style={{
        height: 'calc(100vh - 140px)',
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing.md,
      }}
    >
      {/* 顶部栏：课程标题 + Change Course（§4.1） */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          padding: '0 4px',
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          {selectedCourse?.title ?? 'AI Tutor'}
        </Title>
        <Select
          value={selectedCourseId ?? undefined}
          placeholder="Change Course"
          style={{ minWidth: 220 }}
          onChange={(v) => void selectCourse(v)}
          options={courses.map((c) => ({ value: c.id, label: c.title }))}
        />
      </div>
      {/* 主体：左配置 + 右对话 */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: tokens.spacing.md }}>
        <div style={{ width: 340, flexShrink: 0 }}>
          <ConfigPanel />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ChatWindow />
        </div>
      </div>
    </div>
  )
}

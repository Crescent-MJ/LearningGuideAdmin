import { useEffect, useRef, useState } from 'react'
import { Alert, Avatar, Button, Card, Empty, Input, Segmented, Space, Spin, Tag } from 'antd'
import { PlusOutlined, RobotOutlined, SendOutlined, UserOutlined } from '@ant-design/icons'
import MDEditor from '@uiw/react-md-editor'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { useAiStore, type ChatMessage } from '../../stores/aiStore'

const katexPlugins = {
  remarkPlugins: [remarkMath],
  rehypePlugins: [rehypeKatex],
}

/** 默认头像占位（后续可替换为课程/用户自定义头像） */
const AI_AVATAR = <RobotOutlined />
const USER_AVATAR = <UserOutlined />

/** 单条消息气泡：带头像，AI 左侧灰底，用户右侧蓝底（§4.3.4） */
function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 8,
      }}
    >
      <Avatar
        icon={isUser ? USER_AVATAR : AI_AVATAR}
        style={{
          backgroundColor: isUser ? '#1677ff' : '#52c41a',
          flexShrink: 0,
        }}
      />
      <div
        style={{
          maxWidth: '75%',
          background: isUser ? '#1677ff' : '#f5f5f5',
          color: isUser ? '#fff' : 'inherit',
          padding: '8px 12px',
          borderRadius: 8,
          whiteSpace: isUser ? 'pre-wrap' : 'normal',
        }}
      >
        {msg.content ? (
          <div data-color-mode="light">
            <MDEditor.Markdown
              source={msg.content}
              {...katexPlugins}
              style={{ background: 'transparent', fontSize: 14 }}
            />
          </div>
        ) : (
          <Spin size="small" />
        )}
      </div>
    </div>
  )
}

/**
 * AI Tutor 右侧对话面板（§4.3）：模式切换 / New Chat / 流式消息列表 / 输入框。
 */
export function ChatWindow() {
  const mode = useAiStore((s) => s.mode)
  const messages = useAiStore((s) => s.messages)
  const streaming = useAiStore((s) => s.streaming)
  const error = useAiStore((s) => s.error)
  const selectedCourseId = useAiStore((s) => s.selectedCourseId)
  const currentReleaseTag = useAiStore((s) => s.config?.currentReleaseTag)
  const setMode = useAiStore((s) => s.setMode)
  const newChat = useAiStore((s) => s.newChat)
  const send = useAiStore((s) => s.send)

  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  // 流式增量时保持滚动到底部
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  const onSend = async () => {
    const text = input
    setInput('')
    await send(text)
  }

  return (
    <Card
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 } }}
      title={
        <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
          {/* 左侧：激活版本号 + Testing 徽章（§4.3.1） */}
          <Space>
            <span style={{ fontSize: 14 }}>{currentReleaseTag ?? '未发布'}</span>
            <Tag color="green">Testing</Tag>
          </Space>
          {/* 中间：模式切换（蓝色高亮选中项） */}
          <Segmented
            className="ai-mode-segmented"
            value={mode}
            onChange={(v) => void setMode(v as 'LECTURE' | 'SOCRATIC')}
            options={[
              { label: 'Lecture', value: 'LECTURE' },
              { label: 'Socratic', value: 'SOCRATIC' },
            ]}
          />
          {/* 右侧：New Chat */}
          <Button size="small" icon={<PlusOutlined />} onClick={newChat}>
            New Chat
          </Button>
        </Space>
      }
    >
      {error && (
        <Alert type="error" message={error} showIcon closable style={{ marginBottom: 8 }} />
      )}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '4px 0',
        }}
      >
        {messages.length === 0 ? (
          <Empty description={selectedCourseId ? '开始对话吧' : '请先在顶部选择课程'} />
        ) : (
          messages.map((m, i) => <Bubble key={`${m.createdAt}-${i}`} msg={m} />)
        )}
      </div>
      <Space.Compact style={{ marginTop: 12, width: '100%' }}>
        <Input.TextArea
          value={input}
          autoSize={{ minRows: 1, maxRows: 4 }}
          placeholder={selectedCourseId ? 'Ask the tutor a question...' : '请先选择课程'}
          disabled={!selectedCourseId || streaming}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault()
              void onSend()
            }
          }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={streaming}
          disabled={!selectedCourseId || !input.trim()}
          onClick={() => void onSend()}
        >
          Send
        </Button>
      </Space.Compact>
    </Card>
  )
}

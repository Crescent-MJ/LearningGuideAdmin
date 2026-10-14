import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Empty, Input, Segmented, Space, Spin } from 'antd'
import { PlusOutlined, SendOutlined } from '@ant-design/icons'
import MDEditor from '@uiw/react-md-editor'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { useAiStore, type ChatMessage } from '../../stores/aiStore'

const katexPlugins = {
  remarkPlugins: [remarkMath],
  rehypePlugins: [rehypeKatex],
}

/** 单条消息气泡：user 右对齐纯文本，ai 左侧 Markdown+KaTeX（§4.3.4） */
function Bubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            maxWidth: '80%',
            background: '#1677ff',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: 8,
            whiteSpace: 'pre-wrap',
          }}
        >
          {msg.content}
        </div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div
        style={{
          maxWidth: '85%',
          background: '#f5f5f5',
          padding: '8px 12px',
          borderRadius: 8,
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
        <Space>
          <Segmented
            value={mode}
            onChange={(v) => void setMode(v as 'LECTURE' | 'SOCRATIC')}
            options={[
              { label: 'Lecture', value: 'LECTURE' },
              { label: 'Socratic', value: 'SOCRATIC' },
            ]}
          />
          <Button size="small" icon={<PlusOutlined />} onClick={newChat}>
            New Chat
          </Button>
        </Space>
      }
    >
      {error && (
        <Alert type="error" message={error} showIcon closable style={{ marginBottom: 8 }} />
      )}
      <div ref={listRef} style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 ? (
          <Empty description={selectedCourseId ? '开始对话吧' : '请先在左侧选择课程'} />
        ) : (
          messages.map((m, i) => <Bubble key={`${m.createdAt}-${i}`} msg={m} />)
        )}
      </div>
      <Space.Compact style={{ marginTop: 12, width: '100%' }}>
        <Input.TextArea
          value={input}
          autoSize={{ minRows: 1, maxRows: 4 }}
          placeholder={selectedCourseId ? '输入问题，Enter 发送' : '请先选择课程'}
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
          发送
        </Button>
      </Space.Compact>
    </Card>
  )
}

import { useEffect } from 'react'
import { ConfigPanel } from '../components/ai/ConfigPanel'
import { ChatWindow } from '../components/ai/ChatWindow'
import { useAiStore } from '../stores/aiStore'

/**
 * AI Tutor 页面（§4.1）：左侧配置面板 + 右侧对话窗口。
 */
export function AITutor() {
  const init = useAiStore((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <div style={{ height: 'calc(100vh - 140px)', display: 'flex', gap: 12 }}>
      <div style={{ width: 340, flexShrink: 0 }}>
        <ConfigPanel />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <ChatWindow />
      </div>
    </div>
  )
}

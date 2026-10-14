import { ReadOutlined, RobotOutlined } from '@ant-design/icons'

export type ModuleKey = 'knowledge' | 'ai-tutor'

const ITEMS: { key: ModuleKey; label: string; icon: React.ReactNode }[] = [
  { key: 'knowledge', label: 'Knowledge', icon: <ReadOutlined /> },
  { key: 'ai-tutor', label: 'AI Tutor', icon: <RobotOutlined /> },
]

/**
 * 左侧模块导航列（§3.1 排版对齐设计稿 2026-10-14）：
 * Knowledge / AI Tutor 两个模块入口，当前模块高亮。
 */
export function ModuleNav({
  active,
  onChange,
}: {
  active: ModuleKey
  onChange: (key: ModuleKey) => void
}) {
  return (
    <nav
      style={{
        width: 160,
        flexShrink: 0,
        background: '#fff',
        borderRight: '1px solid #f0f0f0',
        padding: '12px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {ITEMS.map((item) => {
        const isActive = item.key === active
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              fontSize: 14,
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              textAlign: 'left',
              background: isActive ? '#e6f4ff' : 'transparent',
              color: isActive ? '#1677ff' : '#333',
              fontWeight: isActive ? 600 : 400,
            }}
          >
            {item.icon}
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

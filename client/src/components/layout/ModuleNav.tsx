import { ReadOutlined, RobotOutlined } from '@ant-design/icons'
import { tokens } from '../../theme/tokens'

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
        background: tokens.color.bg.container,
        borderRight: `1px solid ${tokens.color.border}`,
        padding: `${tokens.spacing.md}px ${tokens.spacing.sm}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing.xs,
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
              gap: tokens.spacing.sm,
              padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
              fontSize: tokens.fontSize.xl,
              border: 'none',
              borderRadius: tokens.radius.md,
              cursor: 'pointer',
              textAlign: 'left',
              background: isActive ? tokens.color.primaryBg : 'transparent',
              color: isActive ? tokens.color.primary : tokens.color.text.primary,
              fontWeight: isActive ? tokens.fontWeight.semibold : tokens.fontWeight.normal,
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

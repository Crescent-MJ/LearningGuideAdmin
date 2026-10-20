import { tokens } from '../../theme/tokens'
import { KnowledgeLayersIcon, AiTutorIcon } from '../icons'

export type ModuleKey = 'knowledge' | 'ai-tutor'

const ITEMS: { key: ModuleKey; label: string; icon: React.ReactNode }[] = [
  {
    key: 'knowledge',
    label: 'Knowledge',
    icon: <KnowledgeLayersIcon size={18} />,
  },
  { key: 'ai-tutor', label: 'AI Tutor', icon: <AiTutorIcon size={18} /> },
]

/**
 * 左侧模块导航列（对齐 Figma 设计库 2026-10-16）：
 * Knowledge / AI Tutor 两个模块入口，当前模块高亮（主色 #1D6BFF，浅底 #E8F0FF）。
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
        height: '100%',
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
              fontWeight: isActive ? tokens.fontWeight.semibold : tokens.fontWeight.medium,
              transition: 'all 0.15s ease',
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

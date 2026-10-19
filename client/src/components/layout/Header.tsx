import { Avatar, Layout, Typography } from '../ui'
import { tokens } from '../../theme/tokens'
import { LogoIcon, BellIcon } from '../icons'

const { Header } = Layout

/**
 * 顶部导航（对齐 Figma 设计库 2026-10-19）：
 * 白底；左侧 logo（蓝色圆角底 + 白色学士帽）+ 产品名；右侧通知铃铛 + 当前用户。
 * 高度 68px，边框 #E8EDF5，主色 #1D6BFF。
 */
export function AppHeader() {
  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.md,
        background: tokens.color.bg.container,
        borderBottom: `1px solid ${tokens.color.border}`,
        padding: `0 ${tokens.spacing.xl}px`,
        height: 68,
        lineHeight: '68px',
      }}
    >
      <LogoIcon size={36} />
      <Typography.Text
        strong
        style={{ fontSize: tokens.fontSize['3xl'], color: tokens.color.text.primary }}
      >
        Learning Guide BackOffice
      </Typography.Text>
      <div style={{ flex: 1 }} />
      <BellIcon size={18} color={tokens.color.text.icon} />
      <Avatar
        size={32}
        style={{
          background: tokens.color.primary,
          fontSize: tokens.fontSize.xl,
          marginLeft: tokens.spacing.md,
        }}
      >
        J
      </Avatar>
      <div style={{ lineHeight: 1.3 }}>
        <div
          style={{
            fontSize: tokens.fontSize.xl,
            fontWeight: tokens.fontWeight.semibold,
            color: tokens.color.text.primary,
          }}
        >
          Jack
        </div>
        <div style={{ fontSize: tokens.fontSize.md, color: tokens.color.text.tertiary }}>
          Admin
        </div>
      </div>
    </Header>
  )
}

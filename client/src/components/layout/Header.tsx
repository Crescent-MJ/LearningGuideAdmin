import { Avatar, Layout, Typography } from '../ui'
import { BellOutlined, BookOutlined } from '@ant-design/icons'
import { tokens } from '../../theme/tokens'

const { Header } = Layout

/**
 * 顶部导航（§3.1 排版对齐设计稿 2026-10-14）：
 * 白底；左侧 logo + 产品名；右侧通知铃铛 + 当前用户（演示身份，静态占位）。
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
        height: 56,
        lineHeight: '56px',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: tokens.radius.md,
          background: tokens.color.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <BookOutlined style={{ color: tokens.color.bg.container, fontSize: tokens.fontSize['2xl'] }} />
      </div>
      <Typography.Text strong style={{ fontSize: tokens.fontSize['2xl'] }}>
        Learning Guide BackOffice
      </Typography.Text>
      <div style={{ flex: 1 }} />
      <BellOutlined style={{ fontSize: tokens.fontSize['2xl'], color: tokens.color.text.icon }} />
      <Avatar
        size={30}
        style={{
          background: tokens.color.primary,
          fontSize: tokens.fontSize.lg,
          marginLeft: tokens.spacing.md,
        }}
      >
        J
      </Avatar>
      <div style={{ lineHeight: 1.2 }}>
        <div style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold }}>
          Jack
        </div>
        <div style={{ fontSize: tokens.fontSize.md, color: tokens.color.text.tertiary }}>
          Admin
        </div>
      </div>
    </Header>
  )
}

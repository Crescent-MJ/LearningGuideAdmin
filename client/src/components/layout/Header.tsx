import { Avatar, Layout, Typography } from 'antd'
import { BellOutlined, BookOutlined } from '@ant-design/icons'

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
        gap: 12,
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        padding: '0 24px',
        height: 56,
        lineHeight: '56px',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#1677ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <BookOutlined style={{ color: '#fff', fontSize: 16 }} />
      </div>
      <Typography.Text strong style={{ fontSize: 16 }}>
        Learning Guide BackOffice
      </Typography.Text>
      <div style={{ flex: 1 }} />
      <BellOutlined style={{ fontSize: 16, color: '#666' }} />
      <Avatar
        size={30}
        style={{ background: '#1677ff', fontSize: 14, marginLeft: 12 }}
      >
        J
      </Avatar>
      <div style={{ lineHeight: 1.2 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Jack</div>
        <div style={{ fontSize: 11, color: '#999' }}>Admin</div>
      </div>
    </Header>
  )
}

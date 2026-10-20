import { useState } from 'react'
import { Layout } from '../ui'
import { AppHeader } from './Header'
import { ModuleNav, type ModuleKey } from './ModuleNav'
import { tokens } from '../../theme/tokens'

const { Sider, Content } = Layout

/** 模块导航列宽度（收起前）；收起后宽度 0 */
const NAV_WIDTH = 160

interface MainLayoutProps {
  activeModule: ModuleKey
  onModuleChange: (key: ModuleKey) => void
  /** 左侧课程树列；仅 Knowledge 模块传入 */
  sidebar?: React.ReactNode
  /** 顶部整宽 Tab 栏（横跨课程树列 + 内容区，位于同步目标上方）；仅 Knowledge 模块传入（2026-10-19） */
  topBar?: React.ReactNode
  children: React.ReactNode
}

/**
 * 主布局（对齐 Figma 设计库；2026-10-19 增加整宽 topBar、模块导航列可收起）：
 * 顶部 Header + 模块导航列（Knowledge / AI Tutor，可收起）+（可选）整宽 Tab 栏 + 课程树列 + 内容区。
 * topBar 横跨「课程树列 + 内容区」并位于课程树列上方（对齐 Figma 帧 1.1 Page Editor 665:543）。
 * 内容区与课程树列均为页面灰底 `#F8FAFC` 上的白色圆角卡片（`ui/Panel`，2026-10-19 卡片化）。
 * 模块导航列收起把手为半圆括号式贴边把手，位于该列右边缘垂直居中；点击后整列向左滑出隐藏（宽 160 → 0），把手随停靠到最左边缘。
 */
export function MainLayout({
  activeModule,
  onModuleChange,
  sidebar,
  topBar,
  children,
}: MainLayoutProps) {
  const [navCollapsed, setNavCollapsed] = useState(false)
  return (
    <Layout style={{ height: '100vh' }}>
      <AppHeader />
      <Layout style={{ flexDirection: 'row', flex: 1, minHeight: 0 }}>
        {/* 模块导航列（2026-10-19 可收起：整列向左滑出；右侧半圆括号式贴边把手） */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: navCollapsed ? 0 : NAV_WIDTH,
              height: '100%',
              overflow: 'hidden',
              transition: 'width 0.2s ease',
            }}
          >
            <ModuleNav active={activeModule} onChange={onModuleChange} />
          </div>
          {/* 半圆括号式贴边把手：外侧整边圆弧、内侧平直，紧贴导航列右边缘垂直居中（不跨边界） */}
          <button
            type="button"
            aria-label={navCollapsed ? '展开模块导航' : '收起模块导航'}
            title={navCollapsed ? '展开模块导航' : '收起模块导航'}
            onClick={() => setNavCollapsed((v) => !v)}
            style={{
              position: 'absolute',
              left: navCollapsed ? 0 : NAV_WIDTH,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 22,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              // 半圆括号：右侧整边为半椭圆（外侧圆弧），左侧平直贴边
              borderRadius: '0 50% 50% 0',
              border: `1px solid ${tokens.color.border}`,
              borderLeft: 'none',
              background: tokens.color.bg.container,
              color: tokens.color.text.icon,
              cursor: 'pointer',
              zIndex: 10,
              boxShadow: tokens.shadow.card,
              // 与导航列宽度过渡同步，避免把手瞬移与列动画脱节
              transition: 'left 0.2s ease',
            }}
          >
            <span
              style={{
                fontSize: tokens.fontSize['2xl'],
                fontWeight: tokens.fontWeight.bold,
                lineHeight: 1,
              }}
            >
              {navCollapsed ? '❯' : '❮'}
            </span>
          </button>
        </div>
        <Layout style={{ flexDirection: 'column', flex: 1, minWidth: 0 }}>
          {topBar}
          <Layout style={{ flexDirection: 'row', flex: 1, minHeight: 0 }}>
            {sidebar && (
              <Sider
                width={300}
                theme="light"
                style={{
                  // 侧栏卡片化（2026-10-19）：去掉右边框、底色改页面灰底并留出内边距，
                  // 使内部课程树列以白色圆角卡片形式悬浮（与右侧内容面板对称统一）
                  overflow: 'visible',
                  background: tokens.color.bg.layout,
                  padding: tokens.spacing.lg,
                }}
              >
                {sidebar}
              </Sider>
            )}
            <Content
              style={{
                padding: tokens.spacing.lg,
                overflow: 'hidden',
                background: tokens.color.bg.layout,
              }}
            >
              {children}
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </Layout>
  )
}

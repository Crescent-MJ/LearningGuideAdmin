import { Layout } from 'antd'
import { AppHeader } from './Header'
import { ModuleNav, type ModuleKey } from './ModuleNav'

const { Sider, Content } = Layout

interface MainLayoutProps {
  activeModule: ModuleKey
  onModuleChange: (key: ModuleKey) => void
  /** 左侧课程树列；仅 Knowledge 模块传入 */
  sidebar?: React.ReactNode
  children: React.ReactNode
}

/**
 * 主布局（§3.1 排版对齐设计稿 2026-10-14）：
 * 顶部 Header + 模块导航列（Knowledge / AI Tutor）+ 可选课程树列 + 右侧内容区
 */
export function MainLayout({
  activeModule,
  onModuleChange,
  sidebar,
  children,
}: MainLayoutProps) {
  return (
    <Layout style={{ height: '100vh' }}>
      <AppHeader />
      <Layout style={{ flexDirection: 'row' }}>
        <ModuleNav active={activeModule} onChange={onModuleChange} />
        {sidebar && (
          <Sider
            width={300}
            theme="light"
            style={{ borderRight: '1px solid #f0f0f0', overflow: 'hidden' }}
          >
            {sidebar}
          </Sider>
        )}
        <Content
          style={{ padding: 16, overflow: 'hidden', background: '#fff' }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

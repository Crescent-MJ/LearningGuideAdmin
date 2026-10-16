import { useState } from 'react'
import { App as AntApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { MainLayout } from './components/layout/MainLayout'
import type { ModuleKey } from './components/layout/ModuleNav'
import { Sidebar } from './components/layout/Sidebar'
import { KnowledgeSystem } from './pages/KnowledgeSystem'
import { AITutor } from './pages/AITutor'
import { tokens } from './theme/tokens'

/**
 * 全局主题（2026-10-16 新增）：
 * 将设计 token 注入 Ant Design ConfigProvider。
 * 注意：仅注入与 antd v5 默认值一致的 token，避免改变 antd 组件内部外观（零视觉变化）。
 * antd 内部使用的 borderRadius(6)/colorBorder(#d9d9d9)/colorText(rgba 0.88)/colorTextSecondary(rgba 0.65)
 * 保持默认；业务组件自身的边框/文字/圆角通过 tokens.* 内联样式控制。
 * 未来接入 Figma 设计库时，可在此处扩展注入范围。
 */
const themeConfig = {
  token: {
    colorPrimary: tokens.color.primary,
    colorSuccess: tokens.color.success,
    colorWarning: tokens.color.warning,
    colorError: tokens.color.error,
    fontSize: tokens.fontSize.xl,
  },
}

function App() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('knowledge')

  return (
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      {/* App 包裹层：提供 message/modal 上下文（§3.2.2 全量同步警告弹框等） */}
      <AntApp>
        <MainLayout
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          sidebar={activeModule === 'knowledge' ? <Sidebar /> : undefined}
        >
          {activeModule === 'knowledge' ? <KnowledgeSystem /> : <AITutor />}
        </MainLayout>
      </AntApp>
    </ConfigProvider>
  )
}

export default App

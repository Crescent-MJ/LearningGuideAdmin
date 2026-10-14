import { useState } from 'react'
import { App as AntApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { MainLayout } from './components/layout/MainLayout'
import type { ModuleKey } from './components/layout/ModuleNav'
import { Sidebar } from './components/layout/Sidebar'
import { KnowledgeSystem } from './pages/KnowledgeSystem'
import { AITutor } from './pages/AITutor'

function App() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('knowledge')

  return (
    <ConfigProvider locale={zhCN}>
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

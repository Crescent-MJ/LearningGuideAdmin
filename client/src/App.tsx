import { useState } from 'react'
import { App as AntApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { MainLayout } from './components/layout/MainLayout'
import type { ModuleKey } from './components/layout/ModuleNav'
import { Sidebar } from './components/layout/Sidebar'
import {
  KnowledgeTabBar,
  type KnowledgeTabKey,
} from './components/knowledge/KnowledgeTabBar'
import { KnowledgeSystem } from './pages/KnowledgeSystem'
import { AITutor, AITutorTopBar } from './pages/AITutor'
import { tokens } from './theme/tokens'

/**
 * 全局主题（对齐 Figma 设计库 2026-10-16；内容面板统一 2026-10-19）：
 * 将设计 token 注入 Ant Design ConfigProvider，使 antd 组件（按钮/输入框/标签等）
 * 自动使用 Figma 配色（主色 #1D6BFF、边框 #E8EDF5、基础圆角 8px）。
 * `borderRadiusLG=12`：Card/Modal 等大容器圆角对齐 Figma 主内容面板（12px）。
 * `components.Input/Select`：输入类描边 #E2E8F0、底色 #FAFBFC，对齐 Figma 输入控件规格。
 */
const themeConfig = {
  token: {
    colorPrimary: tokens.color.primary,
    colorSuccess: tokens.color.success,
    colorWarning: tokens.color.warning,
    colorError: tokens.color.error,
    colorBorder: tokens.color.border,
    colorBorderSecondary: tokens.color.border,
    borderRadius: tokens.radius.md,
    borderRadiusLG: tokens.radius.lg,
    fontSize: tokens.fontSize.xl,
  },
  components: {
    // 输入类（输入框 / 文本域）：描边 #E2E8F0、底色 #FAFBFC（Figma 输入控件规格）
    Input: {
      colorBorder: tokens.color.inputBorder,
      colorBgContainer: tokens.color.inputBg,
    },
    // 下拉选择（输入类同类控件）：同样对齐 Figma 描边与底色
    Select: {
      colorBorder: tokens.color.inputBorder,
      colorBgContainer: tokens.color.inputBg,
    },
  },
}

function App() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('knowledge')
  const [knowledgeTab, setKnowledgeTab] = useState<KnowledgeTabKey>('pages')

  return (
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      {/* App 包裹层：提供 message/modal 上下文（§3.2.2 全量同步警告弹框等） */}
      <AntApp>
        <MainLayout
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          topBar={
            // Knowledge：整宽 Tab 栏；AI Tutor：与之展示方式一致的课程标题栏（2026-10-20）
            activeModule === 'knowledge' ? (
              <KnowledgeTabBar active={knowledgeTab} onChange={setKnowledgeTab} />
            ) : (
              <AITutorTopBar />
            )
          }
          sidebar={
            // 课程树边栏仅在 "Knowledge Pages" Tab 显示；"Releases" Tab 下隐藏（保留最左侧模块导航列）
            activeModule === 'knowledge' && knowledgeTab === 'pages' ? <Sidebar /> : undefined
          }
        >
          {activeModule === 'knowledge' ? (
            <KnowledgeSystem tab={knowledgeTab} />
          ) : (
            <AITutor />
          )}
        </MainLayout>
      </AntApp>
    </ConfigProvider>
  )
}

export default App

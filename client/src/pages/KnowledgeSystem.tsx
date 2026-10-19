import { useEffect } from 'react'
import { PageEditor } from '../components/knowledge/PageEditor'
import { PublishPanel } from '../components/knowledge/PublishPanel'
import type { KnowledgeTabKey } from '../components/knowledge/KnowledgeTabBar'
import { useKnowledgeStore } from '../stores/knowledgeStore'

/**
 * 知识库主页内容区（§3.1；2026-10-19 改）。
 * 顶部整宽 Tab 栏（KnowledgeTabBar）由 App 经 MainLayout 的 topBar 插槽渲染，
 * 本组件只按选中的 Tab 键渲染对应内容：`pages` → 编辑器，`publish` → 版本发布面板。
 */
export function KnowledgeSystem({ tab }: { tab: KnowledgeTabKey }) {
  const loadCourses = useKnowledgeStore((s) => s.loadCourses)

  useEffect(() => {
    void loadCourses()
  }, [loadCourses])

  return (
    <div style={{ height: '100%', minHeight: 0 }}>
      {tab === 'publish' ? <PublishPanel /> : <PageEditor />}
    </div>
  )
}

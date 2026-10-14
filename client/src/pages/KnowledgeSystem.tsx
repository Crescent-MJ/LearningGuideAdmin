import { useEffect, useState } from 'react'
import { Tabs } from 'antd'
import { PageEditor } from '../components/knowledge/PageEditor'
import { PublishPanel } from '../components/knowledge/PublishPanel'
import { useKnowledgeStore } from '../stores/knowledgeStore'

/**
 * 知识库主页右侧内容区（§3.1）：
 * Tab 1 Knowledge Pages（编辑器）/ Tab 2 Publish（版本发布）。
 */
export function KnowledgeSystem() {
  const loadCourses = useKnowledgeStore((s) => s.loadCourses)
  const [tab, setTab] = useState('pages')

  useEffect(() => {
    void loadCourses()
  }, [loadCourses])

  return (
    <Tabs
      activeKey={tab}
      onChange={setTab}
      style={{ height: '100%' }}
      tabBarStyle={{ marginBottom: 8 }}
      items={[
        {
          key: 'pages',
          label: 'Knowledge Pages',
          children: (
            <div style={{ height: 'calc(100vh - 180px)' }}>
              <PageEditor />
            </div>
          ),
        },
        {
          key: 'publish',
          label: 'Publish',
          children: (
            <div style={{ height: 'calc(100vh - 180px)' }}>
              <PublishPanel />
            </div>
          ),
        },
      ]}
    />
  )
}

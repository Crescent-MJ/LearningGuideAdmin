import { useEffect, useMemo, useState } from 'react'
import { App, Dropdown, Tree, Modal, Input, Tooltip } from 'antd'
import type { TreeDataNode } from 'antd'
import {
  BookOutlined,
  FileTextOutlined,
  FolderOutlined,
  MoreOutlined,
} from '@ant-design/icons'
import { useKnowledgeStore } from '../../stores/knowledgeStore'

/**
 * 三级课程目录树（§3.2.1）：Course → Lesson → Page。
 * - Course 节点展开/收起（展开时经 store 懒加载详情）
 * - Page 节点点击选中 → 右侧编辑器加载
 * - keyword 按页面标题过滤树节点
 * - 节点悬停菜单：新建章节/页面、删除
 */
export function CourseTree({ keyword }: { keyword: string }) {
  const { message, modal } = App.useApp()
  const courses = useKnowledgeStore((s) => s.courses)
  const details = useKnowledgeStore((s) => s.details)
  const selectedCourseId = useKnowledgeStore((s) => s.selectedCourseId)
  const selectedPageId = useKnowledgeStore((s) => s.selectedPageId)
  const toggleExpand = useKnowledgeStore((s) => s.toggleExpand)
  const selectPage = useKnowledgeStore((s) => s.selectPage)
  const createLesson = useKnowledgeStore((s) => s.createLesson)
  const createPage = useKnowledgeStore((s) => s.createPage)
  const deleteCourse = useKnowledgeStore((s) => s.deleteCourse)
  const deleteLesson = useKnowledgeStore((s) => s.deleteLesson)
  const deletePage = useKnowledgeStore((s) => s.deletePage)

  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])
  const [inputState, setInputState] = useState<{
    kind: 'lesson' | 'page'
    courseId: string
    lessonId?: string
  } | null>(null)
  const [inputValue, setInputValue] = useState('')

  // 首次加载所有课程详情，保证搜索可按页面标题过滤（§3.2.1）
  useEffect(() => {
    void (async () => {
      for (const c of courses) {
        if (!useKnowledgeStore.getState().details[c.id]) {
          await useKnowledgeStore.getState().refreshDetail(c.id)
        }
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses.length])

  const kw = keyword.trim().toLowerCase()

  const treeData = useMemo<TreeDataNode[]>(() => {
    return courses
      .map((course) => {
        const detail = details[course.id]
        const lessons = (detail?.lessons ?? [])
          .map((lesson) => {
            const pages = lesson.pages
              .filter((p) => !kw || p.title.toLowerCase().includes(kw))
              .map((p) => ({
                key: `page:${course.id}:${p.id}`,
                title: p.title,
                icon: <FileTextOutlined />,
                isLeaf: true,
                _stale: p.syncState === 'STALE',
                _ops: { courseId: course.id, pageId: p.id } as const,
              }))
            if (kw && pages.length === 0) return null
            return {
              key: `lesson:${course.id}:${lesson.id}`,
              title: lesson.title,
              icon: <FolderOutlined />,
              children: pages,
              _stale: lesson.syncState === 'STALE',
              _ops: { courseId: course.id, lessonId: lesson.id } as const,
            }
          })
          .filter(Boolean) as TreeDataNode[]
        if (kw && lessons.length === 0) return null
        return {
          key: `course:${course.id}`,
          title: course.title,
          icon: <BookOutlined />,
          children: lessons,
          _ops: { courseId: course.id } as const,
        }
      })
      .filter(Boolean) as TreeDataNode[]
  }, [courses, details, kw])

  // 搜索时自动展开命中分支
  useEffect(() => {
    if (!kw) return
    const keys: React.Key[] = []
    for (const node of treeData) {
      keys.push(node.key)
      for (const lesson of node.children ?? []) {
        keys.push(lesson.key)
      }
    }
    setExpandedKeys(keys)
  }, [kw, treeData])

  const handleSelect = (keys: React.Key[]) => {
    const key = keys[0]
    if (typeof key !== 'string' || !key.startsWith('page:')) return
    const [, courseId, pageId] = key.split(':')
    void selectPage(courseId, pageId)
  }

  const handleExpand = (keys: React.Key[]) => {
    const prev = new Set(expandedKeys.map(String))
    for (const k of keys) {
      const s = String(k)
      if (s.startsWith('course:') && !prev.has(s)) {
        void toggleExpand(s.slice(7))
      }
    }
    setExpandedKeys(keys)
  }

  const openCreate = (kind: 'lesson' | 'page', courseId: string, lessonId?: string) => {
    setInputState({ kind, courseId, lessonId })
    setInputValue('')
  }

  const submitCreate = async () => {
    if (!inputState || !inputValue.trim()) return
    const { kind, courseId, lessonId } = inputState
    try {
      if (kind === 'lesson') {
        await createLesson(courseId, inputValue.trim())
      } else if (lessonId) {
        await createPage(courseId, lessonId, inputValue.trim())
      }
      setInputState(null)
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  const confirmDelete = (label: string, action: () => Promise<void>) => {
    modal.confirm({
      title: `删除${label}？`,
      content: '该操作不可撤销。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await action()
          message.success('已删除')
        } catch (e) {
          message.error((e as Error).message)
        }
      },
    })
  }

  const menuFor = (node: TreeDataNode) => {
    const ops = (
      node as unknown as {
        _ops?: { courseId: string; lessonId?: string; pageId?: string }
      }
    )._ops
    if (!ops) return null
    if (ops.pageId) {
      return {
        items: [{ key: 'del-page', label: '删除页面', danger: true }],
        onClick: ({ key }: { key: string }) => {
          if (key === 'del-page')
            confirmDelete('页面', () => deletePage(ops.courseId, ops.pageId!))
        },
      }
    }
    if (ops.lessonId) {
      return {
        items: [
          { key: 'new-page', label: '新建页面' },
          { key: 'del-lesson', label: '删除章节', danger: true },
        ],
        onClick: ({ key }: { key: string }) => {
          if (key === 'new-page') openCreate('page', ops.courseId, ops.lessonId)
          if (key === 'del-lesson')
            confirmDelete('章节（含其下所有页面）', () =>
              deleteLesson(ops.courseId, ops.lessonId!),
            )
        },
      }
    }
    return {
      items: [
        { key: 'new-lesson', label: '新建章节' },
        { key: 'del-course', label: '删除课程', danger: true },
      ],
      onClick: ({ key }: { key: string }) => {
        if (key === 'new-lesson') openCreate('lesson', ops.courseId)
        if (key === 'del-course')
          confirmDelete('课程', () => deleteCourse(ops.courseId))
      },
    }
  }

  return (
    <>
      <Tree
        showIcon
        blockNode
        treeData={treeData}
        expandedKeys={expandedKeys}
        selectedKeys={
          selectedCourseId && selectedPageId
            ? [`page:${selectedCourseId}:${selectedPageId}`]
            : []
        }
        onExpand={handleExpand}
        onSelect={handleSelect}
        titleRender={(node) => {
          const stale = (node as unknown as { _stale?: boolean })._stale
          return (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {stale ? (
              <Tooltip title="该节点与外部源不同步，不会作为 AI Tutor 知识库使用；内容已失效，可自行复制所需内容后删除">
                <span style={{ color: '#bfbfbf', fontStyle: 'italic' }}>
                  {node.title as string}
                </span>
              </Tooltip>
            ) : (
              <span>{node.title as string}</span>
            )}
            {menuFor(node) && (
              <Dropdown menu={menuFor(node)!} trigger={['click']}>
                <MoreOutlined
                  onClick={(e) => e.stopPropagation()}
                  style={{ padding: '0 4px' }}
                />
              </Dropdown>
            )}
          </div>
          )
        }}
      />
      <Modal
        open={!!inputState}
        title={inputState?.kind === 'lesson' ? '新建章节' : '新建页面'}
        okText="创建"
        cancelText="取消"
        onOk={submitCreate}
        onCancel={() => setInputState(null)}
        destroyOnHidden
      >
        <Input
          autoFocus
          placeholder="名称"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPressEnter={submitCreate}
        />
      </Modal>
    </>
  )
}

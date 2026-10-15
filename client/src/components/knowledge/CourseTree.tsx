import { useEffect, useMemo, useRef, useState } from 'react'
import { App, Dropdown, Tree, Modal, Input, Tooltip, Empty } from 'antd'
import type { TreeDataNode } from 'antd'
import {
  BookOutlined,
  FileTextOutlined,
  FolderOutlined,
  MoreOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { useKnowledgeStore } from '../../stores/knowledgeStore'
import { UPLOAD_ALLOWED_EXTENSIONS, UPLOAD_MAX_FILE_SIZE } from '../../api/knowledge'

/**
 * 三级课程目录树（§3.2.1；2026-10-15 改）：Course → Lesson → Page。
 * - 树按同步目标过滤：只显示当前目标对应的本地课程；未同步显示空态提示
 * - 隐藏原生展开箭头，点击课程行展开/收起（行尾 chevron 作提示）
 * - 切换目标后自动恢复该课程上次编辑的页面（§3.2.2）
 * - Page 节点点击选中 → 右侧编辑器加载
 * - keyword 按页面标题过滤树节点
 * - 节点悬停菜单：新建章节/页面、删除、上传文档建页（§3.2.3）
 */
export function CourseTree({ keyword }: { keyword: string }) {
  const { message, modal } = App.useApp()
  const courses = useKnowledgeStore((s) => s.courses)
  const details = useKnowledgeStore((s) => s.details)
  const selectedPageId = useKnowledgeStore((s) => s.selectedPageId)
  const selectedCourseId = useKnowledgeStore((s) => s.selectedCourseId)
  const selectedExternalId = useKnowledgeStore((s) => s.selectedExternalId)
  const externalCourses = useKnowledgeStore((s) => s.externalCourses)
  const toggleExpand = useKnowledgeStore((s) => s.toggleExpand)
  const selectPage = useKnowledgeStore((s) => s.selectPage)
  const createLesson = useKnowledgeStore((s) => s.createLesson)
  const createPage = useKnowledgeStore((s) => s.createPage)
  const deleteCourse = useKnowledgeStore((s) => s.deleteCourse)
  const deleteLesson = useKnowledgeStore((s) => s.deleteLesson)
  const deletePage = useKnowledgeStore((s) => s.deletePage)
  const uploadDocument = useKnowledgeStore((s) => s.uploadDocument)

  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])
  const [inputState, setInputState] = useState<{
    kind: 'lesson' | 'page'
    courseId: string
    lessonId?: string
  } | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetRef = useRef<{ courseId: string; lessonId: string } | null>(null)

  /** 当前同步目标对应的本地课程（§3.2.1 树过滤依据） */
  const visibleCourseId = useMemo(() => {
    if (!selectedExternalId) return null
    return (
      externalCourses.find((e) => e.externalId === selectedExternalId)
        ?.localCourseId ?? null
    )
  }, [externalCourses, selectedExternalId])

  // 目标课程变化：自动展开 + 加载详情 + 恢复上次编辑页（§3.2.2）
  useEffect(() => {
    if (!visibleCourseId) {
      setExpandedKeys([])
      return
    }
    setExpandedKeys([`course:${visibleCourseId}`])
    void (async () => {
      const st = useKnowledgeStore.getState()
      if (!st.details[visibleCourseId]) {
        await st.refreshDetail(visibleCourseId)
      }
      const last = st.lastPageIdByCourse[visibleCourseId]
      const detail = useKnowledgeStore.getState().details[visibleCourseId]
      const exists = detail?.lessons
        .some((l) => l.pages.some((p) => p.id === last))
      if (last && exists && st.selectedPageId !== last) {
        await st.selectPage(visibleCourseId, last)
      }
    })()
  }, [visibleCourseId])

  const kw = keyword.trim().toLowerCase()

  const treeData = useMemo<TreeDataNode[]>(() => {
    return courses
      .filter((course) => course.id === visibleCourseId)
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
          selectable: false,
          children: lessons,
          _ops: { courseId: course.id } as const,
        }
      })
      .filter(Boolean) as TreeDataNode[]
  }, [courses, details, kw, visibleCourseId])

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

  /** 点击课程/章节行：展开/收起（原生箭头已隐藏，§3.2.1）；courseId 传入时触发懒加载 */
  const toggleRow = (key: string, courseId?: string) => {
    setExpandedKeys((prev) => {
      if (prev.map(String).includes(key)) {
        return prev.filter((k) => String(k) !== key)
      }
      if (courseId) void toggleExpand(courseId)
      return [...prev, key]
    })
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

  /** 上传文档建页（§3.2.3）：前端预校验 → store.uploadDocument */
  const startUpload = (courseId: string, lessonId: string) => {
    uploadTargetRef.current = { courseId, lessonId }
    fileInputRef.current?.click()
  }

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 允许重复选同一文件
    const target = uploadTargetRef.current
    if (!file || !target) return
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!(UPLOAD_ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
      message.error(`格式暂不支持：${ext}（支持 ${UPLOAD_ALLOWED_EXTENSIONS.join(' / ')}）`)
      return
    }
    if (file.size > UPLOAD_MAX_FILE_SIZE) {
      message.error('文件大小超过 15MB 限制')
      return
    }
    setUploading(true)
    try {
      await uploadDocument(target.courseId, target.lessonId, file)
      message.success(`已创建页面「${file.name}」`)
    } catch (err) {
      message.error((err as Error).message)
    } finally {
      setUploading(false)
    }
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
          { key: 'upload', label: uploading ? '上传中…' : '上传文档建页', disabled: uploading },
          { key: 'del-lesson', label: '删除章节', danger: true },
        ],
        onClick: ({ key }: { key: string }) => {
          if (key === 'new-page') openCreate('page', ops.courseId, ops.lessonId)
          if (key === 'upload') startUpload(ops.courseId, ops.lessonId!)
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

  if (!selectedExternalId) {
    return (
      <span style={{ fontSize: 12, color: '#999' }}>
        请在上方选择同步目标
      </span>
    )
  }
  if (!visibleCourseId) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <span style={{ fontSize: 12 }}>
            该课程尚未同步，点击下方 Sync 拉取
          </span>
        }
      />
    )
  }

  return (
    <>
      <div className="course-tree-no-switcher">
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
            const key = String(node.key)
            const isCourse = key.startsWith('course:')
            const isLesson = key.startsWith('lesson:')
            const expanded = expandedKeys.map(String).includes(key)
            const onRowClick = isCourse
              ? () => toggleRow(key, key.slice(7))
              : isLesson
                ? () => toggleRow(key)
                : undefined
            return (
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={onRowClick}
              >
                {stale ? (
                  <Tooltip title="该节点与外部源不同步，不会作为 AI Tutor 知识库使用；内容已失效，可自行复制所需内容后删除">
                    <span style={{ color: '#bfbfbf', fontStyle: 'italic' }}>
                      {node.title as string}
                    </span>
                  </Tooltip>
                ) : (
                  <span>{node.title as string}</span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {(isCourse || isLesson) && (
                    <RightOutlined
                      style={{
                        fontSize: 10,
                        color: '#999',
                        transition: 'transform 0.2s',
                        transform: expanded ? 'rotate(90deg)' : 'none',
                      }}
                    />
                  )}
                  {menuFor(node) && (
                    <Dropdown menu={menuFor(node)!} trigger={['click']}>
                      <MoreOutlined
                        onClick={(e) => e.stopPropagation()}
                        style={{ padding: '0 4px' }}
                      />
                    </Dropdown>
                  )}
                </span>
              </div>
            )
          }}
        />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={UPLOAD_ALLOWED_EXTENSIONS.join(',')}
        style={{ display: 'none' }}
        onChange={onFileChosen}
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

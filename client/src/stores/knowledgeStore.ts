import { create } from 'zustand'
import {
  knowledgeApi,
  type Course,
  type CourseDetail,
  type ExternalCourseStatus,
  type PageNode,
  type SyncSummary,
} from '../api/knowledge'

/** 编辑器草稿状态（§3.3：编辑后 500ms 防抖自动保存） */
export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

interface PageDraft {
  pageId: string
  title: string
  contentMd: string
  tags: string[]
  saveState: SaveState
}

interface KnowledgeState {
  courses: Course[]
  /** 已加载详情的课程（树数据按课程懒加载，展开时填充） */
  details: Record<string, CourseDetail>
  expandedCourseIds: string[]
  selectedCourseId: string | null
  selectedPageId: string | null
  /** 每个本地课程上次编辑的页面（§3.2.2：切换同步目标后自动回到上次编辑页） */
  lastPageIdByCourse: Record<string, string>
  draft: PageDraft | null
  loading: boolean

  // 外部源同步（§3.2.2）
  externalCourses: ExternalCourseStatus[]
  /** 当前同步目标（外部课程 externalId）；选中即切换，无锁定机制（2026-10-15 改） */
  selectedExternalId: string | null
  syncing: boolean

  loadCourses: () => Promise<void>
  toggleExpand: (courseId: string) => Promise<void>
  selectPage: (courseId: string, pageId: string) => Promise<void>
  /** 编辑内容：更新本地状态并调度 500ms 防抖保存（§3.3.2） */
  editDraft: (patch: Partial<Pick<PageDraft, 'title' | 'contentMd' | 'tags'>>) => void
  flushSave: () => Promise<void>

  deleteCourse: (id: string) => Promise<void>
  createLesson: (courseId: string, title: string) => Promise<void>
  deleteLesson: (courseId: string, lessonId: string) => Promise<void>
  createPage: (courseId: string, lessonId: string, title: string) => Promise<void>
  deletePage: (courseId: string, pageId: string) => Promise<void>

  refreshDetail: (courseId: string) => Promise<void>

  // 同步动作
  loadExternalCourses: () => Promise<void>
  /** 切换同步目标：先落盘当前草稿，再切树（§3.2.2，无锁定机制） */
  selectExternal: (externalId: string) => Promise<void>
  /** 执行同步并刷新相关树；返回摘要供 UI 提示 */
  runSync: (mode: 'structure' | 'all') => Promise<SyncSummary>

  /** 上传文档建页（§3.2.3）：转换成功后刷新树并选中新页 */
  uploadDocument: (
    courseId: string,
    lessonId: string,
    file: File,
  ) => Promise<void>

  /**
   * 切换激活版本后调用（§3.4.2）：后端已用快照重建整棵草稿树，
   * 本地待保存的防抖草稿必须丢弃（否则旧内容会把已覆盖的树写回去）。
   */
  afterActivateRelease: (courseId: string) => Promise<void>
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  courses: [],
  details: {},
  expandedCourseIds: [],
  selectedCourseId: null,
  selectedPageId: null,
  lastPageIdByCourse: {},
  draft: null,
  loading: false,

  externalCourses: [],
  selectedExternalId: null,
  syncing: false,

  async loadCourses() {
    set({ loading: true })
    try {
      const courses = await knowledgeApi.listCourses()
      set({ courses })
      // 刷新当前选中课程的树数据
      const sel = get().selectedCourseId
      if (sel && get().details[sel]) {
        await get().refreshDetail(sel)
      }
    } finally {
      set({ loading: false })
    }
  },

  async toggleExpand(courseId) {
    const { expandedCourseIds, details } = get()
    if (expandedCourseIds.includes(courseId)) {
      set({ expandedCourseIds: expandedCourseIds.filter((id) => id !== courseId) })
      return
    }
    set({ expandedCourseIds: [...expandedCourseIds, courseId] })
    if (!details[courseId]) {
      const detail = await knowledgeApi.getCourse(courseId)
      set((s) => ({ details: { ...s.details, [courseId]: detail } }))
    }
  },

  async selectPage(courseId, pageId) {
    const detail = get().details[courseId]
    const page = detail?.lessons.flatMap((l) => l.pages).find((p) => p.id === pageId)
    if (!page) return
    // 切换页面前先落盘当前草稿的待保存修改
    await get().flushSave()
    set({
      selectedCourseId: courseId,
      selectedPageId: pageId,
      lastPageIdByCourse: { ...get().lastPageIdByCourse, [courseId]: pageId },
      draft: {
        pageId,
        title: page.title,
        contentMd: page.contentMd,
        tags: page.tags ?? [],
        saveState: 'idle',
      },
    })
  },

  editDraft(patch) {
    const { draft } = get()
    if (!draft) return
    set({
      draft: { ...draft, ...patch, saveState: 'dirty' },
    })
    // 500ms 防抖自动保存（§3.3.2）
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      void get().flushSave()
    }, 500)
  },

  async flushSave() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    const { draft } = get()
    if (!draft || draft.saveState === 'idle' || draft.saveState === 'saving') return
    set((s) => ({ draft: s.draft ? { ...s.draft, saveState: 'saving' } : null }))
    try {
      await knowledgeApi.updatePage(draft.pageId, {
        title: draft.title,
        contentMd: draft.contentMd,
        tags: draft.tags,
      })
      // 保存成功后同步树数据中的页面信息
      const courseId = get().selectedCourseId
      if (courseId) await get().refreshDetail(courseId)
      const cur = get().draft
      if (cur && cur.pageId === draft.pageId) {
        set({ draft: { ...cur, saveState: 'saved' } })
      }
    } catch {
      const cur = get().draft
      if (cur && cur.pageId === draft.pageId) {
        set({ draft: { ...cur, saveState: 'error' } })
      }
    }
  },

  async loadExternalCourses() {
    const externalCourses = await knowledgeApi.listExternalCourses()
    set({ externalCourses })
  },

  async selectExternal(externalId) {
    if (get().selectedExternalId === externalId) return
    // 切换前落盘当前草稿（§3.2.2）；编辑器清空，由 CourseTree 按目标课程恢复上次编辑页
    await get().flushSave()
    set({ selectedExternalId: externalId, selectedPageId: null, draft: null })
  },

  async runSync(mode) {
    const { selectedExternalId } = get()
    if (!selectedExternalId) throw new Error('未选择外部课程')
    set({ syncing: true })
    try {
      const summary =
        mode === 'structure'
          ? await knowledgeApi.syncStructure(selectedExternalId)
          : await knowledgeApi.syncAll(selectedExternalId)
      // 同步可能新建课程/改变树结构：刷新课程列表、外部状态与受影响课程的树
      await get().loadCourses()
      await get().loadExternalCourses()
      const local = get().externalCourses.find(
        (e) => e.externalId === selectedExternalId,
      )
      if (local?.localCourseId) {
        await get().refreshDetail(local.localCourseId)
      }
      return summary
    } finally {
      set({ syncing: false })
    }
  },

  async uploadDocument(courseId, lessonId, file) {
    const page = await knowledgeApi.uploadFile(lessonId, file)
    await get().refreshDetail(courseId)
    await get().selectPage(courseId, page.id)
  },

  async afterActivateRelease(courseId) {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    set({ draft: null, selectedPageId: null })
    await get().refreshDetail(courseId)
  },

  async deleteCourse(id) {
    await knowledgeApi.deleteCourse(id)
    const { selectedCourseId } = get()
    const details = { ...get().details }
    delete details[id]
    set({
      details,
      ...(selectedCourseId === id
        ? { selectedCourseId: null, selectedPageId: null, draft: null }
        : {}),
    })
    await get().loadCourses()
  },

  async createLesson(courseId, title) {
    await knowledgeApi.createLesson(courseId, { title })
    await get().refreshDetail(courseId)
  },

  async deleteLesson(courseId, lessonId) {
    await knowledgeApi.deleteLesson(lessonId)
    await get().refreshDetail(courseId)
    // 若被删章节含当前选中页，清空编辑器
    const detail = get().details[courseId]
    const pageStillExists = detail?.lessons
      .flatMap((l) => l.pages)
      .some((p) => p.id === get().selectedPageId)
    if (!pageStillExists) {
      set({ draft: null, selectedPageId: null })
    }
  },

  async createPage(courseId, lessonId, title) {
    await knowledgeApi.createPage(lessonId, { title, contentMd: '' })
    await get().refreshDetail(courseId)
  },

  async deletePage(courseId, pageId) {
    await knowledgeApi.deletePage(pageId)
    await get().refreshDetail(courseId)
    if (get().selectedPageId === pageId) {
      set({ draft: null, selectedPageId: null })
    }
  },

  async refreshDetail(courseId) {
    const detail = await knowledgeApi.getCourse(courseId)
    set((s) => ({ details: { ...s.details, [courseId]: detail } }))
  },
}))

/** 从树数据中按 pageId 找 Page（Publish/树渲染用） */
export function findPage(detail: CourseDetail | undefined, pageId: string): PageNode | undefined {
  return detail?.lessons.flatMap((l) => l.pages).find((p) => p.id === pageId)
}

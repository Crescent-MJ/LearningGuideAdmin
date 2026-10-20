import { create } from 'zustand'
import {
  aiApi,
  chatStream,
  type AiConfigView,
  type AiMode,
  type AiTutorListView,
  type PromptTemplate,
} from '../api/ai'
import { knowledgeApi, type Course, type ReleaseSummary } from '../api/knowledge'

/** §4.3.5 对话消息格式（role: user | ai） */
export interface ChatMessage {
  role: 'user' | 'ai'
  content: string
  createdAt: string
}

interface AiForm {
  systemPrompt: string
  welcomeMsg: string
  llmModel: string
}

interface AiState {
  courses: Course[]
  selectedCourseId: string | null
  mode: AiMode
  models: string[]
  templates: { LECTURE?: PromptTemplate; SOCRATIC?: PromptTemplate }
  config: AiConfigView | null
  form: AiForm
  /** 初始表单快照，用于检测未保存修改（§4.2.5 Unsaved changes） */
  initialForm: AiForm | null
  saving: boolean
  messages: ChatMessage[]
  streaming: boolean
  error: string | null
  /** 「管理所有 online」弹窗开关（§4.2.6） */
  tutorManagerOpen: boolean
  /** 全部 AI Tutor 列表（弹窗数据源） */
  tutors: AiTutorListView[]
  tutorsLoading: boolean
  /** 当前课程的 Release 列表（按发布时间倒序；头部 Release 选择器数据源，§4.3.1） */
  releases: ReleaseSummary[]

  init: () => Promise<void>
  selectCourse: (courseId: string) => Promise<void>
  setMode: (mode: AiMode) => Promise<void>
  patchForm: (patch: Partial<AiForm>) => void
  save: () => Promise<boolean>
  reset: () => Promise<void>
  setOnline: (online: boolean) => Promise<void>
  setTutorOnline: (courseId: string, online: boolean) => Promise<void>
  openTutorManager: () => Promise<void>
  closeTutorManager: () => void
  /** 切换「测试所选 Release」（§4.3.1，持久化 aiTestReleaseId，并加载该 Release 的配置） */
  selectRelease: (releaseId: string) => Promise<void>
  /** Set Live：把测试所选 Release 设为上线版本（§3.4.4，轻量） */
  setLive: () => Promise<void>
  newChat: () => void
  send: (text: string) => Promise<void>
  isDirty: () => boolean
}

/** 会话按 courseId+mode 隔离存 localStorage（§4.3.2 拍板：不落库） */
const chatKey = (courseId: string, mode: AiMode) => `aitutor.chat.${courseId}.${mode}`

function loadChat(courseId: string, mode: AiMode): ChatMessage[] | null {
  try {
    const raw = localStorage.getItem(chatKey(courseId, mode))
    return raw ? (JSON.parse(raw) as ChatMessage[]) : null
  } catch {
    return null
  }
}

function persistChat(courseId: string, mode: AiMode, messages: ChatMessage[]) {
  try {
    localStorage.setItem(chatKey(courseId, mode), JSON.stringify(messages))
  } catch {
    /* 存储满等异常不影响会话 */
  }
}

const now = () => new Date().toISOString()

/**
 * 按模式构建表单，与后端同口径（2026-10-20 二次改拍）：
 * System Prompt / Welcome 自定义 > 该模式模板默认；Model 取该模式生效模型（已含默认回退）。
 */
function buildForm(
  config: AiConfigView | null,
  templates: AiState['templates'],
  mode: AiMode,
): AiForm {
  const t = templates[mode]
  const view = mode === 'LECTURE' ? config?.lecture : config?.socratic
  return {
    systemPrompt: view?.systemPrompt || t?.systemPrompt || '',
    welcomeMsg: view?.welcomeMsg || t?.welcomeMsg || '',
    llmModel: view?.model || '',
  }
}

export const useAiStore = create<AiState>((set, get) => ({
  courses: [],
  selectedCourseId: null,
  mode: 'LECTURE',
  models: [],
  templates: {},
  config: null,
  form: { systemPrompt: '', welcomeMsg: '', llmModel: '' },
  initialForm: null,
  saving: false,
  messages: [],
  streaming: false,
  error: null,
  tutorManagerOpen: false,
  tutors: [],
  tutorsLoading: false,
  releases: [],

  async init() {
    const [courses, models, prompts] = await Promise.all([
      knowledgeApi.listCourses(),
      aiApi.listModels(),
      aiApi.listPrompts(),
    ])
    const templates: AiState['templates'] = {}
    for (const p of prompts) {
      if (p.mode === 'LECTURE' || p.mode === 'SOCRATIC') templates[p.mode] = p
    }
    set({ courses, models, templates })
    if (courses.length > 0 && !get().selectedCourseId) {
      await get().selectCourse(courses[0].id)
    }
  },

  async selectCourse(courseId) {
    const { mode, templates } = get()
    try {
      const [config, releases] = await Promise.all([
        aiApi.getConfig(courseId),
        knowledgeApi.listReleases(courseId),
      ])
      const form = buildForm(config, templates, mode)
      const stored = loadChat(courseId, mode)
      set({
        selectedCourseId: courseId,
        config,
        releases,
        form,
        initialForm: { ...form },
        messages: stored ?? (form.welcomeMsg ? [{ role: 'ai', content: form.welcomeMsg, createdAt: now() }] : []),
        error: null,
      })
    } catch (e) {
      // 切换失败不抛（避免未捕获 rejection），错误经 error 状态呈现
      set({ error: (e as Error).message })
    }
  },

  async setMode(mode) {
    try {
      const { selectedCourseId, config, templates } = get()
      if (!selectedCourseId || !config) {
        set({ mode })
        return
      }
      // 2026-10-20 二次改拍：System Prompt / Welcome / Model 三者均载入对应模式的值
      const form = buildForm(config, templates, mode)
      const stored = loadChat(selectedCourseId, mode)
      set({
        mode,
        form,
        initialForm: { ...form },
        messages: stored ?? (form.welcomeMsg ? [{ role: 'ai', content: form.welcomeMsg, createdAt: now() }] : []),
      })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  patchForm(patch) {
    set({ form: { ...get().form, ...patch } })
  },

  isDirty() {
    const { form, initialForm } = get()
    if (!initialForm) return false
    return (
      form.systemPrompt !== initialForm.systemPrompt ||
      form.welcomeMsg !== initialForm.welcomeMsg ||
      form.llmModel !== initialForm.llmModel
    )
  },

  async save() {
    const { selectedCourseId, form, mode } = get()
    if (!selectedCourseId) return false
    set({ saving: true })
    try {
      // 2026-10-20 二次改拍：带 mode，只保存当前模式的三项值
      const payload: Parameters<typeof aiApi.saveConfig>[0] = {
        courseId: selectedCourseId,
        mode,
        llmProvider: 'openrouter',
        llmModel: form.llmModel,
        systemPrompt: form.systemPrompt,
        welcomeMsg: form.welcomeMsg,
      }
      const next = await aiApi.saveConfig(payload)
      set({
        config: next,
        initialForm: { ...form },
        error: null,
      })
      return true
    } catch (e) {
      set({ error: (e as Error).message })
      return false
    } finally {
      set({ saving: false })
    }
  },

  async reset() {
    const { selectedCourseId, mode, templates } = get()
    if (!selectedCourseId) return
    // 2026-10-20 二次改拍：只重置当前模式
    const next = await aiApi.resetConfig(selectedCourseId, mode)
    const form = buildForm(next, templates, mode)
    set({
      config: next,
      form,
      initialForm: { ...form },
    })
  },

  /** §4.2.6 顶部卡片 Online 开关：切换即时生效（当前选中课程） */
  async setOnline(online) {
    const { selectedCourseId, tutors } = get()
    if (!selectedCourseId) return
    try {
      const next = await aiApi.setOnline(selectedCourseId, online)
      set({
        config: next,
        // 同步弹窗列表中同一课程行的状态（若已加载）
        tutors: tutors.map((t) =>
          t.courseId === selectedCourseId ? { ...t, online: next.online } : t,
        ),
        error: null,
      })
    } catch (e) {
      set({ error: (e as Error).message })
      throw e
    }
  },

  /** §4.2.6 弹窗表格行内切换：点即改即存；若为当前课程，同步顶部卡片开关 */
  async setTutorOnline(courseId, online) {
    const next = await aiApi.setOnline(courseId, online)
    set((s) => ({
      tutors: s.tutors.map((t) => (t.courseId === courseId ? { ...t, online: next.online } : t)),
      config: s.selectedCourseId === courseId ? next : s.config,
    }))
  },

  /** 打开「管理所有 online」弹窗并拉取列表（§4.2.6） */
  async openTutorManager() {
    set({ tutorManagerOpen: true, tutorsLoading: true })
    try {
      const tutors = await aiApi.listTutors()
      set({ tutors, tutorsLoading: false })
    } catch (e) {
      set({ tutorsLoading: false, error: (e as Error).message })
    }
  },

  closeTutorManager() {
    set({ tutorManagerOpen: false })
  },

  /** §4.3.1 头部 Release 选择器：切换测试所选 Release 并加载其已保存配置（按当前模式） */
  async selectRelease(releaseId) {
    const { selectedCourseId } = get()
    if (!selectedCourseId) return
    try {
      const next = await aiApi.setActiveRelease(selectedCourseId, releaseId)
      const { mode, templates } = get()
      const form = buildForm(next, templates, mode)
      set({ config: next, form, initialForm: { ...form }, error: null })
    } catch (e) {
      set({ error: (e as Error).message })
      throw e
    }
  },

  /** §3.4.4 Set Live：把测试所选 Release 设为上线版本（轻量），并刷新配置/列表 */
  async setLive() {
    const { selectedCourseId, config } = get()
    if (!selectedCourseId || !config?.releaseId) return
    try {
      await knowledgeApi.setLive(selectedCourseId, config.releaseId)
      const [next, releases] = await Promise.all([
        aiApi.getConfig(selectedCourseId),
        knowledgeApi.listReleases(selectedCourseId),
      ])
      set({ config: next, releases, error: null })
    } catch (e) {
      set({ error: (e as Error).message })
      throw e
    }
  },

  newChat() {
    const { selectedCourseId, mode, form } = get()
    if (!selectedCourseId) return
    const fresh = form.welcomeMsg
      ? [{ role: 'ai' as const, content: form.welcomeMsg, createdAt: now() }]
      : []
    set({ messages: fresh, error: null })
    persistChat(selectedCourseId, mode, fresh)
  },

  async send(text) {
    const { selectedCourseId, mode, messages, streaming } = get()
    const content = text.trim()
    if (!selectedCourseId || !content || streaming) return

    const history = messages
      .filter((m) => m.content.trim())
      .slice(-10)
      .map((m) => ({ role: m.role === 'ai' ? ('assistant' as const) : ('user' as const), content: m.content }))

    const next: ChatMessage[] = [
      ...messages,
      { role: 'user', content, createdAt: now() },
      { role: 'ai', content: '', createdAt: now() },
    ]
    set({ messages: next, streaming: true, error: null })

    try {
      await chatStream(
        { courseId: selectedCourseId, message: content, mode, history },
        (e) => {
          if ('delta' in e) {
            set((s) => {
              const msgs = [...s.messages]
              const last = msgs[msgs.length - 1]
              msgs[msgs.length - 1] = { ...last, content: last.content + e.delta }
              return { messages: msgs }
            })
          } else if ('error' in e) {
            set({ error: e.error })
          }
        },
      )
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      // 落盘当前会话（§4.3.2：localStorage 持久化上次聊天）
      const st = get()
      const msgs = st.messages
      const aiEmpty = msgs.length > 0 && msgs[msgs.length - 1].role === 'ai' && !msgs[msgs.length - 1].content
      persistChat(selectedCourseId, mode, aiEmpty ? msgs.slice(0, -1) : msgs)
      set({ streaming: false })
    }
  },
}))

import { create } from 'zustand'
import { aiApi, chatStream, type AiConfigView, type AiMode, type PromptTemplate } from '../api/ai'
import { knowledgeApi, type Course } from '../api/knowledge'

/** §4.3.4 对话消息格式（role: user | ai） */
export interface ChatMessage {
  role: 'user' | 'ai'
  content: string
  createdAt: string
}

interface AiForm {
  systemPrompt: string
  welcomeMsg: string
  llmModel: string
  /** 新输入的 key；空字符串=不修改（除非 clearApiKey） */
  apiKeyInput: string
  clearApiKey: boolean
}

interface AiState {
  courses: Course[]
  selectedCourseId: string | null
  mode: AiMode
  models: string[]
  templates: { LECTURE?: PromptTemplate; SOCRATIC?: PromptTemplate }
  config: AiConfigView | null
  form: AiForm
  saving: boolean
  messages: ChatMessage[]
  streaming: boolean
  error: string | null

  init: () => Promise<void>
  selectCourse: (courseId: string) => Promise<void>
  setMode: (mode: AiMode) => Promise<void>
  patchForm: (patch: Partial<AiForm>) => void
  save: () => Promise<void>
  reset: () => Promise<void>
  newChat: () => void
  send: (text: string) => Promise<void>
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

/** 有效提示词解析，与后端 resolvePrompts 同口径：自定义 > 默认模板（§4.4.2 第 4 步） */
function effectivePrompts(
  config: AiConfigView | null,
  templates: AiState['templates'],
  mode: AiMode,
): { systemPrompt: string; welcomeMsg: string } {
  const t = templates[mode]
  return {
    systemPrompt: config?.customSystemPrompt || t?.systemPrompt || '',
    welcomeMsg: config?.customWelcomeMsg || t?.welcomeMsg || '',
  }
}

export const useAiStore = create<AiState>((set, get) => ({
  courses: [],
  selectedCourseId: null,
  mode: 'LECTURE',
  models: [],
  templates: {},
  config: null,
  form: { systemPrompt: '', welcomeMsg: '', llmModel: '', apiKeyInput: '', clearApiKey: false },
  saving: false,
  messages: [],
  streaming: false,
  error: null,

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
    const config = await aiApi.getConfig(courseId)
    const eff = effectivePrompts(config, templates, mode)
    const stored = loadChat(courseId, mode)
    set({
      selectedCourseId: courseId,
      config,
      form: {
        systemPrompt: eff.systemPrompt,
        welcomeMsg: eff.welcomeMsg,
        llmModel: config.llmModel,
        apiKeyInput: '',
        clearApiKey: false,
      },
      messages: stored ?? (eff.welcomeMsg ? [{ role: 'ai', content: eff.welcomeMsg, createdAt: now() }] : []),
      error: null,
    })
  },

  async setMode(mode) {
    const { selectedCourseId, config, templates } = get()
    if (!selectedCourseId || !config) {
      set({ mode })
      return
    }
    const eff = effectivePrompts(config, templates, mode)
    const stored = loadChat(selectedCourseId, mode)
    set({
      mode,
      form: { ...get().form, systemPrompt: eff.systemPrompt, welcomeMsg: eff.welcomeMsg },
      messages: stored ?? (eff.welcomeMsg ? [{ role: 'ai', content: eff.welcomeMsg, createdAt: now() }] : []),
    })
  },

  patchForm(patch) {
    set({ form: { ...get().form, ...patch } })
  },

  async save() {
    const { selectedCourseId, form } = get()
    if (!selectedCourseId) return
    set({ saving: true })
    try {
      const payload: Parameters<typeof aiApi.saveConfig>[0] = {
        courseId: selectedCourseId,
        llmProvider: 'openrouter',
        llmModel: form.llmModel,
        customSystemPrompt: form.systemPrompt,
        customWelcomeMsg: form.welcomeMsg,
      }
      if (form.clearApiKey) payload.apiKey = ''
      else if (form.apiKeyInput) payload.apiKey = form.apiKeyInput
      const next = await aiApi.saveConfig(payload)
      set({
        config: next,
        form: { ...form, apiKeyInput: '', clearApiKey: false },
        error: null,
      })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ saving: false })
    }
  },

  async reset() {
    const { selectedCourseId, mode, templates } = get()
    if (!selectedCourseId) return
    const next = await aiApi.resetConfig(selectedCourseId)
    const eff = effectivePrompts(next, templates, mode)
    set({
      config: next,
      form: {
        systemPrompt: eff.systemPrompt,
        welcomeMsg: eff.welcomeMsg,
        llmModel: next.llmModel,
        apiKeyInput: '',
        clearApiKey: false,
      },
    })
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

import { http } from './client'

/** AI Tutor 接口封装（§5.2；chat-stream 为 SSE，在 aiStore 中经 fetch 处理） */

export type AiMode = 'LECTURE' | 'SOCRATIC'

export interface AiConfigView {
  courseId: string
  llmProvider: string
  llmModel: string
  customSystemPrompt: string | null
  customWelcomeMsg: string | null
  lectureTemplateId: string | null
  socraticTemplateId: string | null
  hasApiKey: boolean
}

export interface PromptTemplate {
  id: string
  mode: string
  systemPrompt: string
  welcomeMsg: string
  isDefault: boolean
}

export const aiApi = {
  listModels: () => http.get<string[]>('/ai/models').then((r) => r.data),
  listPrompts: () =>
    http.get<PromptTemplate[]>('/ai/prompts').then((r) => r.data),
  getConfig: (courseId: string) =>
    http.get<AiConfigView>(`/ai/config/${courseId}`).then((r) => r.data),
  saveConfig: (data: {
    courseId: string
    llmProvider: string
    llmModel: string
    customSystemPrompt?: string
    customWelcomeMsg?: string
    apiKey?: string
  }) => http.put<AiConfigView>('/ai/config', data).then((r) => r.data),
  resetConfig: (courseId: string) =>
    http.post<AiConfigView>(`/ai/config/${courseId}/reset`).then((r) => r.data),
}

/** SSE 帧回调：delta 增量 / done 结束 / error 错误 */
export type ChatStreamEvent =
  | { delta: string }
  | { done: true }
  | { error: string }

/**
 * 流式对话（§4.4.1）：POST + fetch ReadableStream（EventSource 不支持 POST）。
 * 非 2xx 时后端返回标准错误信封（§5.3），解析其 message 抛出。
 */
export async function chatStream(
  payload: {
    courseId: string
    message: string
    mode: AiMode
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  },
  onEvent: (e: ChatStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/ai/chat-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.ok || !res.body) {
    let msg = `请求失败（HTTP ${res.status}）`
    try {
      const json = (await res.json()) as { error?: { message?: string } }
      if (json.error?.message) msg = json.error.message
    } catch {
      /* 非 JSON 错误体：使用默认消息 */
    }
    throw new Error(msg)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''
    for (const frame of frames) {
      const line = frame.trim()
      if (!line.startsWith('data:')) continue
      try {
        onEvent(JSON.parse(line.slice(5).trim()) as ChatStreamEvent)
      } catch {
        /* 忽略非 JSON 帧 */
      }
    }
  }
}

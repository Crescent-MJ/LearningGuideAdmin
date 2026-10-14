import { App, Button, Card, Form, Input, Popconfirm, Select, Space, Tag } from 'antd'
import { useAiStore } from '../../stores/aiStore'

/**
 * AI Tutor 左侧配置面板（§4.2）：
 * Change Course / System Prompt / Welcome Message / LLM Model / API Key / Reset / Save。
 */
export function ConfigPanel() {
  const { message } = App.useApp()
  const courses = useAiStore((s) => s.courses)
  const selectedCourseId = useAiStore((s) => s.selectedCourseId)
  const models = useAiStore((s) => s.models)
  const config = useAiStore((s) => s.config)
  const form = useAiStore((s) => s.form)
  const saving = useAiStore((s) => s.saving)
  const patchForm = useAiStore((s) => s.patchForm)
  const selectCourse = useAiStore((s) => s.selectCourse)
  const save = useAiStore((s) => s.save)
  const reset = useAiStore((s) => s.reset)

  const onSave = async () => {
    try {
      await save()
      message.success('AI 配置已保存')
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  const onReset = async () => {
    try {
      await reset()
      message.success('已恢复默认模板')
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  return (
    <Card title="AI Tutor 配置" size="small" style={{ height: '100%', overflow: 'auto' }}>
      <Form layout="vertical" size="small">
        <Form.Item label="Change Course">
          <Select
            value={selectedCourseId ?? undefined}
            placeholder="选择课程"
            onChange={(v) => void selectCourse(v)}
            options={courses.map((c) => ({ value: c.id, label: c.title }))}
          />
        </Form.Item>

        <Form.Item label="LLM Model">
          <Select
            value={form.llmModel || undefined}
            placeholder="选择模型"
            onChange={(v) => patchForm({ llmModel: v })}
            options={models.map((m) => ({ value: m, label: m }))}
          />
        </Form.Item>

        <Form.Item
          label={
            <Space>
              API Key（课程级，可选）
              {config?.hasApiKey && <Tag color="green">已配置</Tag>}
            </Space>
          }
        >
          <Input.Password
            value={form.apiKeyInput}
            placeholder={config?.hasApiKey ? '留空保持不变' : '留空则使用服务端全局 Key'}
            onChange={(e) => patchForm({ apiKeyInput: e.target.value })}
            disabled={form.clearApiKey}
          />
          {config?.hasApiKey && !form.clearApiKey && (
            <Button
              type="link"
              size="small"
              danger
              onClick={() => patchForm({ apiKeyInput: '', clearApiKey: true })}
            >
              清除已存 Key
            </Button>
          )}
          {form.clearApiKey && (
            <Button type="link" size="small" onClick={() => patchForm({ clearApiKey: false })}>
              取消清除
            </Button>
          )}
        </Form.Item>

        <Form.Item label="System Prompt" extra="切换右侧模式时自动载入对应模板/自定义值">
          <Input.TextArea
            rows={6}
            value={form.systemPrompt}
            onChange={(e) => patchForm({ systemPrompt: e.target.value })}
          />
        </Form.Item>

        <Form.Item label="Welcome Message">
          <Input.TextArea
            rows={3}
            value={form.welcomeMsg}
            onChange={(e) => patchForm({ welcomeMsg: e.target.value })}
          />
        </Form.Item>

        <Space>
          <Popconfirm
            title="重置为默认模板？"
            description="将清除当前课程的自定义 Prompt 覆盖"
            okText="重置"
            cancelText="取消"
            onConfirm={onReset}
          >
            <Button>Reset</Button>
          </Popconfirm>
          <Button type="primary" loading={saving} onClick={() => void onSave()}>
            Save
          </Button>
        </Space>
      </Form>
    </Card>
  )
}

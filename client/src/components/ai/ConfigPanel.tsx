import { App, Button, Card, Input, Popconfirm, Select, Space, Typography } from '../ui'
import { useAiStore } from '../../stores/aiStore'
import { tokens } from '../../theme/tokens'

const { Text } = Typography

/** 区块样式：flex 纵向，label 固定、输入区填满剩余高度 */
const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
}
const labelStyle: React.CSSProperties = {
  fontSize: tokens.fontSize.xl,
  fontWeight: tokens.fontWeight.medium,
  marginBottom: tokens.spacing.xs,
  flexShrink: 0,
}
const extraStyle: React.CSSProperties = {
  fontSize: tokens.fontSize.md,
  color: tokens.color.text.secondary,
  marginTop: tokens.spacing.xs,
  flexShrink: 0,
}

/**
 * AI Tutor 左侧配置面板（§4.2）：
 * System Prompt / Welcome Message / LLM Model 按比例分布，底部 Reset + Save 固定。
 * Change Course 已移至页面顶部栏（§4.1）。
 * 注：API Key 统一使用服务端全局 OPENROUTER_API_KEY，课程级覆盖已下线（2026-10-15）。
 */
export function ConfigPanel() {
  const { message } = App.useApp()
  const models = useAiStore((s) => s.models)
  const form = useAiStore((s) => s.form)
  const saving = useAiStore((s) => s.saving)
  const isDirty = useAiStore((s) => s.isDirty)
  const patchForm = useAiStore((s) => s.patchForm)
  const save = useAiStore((s) => s.save)
  const reset = useAiStore((s) => s.reset)

  const dirty = isDirty()

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
    <Card
      title="AI Tutor 配置"
      size="small"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{
        body: {
          flex: 1,
          minHeight: 0,
          padding: tokens.spacing.md,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      {/* System Prompt：占剩余空间的 70%，超出文本框可滚动 */}
      <div style={{ ...sectionStyle, flex: '7 1 0', marginBottom: tokens.spacing.md }}>
        <div style={labelStyle}>System Prompt</div>
        <Input.TextArea
          value={form.systemPrompt}
          onChange={(e) => patchForm({ systemPrompt: e.target.value })}
          style={{
            fontFamily: 'monospace',
            flex: 1,
            minHeight: 0,
            resize: 'none',
          }}
        />
        <div style={extraStyle}>切换右侧模式时自动载入对应模板/自定义值</div>
      </div>

      {/* Welcome Message：占剩余空间的 30%，超出可滚动 */}
      <div style={{ ...sectionStyle, flex: '3 1 0', marginBottom: tokens.spacing.md }}>
        <div style={labelStyle}>Welcome Message</div>
        <Input.TextArea
          value={form.welcomeMsg}
          onChange={(e) => patchForm({ welcomeMsg: e.target.value })}
          style={{ flex: 1, minHeight: 0, resize: 'none' }}
        />
      </div>

      {/* LLM Model：自然高度，不参与比例分配 */}
      <div style={{ ...sectionStyle, flex: '0 0 auto', marginBottom: tokens.spacing.md }}>
        <div style={labelStyle}>LLM Model</div>
        <Select
          value={form.llmModel || undefined}
          placeholder="选择模型"
          onChange={(v) => patchForm({ llmModel: v })}
          options={models.map((m) => ({ value: m, label: m }))}
          style={{ width: '100%' }}
        />
      </div>

      {/* 底部操作栏：固定在最下方；Reset 左、Save 右（§4.2.5） */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          paddingTop: tokens.spacing.sm,
          borderTop: `1px solid ${tokens.color.border}`,
        }}
      >
        <Popconfirm
          title="重置为默认模板？"
          description="将清除当前课程的自定义 Prompt 覆盖"
          okText="重置"
          cancelText="取消"
          onConfirm={onReset}
        >
          <Button type="link" style={{ padding: 0 }}>
            Reset
          </Button>
        </Popconfirm>
        <Space>
          {dirty && <Text type="warning">Unsaved changes</Text>}
          <Button type="primary" loading={saving} onClick={() => void onSave()}>
            Save Configuration
          </Button>
        </Space>
      </div>
    </Card>
  )
}

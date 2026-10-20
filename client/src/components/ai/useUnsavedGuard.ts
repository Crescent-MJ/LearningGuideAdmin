import { App } from '../ui'
import { useAiStore } from '../../stores/aiStore'

/**
 * 未保存改动提醒（§4.3.6，2026-10-20 新增）。
 *
 * 返回 `guard()`，供「会丢弃配置面板未保存改动」的操作在真正执行前调用：
 * - 无未保存改动 → 直接 resolve(true)（无需弹窗）；
 * - 有未保存改动 → 弹窗（保存 / 取消）：
 *   - **保存**：执行 Save Configuration（写当前模式），成功 → true；失败 → false（中止原操作并提示错误）；
 *   - **取消**：不保存 → true（丢弃改动，继续执行原操作）。
 *
 * 触发场景：切换 Lecture/Socratic 模式、切换课程（Change Course）、切换 Release 版本。
 */
export function useUnsavedGuard(): () => Promise<boolean> {
  const { message, modal } = App.useApp()
  const save = useAiStore((s) => s.save)

  return () =>
    new Promise<boolean>((resolve) => {
      if (!useAiStore.getState().isDirty()) {
        resolve(true)
        return
      }
      modal.confirm({
        title: '有未保存的配置改动',
        content:
          '是否保存当前模式下的 System Prompt / Welcome Message / LLM Model 修改？',
        okText: '保存',
        cancelText: '取消',
        onOk: async () => {
          // 保存失败（如后端校验错误）→ 显式提示并返回 false 中止原操作
          const ok = await save()
          if (!ok) {
            message.error(useAiStore.getState().error ?? '保存失败')
          }
          resolve(ok)
        },
        onCancel: () => resolve(true),
      })
    })
}

import { forwardRef } from 'react'
import { tokens } from '../../theme/tokens'

/**
 * 内容面板封装（2026-10-19 新增，对齐 Figma）：
 * 白色 / 圆角 12（radius.lg）/ 无边框 / 卡片阴影（shadow.card），
 * 统一 Knowledge Pages、Knowledge Releases 与 AI Tutor 三个内容区的外观。
 */
export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 内边距，默认 tokens.spacing.lg(16)；传 0 可关闭 */
  padding?: number
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ padding = tokens.spacing.lg, style, children, ...rest }, ref) => (
    <div
      ref={ref}
      style={{
        height: '100%',
        background: tokens.color.bg.container,
        borderRadius: tokens.radius.lg,
        border: 'none',
        boxShadow: tokens.shadow.card,
        padding,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  ),
)

Panel.displayName = 'Panel'

export default Panel

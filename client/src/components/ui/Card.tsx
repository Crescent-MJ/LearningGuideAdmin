import { forwardRef } from 'react'
import { Card as AntCard } from 'antd'
import type { CardProps as AntCardProps } from 'antd'
import { tokens } from '../../theme/tokens'

/**
 * UI Card 封装（2026-10-19 对齐 Figma）：默认**无边框 + 卡片阴影**，
 * 圆角 12px 由主题 `borderRadiusLG` 提供——使 AI Tutor 等使用 Card 的区域
 * 与 Knowledge 的 `Panel` 外观统一。调用方可传 `variant`/`style` 覆盖。
 */
export interface CardProps extends AntCardProps {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant, style, ...rest }, ref) => {
    return (
      <AntCard
        ref={ref}
        variant={variant ?? 'borderless'}
        style={{ boxShadow: tokens.shadow.card, ...style }}
        {...rest}
      />
    )
  },
)

Card.displayName = 'Card'

export default Card


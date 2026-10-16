import { forwardRef } from 'react'
import { Card as AntCard } from 'antd'
import type { CardProps as AntCardProps } from 'antd'

/**
 * UI Card 封装：透传 Ant Design props，不强制覆盖外观（保持 antd 默认圆角 6px）。
 */
export interface CardProps extends AntCardProps {}

export const Card = forwardRef<HTMLDivElement, CardProps>((props, ref) => {
  return <AntCard ref={ref} {...props} />
})

Card.displayName = 'Card'

export default Card


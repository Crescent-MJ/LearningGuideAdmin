import { forwardRef } from 'react'
import { Button as AntButton } from 'antd'
import type { ButtonProps as AntButtonProps } from 'antd'

/**
 * UI Button 封装（2026-10-16）：
 * - 透传 Ant Design 全部 props（保留原生 type/size API）
 * - 不强制覆盖圆角等外观，保持 antd 默认（零视觉变化）
 * - 未来替换为 Figma 设计库 Button 时，仅修改本文件
 */
export interface ButtonProps extends AntButtonProps {}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    return <AntButton ref={ref} {...props} />
  },
)

Button.displayName = 'Button'

export default Button


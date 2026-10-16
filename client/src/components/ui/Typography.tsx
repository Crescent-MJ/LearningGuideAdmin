import { Typography as AntTypography } from 'antd'
import type { TypographyProps as AntTypographyProps } from 'antd'

/**
 * UI Typography 封装：透传 Ant Design props，暴露 Text/Title/Paragraph 子组件。
 */
export interface TypographyProps extends AntTypographyProps {}

export const Typography = AntTypography
export const Text = AntTypography.Text
export const Title = AntTypography.Title
export const Paragraph = AntTypography.Paragraph

export default Typography

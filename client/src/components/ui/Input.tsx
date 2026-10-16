import { Input as AntInput } from 'antd'
import type { InputProps as AntInputProps } from 'antd'

/**
 * UI Input 封装：透传 Ant Design props（含 TextArea 子组件）。
 */
export interface InputProps extends AntInputProps {}

export const Input = AntInput
export const TextArea = AntInput.TextArea

export default Input

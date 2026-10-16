import { Select as AntSelect } from 'antd'
import type { SelectProps as AntSelectProps } from 'antd'

/**
 * UI Select 封装：透传 Ant Design props。
 */
export interface SelectProps<ValueType = any> extends AntSelectProps<ValueType> {}

export const Select = AntSelect

export default Select

import { Segmented as AntSegmented } from 'antd'
import type { SegmentedProps as AntSegmentedProps } from 'antd'

/**
 * UI Segmented 封装：透传 Ant Design props。
 */
export interface SegmentedProps extends AntSegmentedProps {}

export function Segmented(props: SegmentedProps) {
  return <AntSegmented {...props} />
}

export default Segmented

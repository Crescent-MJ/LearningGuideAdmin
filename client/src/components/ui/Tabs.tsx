import { Tabs as AntTabs } from 'antd'
import type { TabsProps as AntTabsProps } from 'antd'

/**
 * UI Tabs 封装：透传 Ant Design props。
 */
export interface TabsProps extends AntTabsProps {}

export function Tabs(props: TabsProps) {
  return <AntTabs {...props} />
}

export default Tabs

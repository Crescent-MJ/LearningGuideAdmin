import { Tree as AntTree } from 'antd'
import type { TreeProps as AntTreeProps, TreeDataNode } from 'antd'

/**
 * UI Tree 封装：透传 Ant Design props。
 */
export interface TreeProps extends AntTreeProps {}

export function Tree(props: TreeProps) {
  return <AntTree {...props} />
}

export type { TreeDataNode }
export default Tree

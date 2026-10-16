import { Table as AntTable } from 'antd'
import type { TableProps as AntTableProps } from 'antd'

/**
 * UI Table 封装：透传 Ant Design props。
 */
export interface TableProps<RecordType = any> extends AntTableProps<RecordType> {}

export const Table = AntTable

export default Table

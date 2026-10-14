import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'

interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
}

/** 树搜索框：按页面标题过滤（§3.2.1） */
export function SearchBox({ value, onChange }: SearchBoxProps) {
  return (
    <Input
      allowClear
      prefix={<SearchOutlined />}
      placeholder="搜索页面标题…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ marginBottom: 8 }}
    />
  )
}

import { Input } from '../ui'
import { SearchOutlined } from '@ant-design/icons'
import { tokens } from '../../theme/tokens'

interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
}

/** 树搜索框：按页面标题 + Heading（H1-H6）过滤（§3.2.1，2026-10-19 扩展） */
export function SearchBox({ value, onChange }: SearchBoxProps) {
  return (
    <Input
      allowClear
      prefix={<SearchOutlined />}
      placeholder="搜索标题或 heading…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ marginBottom: tokens.spacing.sm }}
    />
  )
}

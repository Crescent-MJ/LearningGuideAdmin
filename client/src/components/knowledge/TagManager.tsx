import { Tag, Input, Button, Space } from '../ui'
import { PlusOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { TAG_PRESET_COLORS } from '../ui'

interface TagManagerProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

/**
 * Tags 管理（§3.3.3）：JSON 数组存储，动态增删，antd Tag 样式。
 * 预设配色集中于 ui/Tag.tsx 的 TAG_PRESET_COLORS（2026-10-16 迁移）。
 */
export function TagManager({ tags, onChange }: TagManagerProps) {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')

  const commit = () => {
    const t = value.trim()
    if (t && !tags.includes(t)) {
      onChange([...tags, t])
    }
    setValue('')
    setAdding(false)
  }

  return (
    <Space size={[0, 4]} wrap>
      {tags.map((tag) => (
        <Tag
          key={tag}
          color={TAG_PRESET_COLORS[tag]}
          closable
          onClose={() => onChange(tags.filter((t) => t !== tag))}
        >
          {tag}
        </Tag>
      ))}
      {adding ? (
        <Input
          size="small"
          autoFocus
          style={{ width: 120 }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onPressEnter={commit}
        />
      ) : (
        <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => setAdding(true)}>
          标签
        </Button>
      )}
    </Space>
  )
}

import { Tag, Input, Button, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useState } from 'react'

interface TagManagerProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

/**
 * Tags 管理（§3.3.3）：JSON 数组存储，动态增删，antd Tag 样式。
 */
const TAG_COLORS: Record<string, string> = {
  'Core Knowledge': 'blue',
  'Teaching Guidance': 'green',
  Misconception: 'orange',
  Assessment: 'purple',
}

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
          // 预设标签按设计稿配色（2026-10-14）：蓝/绿/橙/紫，其余默认
          color={TAG_COLORS[tag]}
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
        <Button
          size="small"
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setAdding(true)}
        >
          标签
        </Button>
      )}
    </Space>
  )
}

import { Avatar as AntAvatar } from 'antd'
import type { AvatarProps as AntAvatarProps } from 'antd'

/**
 * UI Avatar 封装：透传 Ant Design props。
 */
export interface AvatarProps extends AntAvatarProps {}

export function Avatar(props: AvatarProps) {
  return <AntAvatar {...props} />
}

export default Avatar

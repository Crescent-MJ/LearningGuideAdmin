/**
 * 设计 Token 体系（2026-10-16 新增，为 Figma 设计库迁移铺路）
 *
 * 单一事实来源：所有颜色 / 间距 / 字号 / 圆角 / 字重集中于此。
 * 当前值与既有 Ant Design 默认值完全一致，零视觉变化。
 * 未来接入 Figma 设计库时，只需修改本文件即可全局对齐。
 *
 * Token 命名采用语义化（color.primary / spacing.md），
 * 避免与具体库绑定（无论最终接入 code-connect / 独立组件库 / 仅 token，
 * 都只需改本文件 + ui/ 封装层）。
 */

export const color = {
  /** 主色（Ant Design 默认蓝） */
  primary: '#1677ff',
  /** 主色浅底（选中/高亮背景） */
  primaryBg: '#e6f4ff',
  /** 主色浅边框（上传预览虚线等） */
  primaryBorder: '#91caff',
  /** 成功色 */
  success: '#52c41a',
  /** 警告色 */
  warning: '#faad14',
  /** 错误色 */
  error: '#ff4d4f',
  text: {
    /** 主文字色 */
    primary: '#333',
    /** 次要文字色 */
    secondary: '#8c8c8c',
    /** 辅助文字色 */
    tertiary: '#999',
    /** 禁用/失效文字色（STALE 节点等） */
    disabled: '#bfbfbf',
    /** 图标中性色 */
    icon: '#666',
  },
  /** 边框色 */
  border: '#f0f0f0',
  bg: {
    /** 容器底色 */
    container: '#fff',
    /** 布局/页面底色 */
    layout: '#f5f5f5',
    /** 弱化背景（预览区等） */
    subtle: '#fafafa',
  },
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 48,
} as const

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
} as const

export const fontSize = {
  xs: 10,
  sm: 11,
  md: 12,
  lg: 13,
  xl: 14,
  '2xl': 16,
} as const

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
} as const

export const tokens = {
  color,
  spacing,
  radius,
  fontSize,
  fontWeight,
} as const

export type TokenColor = keyof typeof color
export type TokenSpacing = keyof typeof spacing
export type TokenRadius = keyof typeof radius
export type TokenFontSize = keyof typeof fontSize
export type TokenFontWeight = keyof typeof fontWeight

export default tokens

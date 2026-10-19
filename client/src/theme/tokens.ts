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
  /** 主色（Figma 设计库 fill_81baaa3e: #1D6BFF） */
  primary: '#1D6BFF',
  /** 主色加深（Figma fill_f4699796: #145CFF，用于 hover/active） */
  primaryDark: '#145CFF',
  /** 主色浅底（选中/高亮背景） */
  primaryBg: '#E8F0FF',
  /** 主色浅边框 */
  primaryBorder: '#B8CCFF',
  /** 成功色 */
  success: '#52c41a',
  /** 警告色 */
  warning: '#faad14',
  /** 错误色 */
  error: '#ff4d4f',
  text: {
    /** 主文字色（Figma 深石板 #1E293B） */
    primary: '#1E293B',
    /** 次要文字色 */
    secondary: '#64748b',
    /** 辅助文字色 */
    tertiary: '#94a3b8',
    /** 禁用/失效文字色（STALE 节点等） */
    disabled: '#cbd5e1',
    /** 图标中性色 */
    icon: '#475569',
  },
  /** 边框色（Figma fill_7a59ae7b: #E8EDF5） */
  border: '#E8EDF5',
  /** 输入类边框色（Figma fill: #E2E8F0；输入框/文本域/下拉默认描边） */
  inputBorder: '#E2E8F0',
  /** 输入类底色（Figma fill: #FAFBFC；输入框/文本域/下拉默认填充） */
  inputBg: '#FAFBFC',
  bg: {
    /** 容器底色 */
    container: '#fff',
    /** 布局/页面底色（Figma fill_85065e9e: #F8FAFC） */
    layout: '#F8FAFC',
    /** 弱化背景（Figma fill_9b9cf5c5: #E8EBED） */
    subtle: '#E8EBED',
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
  '3xl': 20,
} as const

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const

/** Figma 设计库阴影（effect_c5bd7c6c） */
export const shadow = {
  card: '0px 1px 2px -1px rgba(0, 0, 0, 0.1), 0px 1px 3px 0px rgba(0, 0, 0, 0.1)',
  floating: '0px 4px 16px 0px rgba(0, 0, 0, 0.08), 0px 1px 4px 0px rgba(0, 0, 0, 0.04)',
} as const

export const tokens = {
  color,
  spacing,
  radius,
  fontSize,
  fontWeight,
  shadow,
} as const

export type TokenColor = keyof typeof color
export type TokenSpacing = keyof typeof spacing
export type TokenRadius = keyof typeof radius
export type TokenFontSize = keyof typeof fontSize
export type TokenFontWeight = keyof typeof fontWeight

export default tokens

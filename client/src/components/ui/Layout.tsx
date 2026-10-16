import { Layout as AntLayout } from 'antd'
import type { LayoutProps as AntLayoutProps, SiderProps as AntSiderProps } from 'antd'

/**
 * UI Layout 封装：透传 Ant Design props，暴露 Sider/Header/Content/Footer 子组件。
 */
export interface LayoutProps extends AntLayoutProps {}
export type SiderProps = AntSiderProps

export const Layout = AntLayout
export const Sider = AntLayout.Sider
export const Header = AntLayout.Header
export const Content = AntLayout.Content
export const Footer = AntLayout.Footer

export default Layout

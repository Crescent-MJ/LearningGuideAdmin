import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import './App.css'

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <h1>Learning Guide BackOffice</h1>
      </div>
    </ConfigProvider>
  )
}

export default App

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nProvider } from './hooks/useI18n.jsx'
import './index.css'
import App from './App.jsx'

// 首次渲染完成后启用过渡动画，避免页面初始加载时的过渡闪烁
function bootstrap() {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <I18nProvider>
          <App />
        </I18nProvider>
      </BrowserRouter>
    </StrictMode>,
  )
  // 首次渲染完成后添加 .theme-safe 启用过渡动画
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.add('theme-safe')
    })
  })
}

bootstrap()
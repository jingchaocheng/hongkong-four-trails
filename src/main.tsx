import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { LocaleProvider } from './i18n/LocaleContext'
import { initBaiduTongji } from './utils/baiduTongji'
import './index.css'

initBaiduTongji()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </React.StrictMode>,
)


import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './assets/main.css'

// Electron 极度推荐使用 HashRouter，避免打包后白屏
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <HashRouter>
            <App />
        </HashRouter>
    </React.StrictMode>
)
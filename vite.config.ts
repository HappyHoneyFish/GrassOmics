import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Vite 8.0.0 配置
export default defineConfig({
    plugins: [react()],
    // Electron 桌面应用必须使用相对路径
    base: './',
    root: resolve(__dirname, 'src/renderer'),
    publicDir: resolve(__dirname, 'src/renderer/public'),
    build: {
        outDir: resolve(__dirname, 'dist/renderer'),
        emptyOutDir: true,
        rollupOptions: {
            input: resolve(__dirname, 'src/renderer/index.html')
        }
    },
    server: {
        port: 5173,
        strictPort: true,
        host: '127.0.0.1'
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src/renderer/src')
        }
    }
})
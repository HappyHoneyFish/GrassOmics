import { app, shell, BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from './utils'
import { setupIpcHandlers } from './ipc_handlers'

function createWindow(): void {
    // 获取当前主显示器的工作区尺寸（不包含Windows底部任务栏）
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

    // 算法：左右各留100px(约两指宽)，上下各留60px(约一指宽)
    const windowWidth = Math.floor(screenWidth - 200)
    const windowHeight = Math.floor(screenHeight - 120)

    // 创建大厂 IDE 级别的主窗口
    const mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        minWidth: 1024,
        minHeight: 768,
        center: true, // 强制居中，配合留白产生悬浮高级感
        show: false,  // 先隐藏，等 React 渲染完毕再显示，避免白屏闪烁
        autoHideMenuBar: true, // 隐藏传统菜单栏
        // 启用 Win11 沉浸式标题栏
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#F3F3F3', // 这里的颜色将与我们重构后的侧边栏灰色完美融为一体
            symbolColor: '#333333',
            height: 40
        },
        webPreferences: {
            // 注意：preload 路径保持不变，因为 tsconfig.node.json 将 preload 编译到 dist/main/preload/
            // __dirname (dist/main/main/) -> ../preload/ = dist/main/preload/
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            contextIsolation: true
        }
    })

    // 优雅地展示窗口
    mainWindow.on('ready-to-show', () => {
        mainWindow.show()

        // ██████ 调试技巧 ██████
        // 如果打包后仍然白屏，取消下面注释，安装后运行会自动打开开发者工具查看具体报错
        // if (!is.dev) {
        //     mainWindow.webContents.openDevTools()
        // }
    })

    // 拦截所有的 target="_blank" 链接
    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // 开发环境加载 Vite 端口，生产环境加载打包后的本地 HTML
    if (is.dev) {
        mainWindow.loadURL('http://localhost:5173')
        // 自动打开开发者工具，大厂开发必备
        mainWindow.webContents.openDevTools()
    } else {
        // ██████ 关键修复 ██████
        // 原代码：join(__dirname, '../renderer/index.html')
        // 这会导致路径指向 dist/main/renderer/ (不存在)
        //
        // 修正：需要向上退两级到 dist/ 目录，再进入 renderer/
        // dist/main/main/index.js -> ../../renderer/index.html = dist/renderer/index.html
        const indexPath = join(__dirname, '../../renderer/index.html')

        // 添加加载失败监听，如果白屏会在命令行打印具体错误
        mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
            console.error('[ERROR] 页面加载失败:', errorCode, errorDescription)
            console.error('[ERROR] 尝试加载的路径:', indexPath)
            console.error('[ERROR] __dirname 位置:', __dirname)
        })

        mainWindow.loadFile(indexPath)
    }
}

app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.grassomics.app')

    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    // 注册与 Python 通信的底层桥梁
    setupIpcHandlers()

    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
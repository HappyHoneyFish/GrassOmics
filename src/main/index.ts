import { app, shell, BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from './utils'
import { setupIpcHandlers } from './ipc_handlers'

function createWindow(): void {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

    const windowWidth = Math.floor(screenWidth - 200)
    const windowHeight = Math.floor(screenHeight - 120)

    const mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        minWidth: 1024,
        minHeight: 768,
        center: true,
        show: false,
        autoHideMenuBar: true,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#F3F3F3',
            symbolColor: '#333333',
            height: 40
        },
        webPreferences: {
            // 这个项目最大的难题就在于路径丢失。。。此处记个笔记
            // 注意：preload 路径保持不变，因为 tsconfig.node.json 将 preload 编译到 dist/main/preload/
            // __dirname (dist/main/main/) -> ../preload/ = dist/main/preload/
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            contextIsolation: true
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()

        // 调试用的，打包之后经常白屏，很难查问题，哎。。。
        // 如果打包后仍然白屏，取消下面注释，安装后运行会自动打开开发者工具查看具体报错
        // 用命令行运行程序也能看到报错信息
        // if (!is.dev) {
        //     mainWindow.webContents.openDevTools()
        // }
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    if (is.dev) {
        mainWindow.loadURL('http://localhost:5173')
        mainWindow.webContents.openDevTools()
    } else {
        // 路径问题！！！这里记个笔记
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
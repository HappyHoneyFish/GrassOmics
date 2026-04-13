import { app } from 'electron'

// 1. 模拟 is.dev: 如果应用没有被打包，那就是开发环境
export const is = {
    dev: !app.isPackaged
}

// 2. 模拟 electronApp.setAppUserModelId
export const electronApp = {
    setAppUserModelId: (id: string) => {
        app.setAppUserModelId(id)
    }
}

// 3. 模拟 optimizer (开发环境的热键屏蔽，生产环境直接留空即可)
export const optimizer = {
    watchWindowShortcuts: (window: any) => {
        // 简易实现：防止开发时误触 F5 等按键，这里保持空函数即可让应用正常运行不报错
    }
}
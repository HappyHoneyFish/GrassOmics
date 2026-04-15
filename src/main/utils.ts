import { app } from 'electron'
// 这个文件是因为，直接在main引入@electron会报错，干脆在这里建一个文件过渡一下

export const is = {
    dev: !app.isPackaged
}

export const electronApp = {
    setAppUserModelId: (id: string) => {
        app.setAppUserModelId(id)
    }
}

export const optimizer = {
    watchWindowShortcuts: (window: any) => {
        // 笔记：简易实现，防止开发时误触 F5 等按键，这里保持空函数即可让应用正常运行不报错
    }
}
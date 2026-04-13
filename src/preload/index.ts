import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 这里的名字和参数，必须和我们前面主进程中的 handle 名字一一对应
const api = {
    openFileDialog: (options: any) => ipcRenderer.invoke('dialog:openFile', options),
    runPython: (moduleName: string, params: any) => ipcRenderer.invoke('python:run', moduleName, params)
}

// 采用最新的 Electron 推荐的安全上下文隔离模式
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        console.error('API 注入前端失败:', error)
    }
} else {
    // @ts-ignore (为了兼容非隔离模式)
    window.electron = electronAPI
    // @ts-ignore
    window.api = api
}
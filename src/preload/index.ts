import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
    openFileDialog: (options: any) => ipcRenderer.invoke('dialog:openFile', options),
    runPython: (moduleName: string, params: any) => ipcRenderer.invoke('python:run', moduleName, params)
}

if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        console.error('API 注入前端失败:', error)
    }
} else {
    window.electron = electronAPI
    window.api = api
}
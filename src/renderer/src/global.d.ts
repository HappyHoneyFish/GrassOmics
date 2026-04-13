import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
    interface Window {
        electron: ElectronAPI
        api: {
            openFileDialog: (options: { title: string; filters: { name: string; extensions: string[] }[] }) => Promise<{ canceled: boolean; filePath?: string; fileName?: string }>
            runPython: (moduleName: string, params: any) => Promise<any>
        }
    }
}
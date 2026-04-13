import { ipcMain, dialog } from 'electron'
import { spawn } from 'child_process'
import { join } from 'path'
import * as fs from 'fs'
import { app } from 'electron'

export function setupIpcHandlers() {
    const isPackaged = app.isPackaged

    ipcMain.handle('dialog:openFile', async (_, options) => {
        const result = await dialog.showOpenDialog({
            title: options.title || '选择生信分析文件',
            properties: ['openFile'],
            filters: options.filters || [{ name: '所有文件', extensions: ['*'] }]
        })

        if (!result.canceled && result.filePaths.length > 0) {
            const safePath = result.filePaths[0].replace(/\\/g, '/')
            const fileName = safePath.split('/').pop()
            return { canceled: false, filePath: safePath, fileName }
        }
        return { canceled: true }
    })

    ipcMain.handle('python:run', async (_, moduleName: string, params: any) => {
        return new Promise((resolve, reject) => {
            let pythonExecutable: string
            let pythonScript: string

            if (isPackaged) {
                // ██████ 生产环境：使用打包的便携 Python ██████
                // resources/engine/python/python.exe
                pythonExecutable = join(process.resourcesPath, 'engine', 'python', 'python.exe')
                pythonScript = join(process.resourcesPath, 'engine', 'main.py')

                console.log('[Python] 生产模式 - 便携Python路径:', pythonExecutable)
            } else {
                // ██████ 开发环境：使用 venv ██████
                const winVenvPath = join(__dirname, '../../../engine/venv/Scripts/python.exe')
                const macVenvPath = join(__dirname, '../../../engine/venv/bin/python')

                if (fs.existsSync(winVenvPath)) pythonExecutable = winVenvPath
                else if (fs.existsSync(macVenvPath)) pythonExecutable = macVenvPath
                else pythonExecutable = 'python' // 兜底

                pythonScript = join(__dirname, '../../../engine/main.py')
                console.log('[Python] 开发模式 - venv路径:', pythonExecutable)
            }

            console.log('[Python] 脚本路径:', pythonScript)
            console.log('[Python] 脚本存在:', fs.existsSync(pythonScript))
            console.log('[Python] Python存在:', fs.existsSync(pythonExecutable))

            if (!fs.existsSync(pythonScript)) {
                reject({
                    status: 'error',
                    message: `引擎脚本未找到: ${pythonScript}`
                })
                return
            }

            if (!fs.existsSync(pythonExecutable)) {
                reject({
                    status: 'error',
                    message: `Python 解释器未找到: ${pythonExecutable}`,
                    hint: '开发环境请检查 venv 是否存在；生产环境请确认 engine/python/ 已正确打包'
                })
                return
            }

            const paramsString = JSON.stringify(params)
            const pythonProcess = spawn(pythonExecutable, [
                pythonScript,
                '--module', moduleName,
                '--params', paramsString
            ])

            let dataBuffer = ''
            let errorBuffer = ''

            pythonProcess.stdout.on('data', (data) => {
                dataBuffer += data.toString()
                console.log('[Python stdout]:', data.toString())
            })

            pythonProcess.stderr.on('data', (data) => {
                errorBuffer += data.toString()
                console.error('[Python stderr]:', data.toString())
            })

            pythonProcess.on('close', (code) => {
                console.log('[Python] 退出码:', code)

                if (code === 0) {
                    try {
                        const lines = dataBuffer.trim().split('\n')
                        const lastLine = lines[lines.length - 1]
                        const result = JSON.parse(lastLine)
                        resolve(result)
                    } catch (e) {
                        reject({
                            status: 'error',
                            message: '解析 Python 输出失败',
                            raw: dataBuffer
                        })
                    }
                } else {
                    reject({
                        status: 'error',
                        message: `Python 异常退出 (Code: ${code})`,
                        detail: errorBuffer
                    })
                }
            })

            pythonProcess.on('error', (err) => {
                reject({
                    status: 'error',
                    message: '启动 Python 失败',
                    detail: err.message
                })
            })
        })
    })
}
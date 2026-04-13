import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layout/MainLayout'
import Toast from './components/Toast'

// 核心页面导入 (保存后这里会标红，请忽略)
import Dashboard from './pages/Dashboard'
import GenomeAnalysis from './pages/GenomeAnalysis'
import GSAnalysis from './pages/GSAnalysis'
import MultiOmics from './pages/MultiOmics'
import Microbiome from './pages/Microbiome'
import CircosAnalysis from './pages/CircosAnalysis'
import WorkflowCanvas from './pages/WorkflowCanvas'

export default function App() {
    return (
        <>
            {/* 注入 Win11 沉浸式标题栏的拖拽区域 */}
            <div className="titlebar-drag-region"></div>

            <Routes>
                <Route path="/" element={<MainLayout />}>
                    {/* 默认重定向到工程概览首页 */}
                    <Route index element={<Navigate to="/dashboard" replace />} />

                    {/* 八大生信业务模块 */}
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="genome" element={<GenomeAnalysis />} />
                    <Route path="gs" element={<GSAnalysis />} />
                    <Route path="multiomics" element={<MultiOmics />} />
                    <Route path="microbiome" element={<Microbiome />} />
                    <Route path="circos" element={<CircosAnalysis />} />
                    <Route path="workflow" element={<WorkflowCanvas />} />
                </Route>
            </Routes>

            {/* 挂载全局 Win11 通知组件 */}
            <Toast />
        </>
    )
}
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layout/MainLayout'
import Toast from './components/Toast'
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
            <div className="titlebar-drag-region"></div>

            <Routes>
                <Route path="/" element={<MainLayout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="genome" element={<GenomeAnalysis />} />
                    <Route path="gs" element={<GSAnalysis />} />
                    <Route path="multiomics" element={<MultiOmics />} />
                    <Route path="microbiome" element={<Microbiome />} />
                    <Route path="circos" element={<CircosAnalysis />} />
                    <Route path="workflow" element={<WorkflowCanvas />} />
                </Route>
            </Routes>

            <Toast />
        </>
    )
}
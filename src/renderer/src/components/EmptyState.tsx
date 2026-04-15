import { BarChart2 } from 'lucide-react'

interface EmptyStateProps {
    title?: string;
    desc?: string;
}

export default function EmptyState({
                                       title = '等待数据分析',
                                       desc = '请在左侧配置参数并运行算法，此处将渲染可交互的图表。'
                                   }: EmptyStateProps) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', minHeight: '400px', backgroundColor: '#FAFAFA',
            borderRadius: '8px', border: '1px dashed var(--win-border)',
            animation: 'fadeIn 0.5s ease'
        }}>
            <div style={{
                width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--win-sidebar-bg)',
                display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px'
            }}>
                <BarChart2 size={32} color="#CCCCCC" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--win-text-secondary)', margin: '0 0 8px 0' }}>
                {title}
            </h3>
            <p style={{ fontSize: '13px', color: '#999999', margin: 0, maxWidth: '300px', textAlign: 'center', lineHeight: 1.5 }}>
                {desc}
            </p>
        </div>
    )
}
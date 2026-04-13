import { NavLink, Outlet } from 'react-router-dom'
import {
    LayoutDashboard, Dna, GitBranch,
    Layers, Microscope, Target, Workflow, Leaf
} from 'lucide-react'
import { useAppStore } from '../store'

export default function MainLayout() {
    const { globalLoading, loadingText } = useAppStore()

    const navItems = [
        { path: '/dashboard', name: '启动页', icon: <LayoutDashboard size={18} /> },
        { path: '/genome', name: 'GWAS 分析', icon: <Dna size={18} /> },
        { path: '/gs', name: '基因组选择', icon: <Target size={18} /> },
        { path: '/circos', name: '结构与共线性', icon: <GitBranch size={18} /> },
        { path: '/microbiome', name: '根际微生物', icon: <Microscope size={18} /> },
        { path: '/multiomics', name: '多组学联动', icon: <Layers size={18} /> },
        { path: '/workflow', name: '可视化工作流', icon: <Workflow size={18} /> }
    ]

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--win-sidebar-bg)' }}>

            {/* 左侧导航栏 */}
            <aside style={{ width: '240px', backgroundColor: 'var(--win-sidebar-bg)', display: 'flex', flexDirection: 'column', paddingTop: '40px', zIndex: 10 }}>

                {/* ======== 美化后的 Logo 区域 ======== */}
                <div style={{ padding: '20px 24px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, #107C10, #0067C0)', // 生物绿到数据蓝的渐变
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        boxShadow: '0 4px 10px rgba(16, 124, 16, 0.3)'
                    }}>
                        <Leaf size={18} color="#FFFFFF" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--win-text)', margin: 0, letterSpacing: '0.5px' }}>
                            GrassOmics
                        </h1>
                        <p style={{ fontSize: '11px', color: 'var(--win-text-secondary)', margin: '2px 0 0 0' }}>
                            专业牧草生信工作站
                        </p>
                    </div>
                </div>

                <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {navItems.map((item) => (
                        <NavLink key={item.path} to={item.path} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <span className="icon">{item.icon}</span>
                            <span className="name">{item.name}</span>
                        </NavLink>
                    ))}
                </nav>
            </aside>

            {/* 右侧主内容舞台 */}
            <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--win-main-bg)', borderTopLeftRadius: '12px', boxShadow: '-4px 0 16px rgba(0,0,0,0.03)', marginTop: '40px', overflow: 'hidden' }}>
                <div className="win-scroll" style={{ flex: 1, padding: '32px 40px' }}>
                    <Outlet />
                </div>
                {globalLoading && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                        <div className="spinner"></div>
                        <p style={{ marginTop: '16px', fontWeight: 600, color: 'var(--win-accent)' }}>{loadingText}</p>
                    </div>
                )}
            </main>

            <style>{`
        .nav-item { display: flex; align-items: center; padding: 10px 12px; text-decoration: none; color: var(--win-text-secondary); border-radius: 6px; transition: all 0.2s ease; position: relative; }
        .nav-item:hover { background-color: rgba(0, 0, 0, 0.04); color: var(--win-text); }
        .nav-item.active { background-color: var(--win-main-bg); color: var(--win-accent); font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .nav-item.active::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); height: 16px; width: 3px; background-color: var(--win-accent); border-radius: 0 4px 4px 0; }
        .nav-item .icon { margin-right: 12px; display: flex; }
        .spinner { width: 40px; height: 40px; border: 3px solid rgba(0, 103, 192, 0.2); border-top-color: var(--win-accent); border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
        </div>
    )
}
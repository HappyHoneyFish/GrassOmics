import { useNavigate } from 'react-router-dom'
import { useAppStore, ReportInfo } from '../store'
import {Plus, BookOpen, Clock, FileText, CheckCircle2, X, Activity, Trash2} from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Dashboard() {
    const navigate = useNavigate()
    const { recentReports } = useAppStore()

    const [greeting, setGreeting] = useState('您好')
    const [selectedReport, setSelectedReport] = useState<ReportInfo | null>(null)

    useEffect(() => {
        const hour = new Date().getHours()
        if (hour < 6) setGreeting('夜深了，注意休息')
        else if (hour < 12) setGreeting('早上好')
        else if (hour < 14) setGreeting('中午好')
        else if (hour < 18) setGreeting('下午好')
        else setGreeting('晚上好')
    }, [])

    const getReportBadge = (type: string) => {
        switch (type) {
            case 'Workflow': return { color: '#881798', bg: '#F9EFFF', text: '工作流' }
            case 'GWAS': return { color: '#0067C0', bg: '#F3F9FF', text: 'GWAS' }
            case 'MultiOmics': return { color: '#D13438', bg: '#FDE7E9', text: '多组学' }
            case 'Microbiome': return { color: '#107C10', bg: '#F2FBF2', text: '微生物' }
            default: return { color: '#5C5C5C', bg: '#E5E5E5', text: type }
        }
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.5s ease', paddingBottom: '40px' }}>

            <div style={{
                marginBottom: '40px', marginTop: '24px',
                paddingBottom: '24px', borderBottom: '1px solid var(--win-border)'
            }}>
                <h1 style={{ fontSize: '36px', fontWeight: 600, margin: '0 0 12px 0', color: 'var(--win-text)', letterSpacing: '-0.5px' }}>
                    {greeting}，研究员。
                </h1>
                <p style={{ fontSize: '15px', color: 'var(--win-text-secondary)', margin: 0 }}>
                    准备好开始今天的生信数据挖掘了吗？
                </p>
            </div>

            {/* 核心操作区 */}
            <div style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--win-text-secondary)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    快速开始
                </h2>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <button onClick={() => navigate('/workflow')} className="action-btn primary">
                        <div className="icon-wrapper primary"><Plus size={24} color="#FFFFFF" /></div>
                        <div className="text-wrapper">
                            <h3>新建分析工作流</h3>
                            <p>从零开始在画布上编排多组学蓝图</p>
                        </div>
                    </button>

                    <button className="action-btn secondary">
                        <div className="icon-wrapper secondary"><BookOpen size={24} color="var(--win-accent)" /></div>
                        <div className="text-wrapper">
                            <h3>查阅在线文档</h3>
                            <p>获取 GrassOmics 的算法参数详解</p>
                        </div>
                    </button>
                </div>
            </div>

            <div>
                <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--win-text-secondary)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    最近的历史报告
                </h2>

                {recentReports.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {recentReports.map((report) => {
                            const badge = getReportBadge(report.type)
                            return (
                                <div
                                    key={report.id}
                                    className="report-list-item"
                                    onClick={() => setSelectedReport(report)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: badge.bg, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <Activity size={20} color={badge.color} />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--win-text)' }}>{report.title}</h4>
                                                <span style={{ fontSize: '11px', fontWeight: 600, color: badge.color, backgroundColor: badge.bg, padding: '2px 8px', borderRadius: '12px' }}>
                          {badge.text}
                        </span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--win-text-secondary)' }}>
                                                {report.summary}
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '12px', color: '#999999', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> {report.date}
                    </span>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); useAppStore.getState().removeReport(report.id); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#CCCCCC', transition: 'color 0.2s' }}
                                            onMouseOver={e => e.currentTarget.style.color = '#D13438'}
                                            onMouseOut={e => e.currentTarget.style.color = '#CCCCCC'}
                                            title="删除此报告"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--win-card)', borderRadius: 'var(--win-radius)', border: '1px dashed var(--win-border)' }}>
                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--win-text-secondary)' }}>暂无历史分析记录</p>
                    </div>
                )}
            </div>

            {selectedReport && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999,
                    backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'fadeIn 0.2s ease'
                }}>
                    <div style={{
                        width: '800px', height: '600px', backgroundColor: 'var(--win-main-bg)',
                        borderRadius: '12px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--win-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={20} color="var(--win-accent)" /> 分析报告详情
                            </h2>
                            <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--win-text-secondary)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 8px 0' }}>{selectedReport.title}</h3>
                                <span style={{ fontSize: '12px', color: 'var(--win-text-secondary)' }}>执行时间：{selectedReport.date}</span>
                            </div>

                            <div style={{ padding: '16px 20px', backgroundColor: '#F2FBF2', border: '1px solid #107C10', borderRadius: '8px', marginBottom: '24px' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#107C10', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle2 size={18} /> 分析执行成功
                                </h4>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--win-text-secondary)', lineHeight: 1.6 }}>
                                    {selectedReport.summary}
                                </p>
                            </div>

                            <h4 style={{ fontSize: '14px', margin: '0 0 12px 0', color: 'var(--win-text)' }}>底层算法执行日志</h4>
                            <pre style={{
                                backgroundColor: 'var(--win-sidebar-bg)', padding: '16px', borderRadius: '6px',
                                fontSize: '13px', color: 'var(--win-text-secondary)', fontFamily: 'monospace',
                                overflowX: 'auto', border: '1px solid var(--win-border)', lineHeight: 1.6
                            }}>
                {selectedReport.logs}
              </pre>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .action-btn { display: flex; align-items: center; gap: 16px; padding: 20px 24px; border-radius: 12px; border: 1px solid var(--win-border); background-color: var(--win-card); cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); width: 340px; text-align: left; }
        .action-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .action-btn.primary { border-color: rgba(0, 103, 192, 0.3); }
        
        .icon-wrapper { width: 48px; height: 48px; border-radius: 10px; display: flex; justify-content: center; align-items: center; }
        .icon-wrapper.primary { background: linear-gradient(135deg, var(--win-accent), #005A9E); box-shadow: 0 4px 12px rgba(0, 103, 192, 0.3); }
        .icon-wrapper.secondary { background-color: #F3F9FF; }

        .text-wrapper h3 { margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: var(--win-text); }
        .text-wrapper p { margin: 0; font-size: 13px; color: var(--win-text-secondary); }

        /* 纵向列表项样式 */
        .report-list-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 20px; background-color: var(--win-card); border: 1px solid var(--win-border);
          border-radius: 10px; cursor: pointer; transition: all 0.2s ease;
        }
        .report-list-item:hover {
          background-color: #F8F9FA; border-color: #CCCCCC; transform: translateX(4px);
        }
      `}</style>
        </div>
    )
}
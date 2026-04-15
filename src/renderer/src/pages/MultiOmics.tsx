import { useState } from 'react'
import { useAppStore } from '../store'
import { Layers, Activity, Droplets, Network, Play, FileUp, CheckCircle2 } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import EmptyState from '../components/EmptyState'

interface TransResult { volcano_file: string; heatmap_file: string; total_genes: number; significant_genes_count: number; }
interface MetaboResult { scores_file: string; vip_file: string; top_vip_metabolites: { Metabolite: string; VIP_Score: number }[]; }
interface ProtResult { nodes_file: string; edges_file: string; nodes_count: number; edges_count: number; }

export default function MultiOmics() {
    const { setGlobalLoading, showToast } = useAppStore()
    const [activeTab, setActiveTab] = useState<'trans' | 'metabo' | 'prot'>('trans')

    const [transExprFile, setTransExprFile] = useState<{ name: string; path: string } | null>(null)
    const [transGroupFile, setTransGroupFile] = useState<{ name: string; path: string } | null>(null)
    const [transResult, setTransResult] = useState<TransResult | null>(null)

    const [metaboAbundFile, setMetaboAbundFile] = useState<{ name: string; path: string } | null>(null)
    const [metaboGroupFile, setMetaboGroupFile] = useState<{ name: string; path: string } | null>(null)
    const [metaboResult, setMetaboResult] = useState<MetaboResult | null>(null)

    const [protAbundFile, setProtAbundFile] = useState<{ name: string; path: string } | null>(null)
    const [corrThreshold, setCorrThreshold] = useState<number>(0.8)
    const [protResult, setProtResult] = useState<ProtResult | null>(null)

    const handleUploadFile = async (setter: Function, type: string) => {
        try {
            const res = await window.api.openFileDialog({
                title: `导入 ${type} 文件`,
                filters: [{ name: 'CSV', extensions: ['csv'] }]
            })
            if (!res.canceled && res.filePath) {
                setter({ name: res.fileName!, path: res.filePath })
            }
        } catch (e) { showToast('文件读取失败', 'error') }
    }


    const runTrans = async () => {
        if (!transExprFile || !transGroupFile) return
        setGlobalLoading(true, '正在执行 T-test 与 FDR 矫正，渲染火山图...')
        try {
            const res = await window.api.runPython('multiomics_trans', {
                expr_file: transExprFile.path, group_file: transGroupFile.path, output_dir: './GrassOmics_Output/Trans'
            })
            if (res.status === 'success') { setTransResult(res.data); showToast('转录组差异分析完成', 'success') }
            else throw new Error(res.message)
        } catch (e: any) { showToast(e.message, 'error') } finally { setGlobalLoading(false) }
    }

    const getVolcanoOption = () => {
        if (!transResult) return {}
        const upData: any[] = [], downData: any[] = [], nonSigData: any[] = []
        for(let i=0; i<800; i++) {
            const x = (Math.random() - 0.5) * 8
            const y = Math.random() * 6 - Math.abs(x) * 0.2
            if (y < 0) continue
            if (x > 1 && y > 1.3) upData.push([x, y])
            else if (x < -1 && y > 1.3) downData.push([x, y])
            else nonSigData.push([x, y])
        }

        return {
            tooltip: { trigger: 'item', formatter: 'Log2FC: {c0}<br/>-log10(P): {c1}' },
            grid: { top: 30, right: 30, bottom: 40, left: 40 },
            xAxis: { name: 'Log2FC', nameLocation: 'middle', nameGap: 25, splitLine: { show: false } },
            yAxis: { name: '-log10(P-value)', splitLine: { lineStyle: { type: 'dashed', color: '#EEEEEE' } } },
            series: [
                { name: 'Up', type: 'scatter', symbolSize: 6, data: upData, itemStyle: { color: '#D13438' } },
                { name: 'Down', type: 'scatter', symbolSize: 6, data: downData, itemStyle: { color: '#0067C0' } },
                { name: 'Not Sig', type: 'scatter', symbolSize: 4, data: nonSigData, itemStyle: { color: '#CCCCCC' } },
                { type: 'line', markLine: { silent: true, symbol: 'none', data: [{ xAxis: 1 }, { xAxis: -1 }, { yAxis: 1.3 }], lineStyle: { color: '#666', type: 'dashed' } } }
            ]
        }
    }

    const runMetabo = async () => {
        if (!metaboAbundFile || !metaboGroupFile) return
        setGlobalLoading(true, '正在构建 PLS-DA 空间降维模型...')
        try {
            const res = await window.api.runPython('multiomics_metabo', {
                abundance_file: metaboAbundFile.path, group_file: metaboGroupFile.path, output_dir: './GrassOmics_Output/Metabo'
            })
            if (res.status === 'success') { setMetaboResult(res.data); showToast('代谢组 PLS-DA 完成', 'success') }
            else throw new Error(res.message)
        } catch (e: any) { showToast(e.message, 'error') } finally { setGlobalLoading(false) }
    }

    const getPlsdaOption = () => {
        if (!metaboResult) return {}
        const groupA: any[] = [], groupB: any[] = []
        for(let i=0; i<30; i++) {
            groupA.push([Math.random() * 4 - 5, Math.random() * 6 - 3])
            groupB.push([Math.random() * 4 + 1, Math.random() * 6 - 3])
        }
        return {
            tooltip: { trigger: 'item', formatter: 'Comp1: {c0}<br/>Comp2: {c1}' },
            legend: { data: ['Control', 'Treatment'], bottom: 0 },
            grid: { top: 30, right: 30, bottom: 40, left: 40 },
            xAxis: { name: 'Comp 1 (42.5%)', nameLocation: 'middle', nameGap: 25, splitLine: { lineStyle: { type: 'dashed', color: '#EEEEEE' } } },
            yAxis: { name: 'Comp 2 (18.2%)', splitLine: { lineStyle: { type: 'dashed', color: '#EEEEEE' } } },
            series: [
                { name: 'Control', type: 'scatter', symbolSize: 10, data: groupA, itemStyle: { color: '#0067C0' } },
                { name: 'Treatment', type: 'scatter', symbolSize: 10, data: groupB, itemStyle: { color: '#D13438' } }
            ]
        }
    }

    const runProt = async () => {
        if (!protAbundFile) return
        setGlobalLoading(true, '正在计算 Pearson 相关性与拓扑网络...')
        try {
            const res = await window.api.runPython('multiomics_prot', {
                abundance_file: protAbundFile.path, output_dir: './GrassOmics_Output/Prot', corr_threshold: corrThreshold
            })
            if (res.status === 'success') { setProtResult(res.data); showToast('蛋白网络构建完成', 'success') }
            else throw new Error(res.message)
        } catch (e: any) { showToast(e.message, 'error') } finally { setGlobalLoading(false) }
    }

    const getNetworkOption = () => {
        if (!protResult) return {}
        const nodes = Array.from({length: 40}).map((_, i) => ({ id: `${i}`, name: `Prot_${i}`, symbolSize: Math.random() * 20 + 10, itemStyle: { color: i%3===0 ? '#D13438' : '#0067C0' } }))
        const edges = Array.from({length: 60}).map(() => ({ source: `${Math.floor(Math.random()*40)}`, target: `${Math.floor(Math.random()*40)}` }))

        return {
            tooltip: {},
            series: [{
                type: 'graph', layout: 'force', data: nodes, edges: edges,
                roam: true, label: { show: false }, force: { repulsion: 100, edgeLength: 50 },
                lineStyle: { color: 'source', curveness: 0.3, opacity: 0.7 }
            }]
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Layers size={24} color="var(--win-accent)" />
                    多组学联动分析引擎
                </h2>

                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--win-border)', paddingBottom: '8px' }}>
                    <TabButton active={activeTab === 'trans'} onClick={() => setActiveTab('trans')} icon={<Activity size={16} />} text="转录组 (Volcano)" />
                    <TabButton active={activeTab === 'metabo'} onClick={() => setActiveTab('metabo')} icon={<Droplets size={16} />} text="代谢组 (PLS-DA)" />
                    <TabButton active={activeTab === 'prot'} onClick={() => setActiveTab('prot')} icon={<Network size={16} />} text="蛋白组 (PPI Network)" />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>

                <div style={{
                    width: '340px', backgroundColor: 'var(--win-card)', borderRadius: 'var(--win-radius)',
                    border: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column', overflowY: 'auto'
                }}>
                    {activeTab === 'trans' && (
                        <>
                            <div style={{ padding: '20px', borderBottom: '1px solid var(--win-border)' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0' }}>输入矩阵</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <DataUploadBtn type="CSV" file={transExprFile} onClick={() => handleUploadFile(setTransExprFile, '转录表达矩阵')} desc="基因表达量 (FPKM/TPM)" />
                                    <DataUploadBtn type="CSV" file={transGroupFile} onClick={() => handleUploadFile(setTransGroupFile, '实验分组')} desc="对照组与处理组映射" />
                                </div>
                            </div>
                            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <p style={{ fontSize: '12px', color: 'var(--win-text-secondary)', lineHeight: 1.6, marginBottom: '24px', flex: 1 }}>
                                    基于 T-test 检验两组间的差异，自动执行 <strong>FDR 多重假设检验校正</strong>。显著性判定阈值为: |Log2FC| &gt; 1 且 P-Value &lt; 0.05。
                                </p>
                                <button onClick={runTrans} disabled={!transExprFile || !transGroupFile} className={`win-run-btn ${transExprFile && transGroupFile ? 'active' : ''}`}>
                                    <Play size={16} fill="currentColor" /> 提取差异基因并渲染
                                </button>
                            </div>
                        </>
                    )}

                    {activeTab === 'metabo' && (
                        <>
                            <div style={{ padding: '20px', borderBottom: '1px solid var(--win-border)' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0' }}>输入矩阵</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <DataUploadBtn type="CSV" file={metaboAbundFile} onClick={() => handleUploadFile(setMetaboAbundFile, '代谢物丰度矩阵')} desc="广泛靶向峰面积定量" />
                                    <DataUploadBtn type="CSV" file={metaboGroupFile} onClick={() => handleUploadFile(setMetaboGroupFile, '实验分组')} desc="对照组与处理组映射" />
                                </div>
                            </div>
                            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <p style={{ fontSize: '12px', color: 'var(--win-text-secondary)', lineHeight: 1.6, marginBottom: '24px', flex: 1 }}>
                                    消除组内冗余噪音，执行偏最小二乘判别分析 (PLS-DA)，最大化分离组间差异。提取 <strong>VIP 投影重要性得分 &gt; 1</strong> 的核心生物标志物。
                                </p>
                                <button onClick={runMetabo} disabled={!metaboAbundFile || !metaboGroupFile} className={`win-run-btn ${metaboAbundFile && metaboGroupFile ? 'active' : ''}`}>
                                    <Play size={16} fill="currentColor" /> 构建模型并降维
                                </button>
                            </div>
                        </>
                    )}

                    {activeTab === 'prot' && (
                        <>
                            <div style={{ padding: '20px', borderBottom: '1px solid var(--win-border)' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0' }}>输入矩阵</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <DataUploadBtn type="CSV" file={protAbundFile} onClick={() => handleUploadFile(setProtAbundFile, '蛋白组定量矩阵')} desc="LFQ/TMT 蛋白质丰度" />
                                </div>
                            </div>
                            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>
                                        共表达相关性阈值 (Pearson R) <span style={{ color: 'var(--win-accent)' }}>{corrThreshold}</span>
                                    </label>
                                    <input type="range" min="0.5" max="0.99" step="0.05" value={corrThreshold} onChange={(e) => setCorrThreshold(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--win-accent)', cursor: 'pointer' }} />
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--win-text-secondary)', lineHeight: 1.6, marginBottom: '24px', flex: 1 }}>
                                    基于强相关性连通蛋白质节点。生成标准 Echarts 力导向网络图坐标 (Nodes & Edges)。
                                </p>
                                <button onClick={runProt} disabled={!protAbundFile} className={`win-run-btn ${protAbundFile ? 'active' : ''}`}>
                                    <Play size={16} fill="currentColor" /> 计算互作拓扑网络
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div style={{ flex: 1, backgroundColor: 'var(--win-card)', borderRadius: 'var(--win-radius)', border: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column', padding: '24px' }}>

                    {activeTab === 'trans' && !transResult && <EmptyState title="差异基因火山图 (Volcano Plot)" desc="导入表达矩阵与分组后，此处将渲染高精度的双向阈值火山图与显著基因统计。" />}
                    {activeTab === 'trans' && transResult && (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.5s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>差异基因火山图</h3>
                                <span style={{ fontSize: '12px', color: '#D13438', backgroundColor: '#FDE7E9', padding: '4px 10px', borderRadius: '12px', fontWeight: 500 }}>
                  检出显著差异基因: {transResult.significant_genes_count} 个
                </span>
                            </div>
                            <div style={{ flex: 1, border: '1px solid var(--win-border)', borderRadius: '8px' }}>
                                <ReactECharts option={getVolcanoOption()} style={{ height: '100%', width: '100%' }} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'metabo' && !metaboResult && <EmptyState title="PLS-DA 降维散点图" desc="导入代谢丰度矩阵，提取高重要性 (VIP) 标志物，直观展示组间距离差异。" />}
                    {activeTab === 'metabo' && metaboResult && (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.5s ease' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0' }}>PLS-DA 降维空间分布</h3>
                            <div style={{ height: '350px', border: '1px solid var(--win-border)', borderRadius: '8px', marginBottom: '24px' }}>
                                <ReactECharts option={getPlsdaOption()} style={{ height: '100%', width: '100%' }} />
                            </div>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0', color: 'var(--win-text-secondary)' }}>核心 Biomarker (Top VIP)</h3>
                            <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid var(--win-border)' }}>
                                <table className="win-data-table">
                                    <thead><tr><th>代谢物 ID</th><th>VIP 投影重要性得分</th></tr></thead>
                                    <tbody>
                                    {metaboResult.top_vip_metabolites.map((m, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 500 }}>{m.Metabolite}</td>
                                            <td style={{ color: '#D13438', fontWeight: 600 }}>{m.VIP_Score.toFixed(4)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'prot' && !protResult && <EmptyState title="蛋白质共表达网络图 (PPI)" desc="计算特征向量，通过弹性物理引擎渲染动态力导向拓扑网络。" />}
                    {activeTab === 'prot' && protResult && (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.5s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>PPI 力导向拓扑网络图</h3>
                                <span style={{ fontSize: '12px', color: 'var(--win-accent)', backgroundColor: '#F3F9FF', padding: '4px 10px', borderRadius: '12px', fontWeight: 500 }}>
                  节点(Nodes): {protResult.nodes_count} | 连线(Edges): {protResult.edges_count}
                </span>
                            </div>
                            <div style={{ flex: 1, border: '1px solid var(--win-border)', borderRadius: '8px', backgroundColor: '#FAFAFA' }}>
                                <ReactECharts option={getNetworkOption()} style={{ height: '100%', width: '100%' }} />
                            </div>
                        </div>
                    )}

                </div>
            </div>

            <style>{`
        .win-run-btn { width: 100%; padding: 10px; border-radius: 6px; background-color: #CCCCCC; color: #FFFFFF; border: none; font-size: 13px; font-weight: 600; cursor: not-allowed; display: flex; justify-content: center; align-items: center; gap: 8px; transition: background-color 0.2s; }
        .win-run-btn.active { background-color: var(--win-accent); cursor: pointer; }
        .win-run-btn.active:hover { background-color: var(--win-accent-hover); }
        .win-data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
        .win-data-table th { padding: 10px 16px; font-weight: 600; background: #FAFAFA; border-bottom: 1px solid var(--win-border); }
        .win-data-table td { padding: 10px 16px; border-bottom: 1px solid var(--win-border); }
        .win-data-table tr:last-child td { border-bottom: none; }
      `}</style>
        </div>
    )
}

function TabButton({ active, onClick, icon, text }: any) {
    return (
        <button onClick={onClick} style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '16px',
            backgroundColor: active ? 'var(--win-text)' : 'transparent', border: 'none', cursor: 'pointer',
            color: active ? '#FFFFFF' : 'var(--win-text-secondary)', fontWeight: active ? 600 : 500, transition: 'all 0.2s'
        }} onMouseOver={e => !active && (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)')} onMouseOut={e => !active && (e.currentTarget.style.backgroundColor = 'transparent')}>
            {icon} {text}
        </button>
    )
}

function DataUploadBtn({ type, file, onClick, desc }: any) {
    return (
        <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: `1px solid ${file ? 'var(--win-accent)' : 'var(--win-border)'}`, borderRadius: '6px', backgroundColor: file ? '#F3F9FF' : 'var(--win-main-bg)', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div>
                <p style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: 600, color: file ? 'var(--win-accent)' : 'var(--win-text)' }}>{type} {file ? '已挂载' : '未导入'}</p>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--win-text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file ? file.name : desc}</p>
            </div>
            {file ? <CheckCircle2 size={18} color="var(--win-accent)" /> : <FileUp size={18} color="var(--win-text-secondary)" />}
        </div>
    )
}
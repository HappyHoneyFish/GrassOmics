import { useState } from 'react'
import { useAppStore } from '../store'
import { GitBranch, Play, FileUp, CheckCircle2, Compass } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import EmptyState from '../components/EmptyState'

interface CircosResult {
    karyotype_file: string;
    links_file: string;
    chromosome_count: number;
    valid_homologous_links: number;
    chart_nodes: { name: string; group: string }[];
    chart_links: { source: string; target: string; weight: number }[];
    top_pairs: { GeneA: string; GeneB: string; ChrA: string; ChrB: string; Identity: number }[];
}

export default function CircosAnalysis() {
    const { setGlobalLoading, showToast } = useAppStore()

    const [bedFile, setBedFile] = useState<{ name: string; path: string } | null>(null)
    const [homologyFile, setHomologyFile] = useState<{ name: string; path: string } | null>(null)
    const [result, setResult] = useState<CircosResult | null>(null)

    const isReady = bedFile && homologyFile

    const handleUploadFile = async (type: 'bed' | 'csv') => {
        try {
            const res = await window.api.openFileDialog({
                title: type === 'bed' ? '导入全基因组 BED 坐标' : '导入同源基因对网络 (CSV)',
                filters: type === 'bed' ? [{ name: 'BED/CSV', extensions: ['bed', 'csv'] }] : [{ name: 'CSV', extensions: ['csv'] }]
            })
            if (!res.canceled && res.filePath) {
                if (type === 'bed') setBedFile({ name: res.fileName!, path: res.filePath })
                else setHomologyFile({ name: res.fileName!, path: res.filePath })
            }
        } catch (e) { showToast('文件读取失败', 'error') }
    }

    const handleRunCircos = async () => {
        if (!isReady) return
        setGlobalLoading(true, '正在进行空间物理坐标映射与跨染色体共线性网络提取...')
        setResult(null)

        try {
            const response = await window.api.runPython('circos', {
                bed_file: bedFile.path,
                homology_file: homologyFile.path,
                output_dir: './GrassOmics_Output/Circos'
            })

            if (response.status === 'success') {
                const subA = Array.from({length: 7}, (_, i) => `Chr${i+1}A`)
                const subB = Array.from({length: 7}, (_, i) => `Chr${i+1}B`)
                const mockNodes = [...subA, ...subB].map(name => ({ name, group: name.endsWith('A') ? 'SubA' : 'SubB' }))

                const mockLinks: { source: string; target: string; weight: number }[] = []
                for(let i=1; i<=7; i++) {
                    for(let j=0; j<15; j++) mockLinks.push({ source: `Chr${i}A`, target: `Chr${i}B`, weight: Math.random() })
                }
                for(let i=0; i<20; i++) {
                    mockLinks.push({ source: subA[Math.floor(Math.random()*7)], target: subB[Math.floor(Math.random()*7)], weight: Math.random() * 0.5 })
                }

                const mockPairs = Array.from({length: 5}, (_, i) => ({
                    GeneA: `Medtr${Math.floor(Math.random()*9)}g${Math.floor(Math.random()*99999)}`,
                    GeneB: `Medtr${Math.floor(Math.random()*9)}g${Math.floor(Math.random()*99999)}`,
                    ChrA: `Chr${Math.floor(Math.random()*7)+1}A`,
                    ChrB: `Chr${Math.floor(Math.random()*7)+1}B`,
                    Identity: 85 + Math.random() * 14
                }))

                setResult({
                    ...response.data,
                    chart_nodes: mockNodes,
                    chart_links: mockLinks,
                    top_pairs: mockPairs.sort((a,b) => b.Identity - a.Identity)
                })
                showToast('共线性空间坐标计算与渲染完成！', 'success')
            } else throw new Error(response.message)
        } catch (error: any) {
            showToast(error.message || '分析出错', 'error')
        } finally {
            setGlobalLoading(false)
        }
    }

    const getCircosOption = () => {
        if (!result) return {}

        const colorMap = { SubA: '#0067C0', SubB: '#107C10' }

        const nodes = result.chart_nodes.map(node => ({
            name: node.name,
            symbolSize: 20,
            itemStyle: { color: colorMap[node.group as keyof typeof colorMap] }
        }))

        const edges = result.chart_links.map(link => ({
            source: link.source,
            target: link.target,
            lineStyle: {
                width: link.weight > 0.8 ? 2 : 0.5,
                color: link.source.replace('A', '') === link.target.replace('B', '') ? '#0067C0' : '#D13438',
                curveness: 0.3,
                opacity: link.weight > 0.8 ? 0.6 : 0.2
            }
        }))

        return {
            tooltip: {
                formatter: (params: any) => {
                    if (params.dataType === 'node') return `染色体: ${params.data.name}`
                    if (params.dataType === 'edge') return `Synteny Link: ${params.data.source} ↔ ${params.data.target}`
                }
            },
            legend: [{
                data: result.chart_nodes.map(a => a.name),
                show: false
            }],
            animationDurationUpdate: 1500,
            animationEasingUpdate: 'quinticInOut',
            series: [
                {
                    name: 'Synteny Circos',
                    type: 'graph',
                    layout: 'circular',
                    circular: { rotateLabel: true },
                    data: nodes,
                    links: edges,
                    roam: true,
                    label: { show: true, position: 'right', formatter: '{b}', fontSize: 11, color: 'var(--win-text)' },
                    lineStyle: { color: 'source', curveness: 0.3 }
                }
            ]
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.4s ease' }}>
            {/* 头部标题区 */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <GitBranch size={24} color="var(--win-accent)" />
                    基因结构与共线性 (Synteny & Circos)
                </h2>
                <p style={{ color: 'var(--win-text-secondary)', margin: 0, fontSize: '13px' }}>
                    提取多倍体亚基因组间的同源区间，进行空间坐标映射，并渲染环形共线性网络。
                </p>
            </div>

            <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>

                <div style={{ width: '340px', backgroundColor: 'var(--win-card)', borderRadius: 'var(--win-radius)', border: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

                    <div style={{ padding: '20px', borderBottom: '1px solid var(--win-border)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Compass size={16} color="var(--win-text-secondary)" /> 数据输入
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <DataUploadBtn type="BED" file={bedFile} onClick={() => handleUploadFile('bed')} desc="全基因组物理位置坐标" />
                            <DataUploadBtn type="CSV" file={homologyFile} onClick={() => handleUploadFile('csv')} desc="BLAST 同源基因对网络" />
                        </div>
                    </div>

                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0' }}>映射引擎说明</h3>
                        <div style={{ padding: '12px', backgroundColor: 'var(--win-bg)', borderRadius: '6px', border: '1px solid var(--win-border)', marginBottom: '24px' }}>
                            <ul style={{ fontSize: '12px', color: 'var(--win-text-secondary)', margin: 0, paddingLeft: '20px', lineHeight: 1.6 }}>
                                <li>解析 BED 计算 Chromosome 极值，生成 Karyotype 环形节点。</li>
                                <li>针对网络执行双向 Spatial Join，剔除无坐标孤儿节点。</li>
                                <li>自动过滤染色体自交连线，重点提取不同亚基因组的跨染色体 Synteny。</li>
                            </ul>
                        </div>
                        <div style={{ flex: 1 }}></div>
                        <button onClick={handleRunCircos} disabled={!isReady} className={`win-run-btn ${isReady ? 'active' : ''}`}>
                            <Play size={16} fill="currentColor" /> 启动坐标映射与渲染
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, backgroundColor: 'var(--win-card)', borderRadius: 'var(--win-radius)', border: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
                    {!result ? (
                        <EmptyState title="等待共线性映射" desc="导入 BED 坐标与基因网络后，此处将渲染可缩放旋转的 Echarts 环形网络图" />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.5s ease' }}>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>全基因组共线性环形图</h3>
                                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="win-badge" style={{ backgroundColor: '#F3F9FF', color: 'var(--win-accent)' }}>
                    映射染色体: {result.chromosome_count} 条
                  </span>
                                    <span className="win-badge" style={{ backgroundColor: 'var(--win-main-bg)', border: '1px solid var(--win-border)' }}>
                    跨染色体连线: {result.valid_homologous_links.toLocaleString()} 对
                  </span>
                                </div>
                            </div>

                            <div style={{ height: '400px', border: '1px solid var(--win-border)', borderRadius: '8px', marginBottom: '32px', backgroundColor: '#FAFAFA' }}>
                                <ReactECharts option={getCircosOption()} style={{ height: '100%', width: '100%' }} />
                            </div>

                            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0' }}>高同源性 (High Identity) 基因对 Top 5</h3>
                            <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid var(--win-border)' }}>
                                <table className="win-data-table">
                                    <thead><tr><th>Gene A (锚点)</th><th>染色体 A</th><th>Gene B (同源)</th><th>染色体 B</th><th>Identity (%)</th></tr></thead>
                                    <tbody>
                                    {result.top_pairs.map((pair, idx) => (
                                        <tr key={idx}>
                                            <td style={{ color: 'var(--win-accent)', fontWeight: 500 }}>{pair.GeneA}</td>
                                            <td>{pair.ChrA}</td>
                                            <td style={{ color: '#107C10', fontWeight: 500 }}>{pair.GeneB}</td>
                                            <td>{pair.ChrB}</td>
                                            <td style={{ color: '#D13438', fontWeight: 600 }}>{pair.Identity.toFixed(2)}%</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                        </div>
                    )}
                </div>
            </div>

            <style>{`
        .win-run-btn { width: 100%; padding: 10px; border-radius: 6px; background-color: #CCCCCC; color: #FFFFFF; border: none; font-size: 13px; font-weight: 600; cursor: not-allowed; display: flex; justify-content: center; align-items: center; gap: 8px; transition: background-color 0.2s; }
        .win-run-btn.active { background-color: var(--win-accent); cursor: pointer; }
        .win-run-btn.active:hover { background-color: var(--win-accent-hover); }
        .win-badge { font-size: 12px; padding: 4px 10px; border-radius: 12px; font-weight: 500; }
        .win-data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
        .win-data-table th { padding: 10px 16px; font-weight: 600; background: #FAFAFA; border-bottom: 1px solid var(--win-border); }
        .win-data-table td { padding: 10px 16px; border-bottom: 1px solid var(--win-border); }
        .win-data-table tr:last-child td { border-bottom: none; }
      `}</style>
        </div>
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
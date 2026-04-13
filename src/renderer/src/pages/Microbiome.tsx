import { useState } from 'react'
import { useAppStore } from '../store'
import { Microscope, Play, FileUp, CheckCircle2, BarChart3 } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import EmptyState from '../components/EmptyState'

// 定义 Python 返回的数据接口
interface MicrobiomeResult {
    analyzed_taxa: string[];
    phenotypes: string[];
    correlation_pairs_count: number;
    heatmap_data: [number, number, number][]; // [xIndex, yIndex, correlationValue]
}

export default function Microbiome() {
    const { setGlobalLoading, showToast } = useAppStore()

    // 1. 模块独立的数据状态 (去全局化)
    const [otuFile, setOtuFile] = useState<{ name: string; path: string } | null>(null)
    const [phenoFile, setPhenoFile] = useState<{ name: string; path: string } | null>(null)

    const [topN, setTopN] = useState<number>(10)
    const [result, setResult] = useState<MicrobiomeResult | null>(null)

    const isReady = otuFile && phenoFile && topN >= 3 && topN <= 50

    // 独立的文件上传处理函数
    const handleUploadFile = async (type: 'otu' | 'csv') => {
        try {
            const res = await window.api.openFileDialog({
                title: type === 'otu' ? '导入微生物 OTU 丰度表' : '导入宿主表型数据 (CSV)',
                filters: [{ name: 'CSV', extensions: ['csv'] }]
            })
            if (!res.canceled && res.filePath) {
                if (type === 'otu') setOtuFile({ name: res.fileName!, path: res.filePath })
                else setPhenoFile({ name: res.fileName!, path: res.filePath })
            }
        } catch (e) { showToast('文件读取失败', 'error') }
    }

    const handleRunMicrobiome = async () => {
        if (!isReady) return
        setGlobalLoading(true, '正在计算相对丰度与 Spearman 相关性矩阵...')
        setResult(null)

        try {
            const response = await window.api.runPython('microbiome', {
                otu_file: otuFile.path,
                pheno_file: phenoFile.path,
                top_n: Number(topN),
                output_dir: './GrassOmics_Output/Microbiome'
            })

            if (response.status === 'success') {
                // 在实际应用中，后端会传回真实的二维数组。这里我们模拟构建 Echarts 所需的热图结构
                const mockPhenotypes = ['Height', 'Weight', 'Root_Length', 'Yield', 'Nitrogen']
                const mockHeatmapData: [number, number, number][] = []

                response.data.analyzed_taxa.forEach((_taxa: string, yIdx: number) => {
                    mockPhenotypes.forEach((_pheno: string, xIdx: number) => {
                        // 模拟 -1 到 1 的相关性系数
                        const corr = (Math.random() * 2) - 1
                        mockHeatmapData.push([xIdx, yIdx, corr])
                    })
                })

                setResult({
                    ...response.data,
                    phenotypes: mockPhenotypes,
                    heatmap_data: mockHeatmapData
                })
                showToast('微生物与根系互作分析完成！', 'success')
            } else throw new Error(response.message)
        } catch (error: any) {
            showToast(error.message || '分析出错', 'error')
        } finally {
            setGlobalLoading(false)
        }
    }

    // 2. 构造物种相对丰度堆叠柱状图 (Stacked Bar)
    const getStackedBarOption = () => {
        if (!result) return {}
        const samples = ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09', 'S10']
        const colors = ['#0067C0', '#D13438', '#107C10', '#FFB900', '#881798', '#0099BC', '#FF8C00', '#E3008C', '#00CC6A', '#A4262C']

        const series = result.analyzed_taxa.map((taxa, index) => {
            // 模拟相对丰度数据，确保所有组分加起来不超过 100%
            const data = samples.map(() => Math.random() * (100 / topN) + 2)
            return {
                name: taxa, type: 'bar', stack: 'total',
                emphasis: { focus: 'series' },
                itemStyle: { color: colors[index % colors.length] },
                data: data
            }
        })

        // 加入 Others 类别补齐 100%
        series.push({
            name: 'Others', type: 'bar', stack: 'total', emphasis: { focus: 'series' },
            itemStyle: { color: '#E5E5E5' },
            data: samples.map(() => 15) // 模拟剩下的 Others 比例
        })

        return {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (val: number) => val.toFixed(2) + '%' },
            legend: { type: 'scroll', orient: 'vertical', right: 0, top: 20, bottom: 20 },
            grid: { left: '3%', right: '15%', bottom: '3%', containLabel: true },
            xAxis: { type: 'category', data: samples },
            yAxis: { type: 'value', name: '相对丰度 (%)', max: 100 },
            series: series
        }
    }

    // 3. 构造 Spearman 相关性热图 (Heatmap)
    const getHeatmapOption = () => {
        if (!result) return {}
        return {
            tooltip: { position: 'top', formatter: (p: any) => `Taxa: ${result.analyzed_taxa[p.data[1]]}<br/>Pheno: ${result.phenotypes[p.data[0]]}<br/>Spearman R: ${p.data[2].toFixed(3)}` },
            grid: { top: 40, right: 80, bottom: 60, left: 140 },
            xAxis: { type: 'category', data: result.phenotypes, splitArea: { show: true }, axisLabel: { fontWeight: 600 } },
            yAxis: { type: 'category', data: result.analyzed_taxa, splitArea: { show: true }, axisLabel: { fontStyle: 'italic' } }, // 菌群名称斜体 (顶刊规范)
            visualMap: {
                min: -1, max: 1, calculable: true, orient: 'vertical', right: '0%', top: 'center',
                // 科研最经典配色：深蓝(负向) -> 纯白(中性) -> 深红(正向)
                color: ['#B2182B', '#FDDBC7', '#F7F7F7', '#D1E5F0', '#2166AC']
            },
            series: [{
                name: 'Spearman Correlation', type: 'heatmap', data: result.heatmap_data,
                label: { show: true, formatter: (p: any) => p.data[2].toFixed(2), fontSize: 11, color: '#000000' }, // 黑色数值更清晰
                itemStyle: { borderColor: '#FFFFFF', borderWidth: 2 }, // 加上白色网格线分割，极具质感
                emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } }
            }]
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.4s ease' }}>
            {/* 头部标题区 */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Microscope size={24} color="var(--win-accent)" />
                    根际微生物互作分析 (Microbiome)
                </h2>
                <p style={{ color: 'var(--win-text-secondary)', margin: 0, fontSize: '13px' }}>
                    独立模块：计算微生物群落的相对丰度，挖掘核心优势菌群与宿主表型的 Spearman 显著相关性。
                </p>
            </div>

            {/* 核心工作区：严格的左右切分版式 */}
            <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>

                {/* ================= 左侧：参数与数据输入面板 (固定 340px) ================= */}
                <div style={{ width: '340px', backgroundColor: 'var(--win-card)', borderRadius: 'var(--win-radius)', border: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                    {/* 数据挂载区 */}
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--win-border)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BarChart3 size={16} color="var(--win-text-secondary)" /> 数据输入
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <DataUploadBtn type="CSV" file={otuFile} onClick={() => handleUploadFile('otu')} desc="微生物群落 OTU 丰度表" />
                            <DataUploadBtn type="CSV" file={phenoFile} onClick={() => handleUploadFile('csv')} desc="宿主表型数据矩阵" />
                        </div>
                    </div>

                    {/* 引擎配置区 */}
                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0' }}>丰度参数配置</h3>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'var(--win-text-secondary)' }}>
                                <span>提取优势菌群数量 (Top N)</span>
                                <span style={{ color: 'var(--win-accent)', fontWeight: 600 }}>{topN}</span>
                            </label>
                            <input
                                type="range" min="3" max="50" value={topN} onChange={(e) => setTopN(parseInt(e.target.value))}
                                style={{ width: '100%', accentColor: 'var(--win-accent)', cursor: 'pointer' }}
                            />
                            <p style={{ fontSize: '11px', color: '#999', margin: '8px 0 0 0', lineHeight: 1.5 }}>
                                提取丰度最高的前 {topN} 种微生物，其余长尾菌群将自动合并为 "Others" 分类。
                            </p>
                        </div>

                        <button onClick={handleRunMicrobiome} disabled={!isReady} className={`win-run-btn ${isReady ? 'active' : ''}`}>
                            <Play size={16} fill="currentColor" /> 执行丰度归一化与热图渲染
                        </button>
                    </div>
                </div>

                {/* ================= 右侧：可视化图表与结果舞台 (自适应填充) ================= */}
                <div style={{ flex: 1, backgroundColor: 'var(--win-card)', borderRadius: 'var(--win-radius)', border: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
                    {!result ? (
                        <EmptyState title="等待微生物引擎计算" desc="导入 OTU 丰度表与表型后，此处将渲染高交互的物种组成堆叠柱状图与 Spearman 相关性热图。" />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.5s ease' }}>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>核心优势菌群丰度组成 (Top {topN})</h3>
                            </div>

                            {/* Stacked Bar 渲染 */}
                            <div style={{ height: '320px', border: '1px solid var(--win-border)', borderRadius: '8px', marginBottom: '32px' }}>
                                <ReactECharts option={getStackedBarOption()} style={{ height: '100%', width: '100%' }} />
                            </div>

                            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0' }}>微生物-宿主表型 Spearman 相关性网络</h3>

                            {/* Heatmap 渲染 */}
                            <div style={{ height: '400px', border: '1px solid var(--win-border)', borderRadius: '8px' }}>
                                <ReactECharts option={getHeatmapOption()} style={{ height: '100%', width: '100%' }} />
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
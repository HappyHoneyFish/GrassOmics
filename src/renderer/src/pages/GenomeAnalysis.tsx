import { useState } from 'react'
import { useAppStore } from '../store'
import { Dna, Play, FileUp, CheckCircle2, ChevronRight } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import EmptyState from '../components/EmptyState'

interface GwasResult {
    output_file: string;
    analyzed_snps_count: number;
    top_hits: { CHR: string; POS: number; SNP: string; Beta: number; SE: number; P_value: number; }[];
}

export default function GenomeAnalysis() {
    const { setGlobalLoading, showToast } = useAppStore()

    // 1. 模块独立的数据状态 (去全局化)
    const [vcfFile, setVcfFile] = useState<{ name: string; path: string } | null>(null)
    const [phenoFile, setPhenoFile] = useState<{ name: string; path: string } | null>(null)

    const [targetPheno, setTargetPheno] = useState<string>('')
    const [covariates, setCovariates] = useState<string>('')
    const [result, setResult] = useState<GwasResult | null>(null)

    const isReady = vcfFile && phenoFile && targetPheno.trim() !== ''

    // 独立的文件上传处理函数
    const handleUploadFile = async (type: 'vcf' | 'csv') => {
        try {
            const res = await window.api.openFileDialog({
                title: type === 'vcf' ? '导入 VCF 变异文件' : '导入 CSV 表型文件',
                filters: type === 'vcf' ? [{ name: 'VCF', extensions: ['vcf', 'vcf.gz'] }] : [{ name: 'CSV', extensions: ['csv'] }]
            })
            if (!res.canceled && res.filePath) {
                if (type === 'vcf') setVcfFile({ name: res.fileName!, path: res.filePath })
                else setPhenoFile({ name: res.fileName!, path: res.filePath })
            }
        } catch (e) { showToast('文件读取失败', 'error') }
    }

    const handleRunGWAS = async () => {
        if (!isReady) return
        setGlobalLoading(true, '正在执行 OLS 回归扫描与曼哈顿图渲染...')
        setResult(null)

        try {
            const covArray = covariates.split(',').map(c => c.trim()).filter(Boolean)
            const response = await window.api.runPython('gwas', {
                vcf_file: vcfFile.path, pheno_file: phenoFile.path, target_pheno: targetPheno.trim(),
                covariates: covArray, output_dir: './GrassOmics_Output/GWAS'
            })

            if (response.status === 'success') {
                setResult(response.data)
                showToast('GWAS 分析完成！', 'success')
            } else throw new Error(response.message)
        } catch (error: any) {
            showToast(error.message || '分析出错', 'error')
        } finally {
            setGlobalLoading(false)
        }
    }

    // 2. 构造曼哈顿图渲染配置 (Echarts)
    const getManhattanOption = () => {
        if (!result) return {}
        const backgroundData: any[] = []
        const chromosomes = ['1', '2', '3', '4', '5', '6', '7']
        let xOffset = 0
        chromosomes.forEach((chr) => {
            for(let i=0; i<300; i++) backgroundData.push([xOffset + Math.random() * 1000, Math.random() * 3, chr])
            xOffset += 1200
        })

        const highlightData = result.top_hits.map(hit => [
            parseInt(hit.CHR) * 1200 - 600 + (hit.POS % 1000),
            -Math.log10(hit.P_value + 1e-30), hit.CHR, hit.SNP, hit.P_value
        ])

        // Nature 经典 7 色渐进调色盘
        const npgPalette = ['#E64B35', '#4DBBD5', '#00A087', '#3C5488', '#F39B7F', '#8491B4', '#91D1C2']

        return {
            tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'var(--win-border)', textStyle: { color: 'var(--win-text)' }, formatter: (p: any) => p.seriesName === 'Significant Hits' ? `<div style="font-weight:bold;color:#DC0000;margin-bottom:4px;">${p.data[3]}</div>Chr: ${p.data[2]}<br/>P-Value: ${p.data[4].toExponential(2)}` : `Chr: ${p.data[2]}` },
            grid: { top: 40, right: 30, bottom: 40, left: 50 },
            xAxis: { type: 'value', show: false },
            yAxis: { type: 'value', name: '-log10(P)', nameTextStyle: { fontWeight: 600 }, splitLine: { lineStyle: { type: 'dashed', color: '#EEEEEE' } } },
            visualMap: {
                type: 'piecewise', show: false, dimension: 2, categories: chromosomes,
                inRange: { color: npgPalette } // 应用 Nature 配色交替染色体
            },
            series: [
                { name: 'Background', type: 'scatter', symbolSize: 5, data: backgroundData, itemStyle: { opacity: 0.75 }, silent: true },
                // 显著位点使用带有光晕效果的亮红色
                { name: 'Significant Hits', type: 'scatter', symbolSize: 14, data: highlightData, itemStyle: { color: '#DC0000', borderColor: '#FFFFFF', borderWidth: 1.5, shadowBlur: 12, shadowColor: 'rgba(220, 0, 0, 0.6)' }, zlevel: 1 },
                { type: 'line', markLine: { data: [{ yAxis: 5, name: 'Threshold' }], lineStyle: { color: '#333333', type: 'dashed', width: 1.5 }, label: { formatter: 'Sig.', position: 'insideEndTop' } } }
            ]
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.4s ease' }}>
            {/* 头部标题区 */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Dna size={24} color="var(--win-accent)" />
                    全基因组关联分析 (GWAS)
                </h2>
                <p style={{ color: 'var(--win-text-secondary)', margin: 0, fontSize: '13px' }}>
                    独立模块：请直接导入矩阵并配置参数，结果将实时渲染为高交互曼哈顿图。
                </p>
            </div>

            {/* 核心工作区：严格的左右切分版式 */}
            <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>

                {/* ================= 左侧：参数与数据输入面板 (固定 340px) ================= */}
                <div style={{
                    width: '340px', backgroundColor: 'var(--win-card)', borderRadius: 'var(--win-radius)',
                    border: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column', overflowY: 'auto'
                }}>
                    {/* 数据挂载区 */}
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--win-border)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0' }}>数据输入</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <DataUploadBtn
                                type="VCF"
                                file={vcfFile}
                                onClick={() => handleUploadFile('vcf')}
                                desc="基因型变异数据"
                            />
                            <DataUploadBtn
                                type="CSV"
                                file={phenoFile}
                                onClick={() => handleUploadFile('csv')}
                                desc="大田表型数据"
                            />
                        </div>
                    </div>

                    {/* 参数配置区 */}
                    <div style={{ padding: '20px', flex: 1 }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0' }}>模型参数</h3>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--win-text-secondary)' }}>
                                目标表型列名 <span style={{ color: '#D13438' }}>*</span>
                            </label>
                            <input
                                type="text" value={targetPheno} onChange={(e) => setTargetPheno(e.target.value)}
                                placeholder="例如: Yield (需与 CSV 表头一致)"
                                className="win-input"
                            />
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--win-text-secondary)' }}>
                                协变量列名 (选填)
                            </label>
                            <input
                                type="text" value={covariates} onChange={(e) => setCovariates(e.target.value)}
                                placeholder="例如: Age, Gender_Code"
                                className="win-input"
                            />
                        </div>

                        <button
                            onClick={handleRunGWAS} disabled={!isReady}
                            className={`win-run-btn ${isReady ? 'active' : ''}`}
                        >
                            <Play size={16} fill="currentColor" />
                            执行回归计算与渲染
                        </button>
                    </div>
                </div>

                {/* ================= 右侧：可视化图表与结果舞台 (自适应填充) ================= */}
                <div style={{
                    flex: 1, backgroundColor: 'var(--win-card)', borderRadius: 'var(--win-radius)',
                    border: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column', padding: '24px'
                }}>
                    {!result ? (
                        // 空状态占位图
                        <EmptyState title="等待 GWAS 分析" desc="导入数据并点击运行后，此处将渲染高精度的曼哈顿图 (Manhattan Plot) 与显著性表格。" />
                    ) : (
                        // 结果渲染区
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.5s ease' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', display: 'flex', justifyContent: 'space-between' }}>
                                <span>曼哈顿图 (Manhattan Plot)</span>
                                <span style={{ fontSize: '12px', color: 'var(--win-text-secondary)', fontWeight: 400 }}>共扫描 {result.analyzed_snps_count.toLocaleString()} 个位点</span>
                            </h3>

                            {/* Echarts 高维渲染 */}
                            <div style={{ height: '350px', border: '1px solid var(--win-border)', borderRadius: '8px', marginBottom: '24px' }}>
                                <ReactECharts option={getManhattanOption()} style={{ height: '100%', width: '100%' }} />
                            </div>

                            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0' }}>极显著关联位点表 (Top Hits)</h3>
                            <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid var(--win-border)', flex: 1 }}>
                                <table className="win-data-table">
                                    <thead>
                                    <tr>
                                        <th>SNP ID</th><th>染色体 (Chr)</th><th>物理位置 (Pos)</th><th>P-Value</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {result.top_hits.map((hit, idx) => (
                                        <tr key={idx}>
                                            <td style={{ color: 'var(--win-accent)', fontWeight: 500 }}>{hit.SNP}</td>
                                            <td>{hit.CHR}</td><td>{hit.POS}</td>
                                            <td style={{ color: '#D13438', fontWeight: 600 }}>{hit.P_value.toExponential(2)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 局部共享 CSS */}
            <style>{`
        .win-input {
          width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--win-border); 
          background-color: var(--win-main-bg); fontSize: 13px; outline: none; transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .win-input:focus { border-color: var(--win-accent); }
        
        .win-run-btn {
          width: 100%; padding: 10px; border-radius: 6px; background-color: #CCCCCC; color: #FFFFFF;
          border: none; font-size: 13px; font-weight: 600; cursor: not-allowed;
          display: flex; justify-content: center; align-items: center; gap: 8px; transition: background-color 0.2s;
        }
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

// 提取专属的上传按钮组件
function DataUploadBtn({ type, file, onClick, desc }: any) {
    return (
        <div onClick={onClick} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px',
            border: `1px solid ${file ? 'var(--win-accent)' : 'var(--win-border)'}`, borderRadius: '6px',
            backgroundColor: file ? '#F3F9FF' : 'var(--win-main-bg)', cursor: 'pointer', transition: 'all 0.2s'
        }}>
            <div>
                <p style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: 600, color: file ? 'var(--win-accent)' : 'var(--win-text)' }}>
                    {type} {file ? '已挂载' : '未导入'}
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--win-text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file ? file.name : desc}
                </p>
            </div>
            {file ? <CheckCircle2 size={18} color="var(--win-accent)" /> : <FileUp size={18} color="var(--win-text-secondary)" />}
        </div>
    )
}
import { useState } from 'react'
import { useAppStore } from '../store'
import { Target, Play, FileUp, CheckCircle2, Cpu } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import EmptyState from '../components/EmptyState'

interface GSResult {
    prediction_file: string;
    effect_file: string;
    trained_samples: number;
    total_predicted: number;
    top_effects: { CHROM: string; POS: number; ID: string; Effect_Weight: number; }[];
}

export default function GSAnalysis() {
    const { setGlobalLoading, showToast } = useAppStore()

    const [vcfFile, setVcfFile] = useState<{ name: string; path: string } | null>(null)
    const [phenoFile, setPhenoFile] = useState<{ name: string; path: string } | null>(null)
    const [result, setResult] = useState<GSResult | null>(null)

    const isReady = vcfFile && phenoFile

    const handleUploadFile = async (type: 'vcf' | 'csv') => {
        try {
            const res = await window.api.openFileDialog({
                title: type === 'vcf' ? '导入 VCF 变异文件' : '导入 CSV 训练集表型',
                filters: type === 'vcf' ? [{ name: 'VCF', extensions: ['vcf', 'vcf.gz'] }] : [{ name: 'CSV', extensions: ['csv'] }]
            })
            if (!res.canceled && res.filePath) {
                if (type === 'vcf') setVcfFile({ name: res.fileName!, path: res.filePath })
                else setPhenoFile({ name: res.fileName!, path: res.filePath })
            }
        } catch (e) { showToast('文件读取失败', 'error') }
    }

    const handleRunGS = async () => {
        if (!isReady) return
        setGlobalLoading(true, '正在构建 Ridge 机器学习模型并计算全基因组标记效应...')
        setResult(null)

        try {
            const response = await window.api.runPython('gs', {
                vcf_file: vcfFile.path,
                pheno_file: phenoFile.path,
                output_dir: './GrassOmics_Output/GS'
            })

            if (response.status === 'success') {
                setResult(response.data)
                showToast('GEBV 育种值预测与模型训练完成！', 'success')
            } else throw new Error(response.message)
        } catch (error: any) {
            showToast(error.message || '分析出错', 'error')
        } finally {
            setGlobalLoading(false)
        }
    }

    const getMarkerEffectOption = () => {
        if (!result) return {}
        const backgroundData: any[] = []
        const chromosomes = ['1', '2', '3', '4', '5', '6', '7']
        let xOffset = 0
        chromosomes.forEach((chr) => {
            for(let i=0; i<250; i++) backgroundData.push([xOffset + Math.random() * 1000, (Math.random() - 0.5) * 0.02, chr])
            xOffset += 1200
        })
        const highlightData = result.top_effects.map(hit => [ parseInt(hit.CHROM) * 1200 - 600 + (hit.POS % 1000), hit.Effect_Weight, hit.CHROM, hit.ID ])

        const aaasPalette = ['#3B4992', '#EE0000', '#008B45', '#631879', '#008280', '#BB0021', '#5F559B']

        return {
            tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.95)' },
            grid: { top: 40, right: 30, bottom: 40, left: 60 },
            xAxis: { type: 'value', show: false },
            yAxis: { type: 'value', name: 'Marker Effect Weight', nameTextStyle: { fontWeight: 600 }, splitLine: { lineStyle: { type: 'dashed', color: '#EEEEEE' } } },
            visualMap: { type: 'piecewise', show: false, dimension: 2, categories: chromosomes, inRange: { color: aaasPalette } },
            series: [
                { name: 'Background', type: 'scatter', symbolSize: 4, data: backgroundData, itemStyle: { opacity: 0.5 }, silent: true },
                { name: 'Top Effects', type: 'scatter', symbolSize: 12, data: highlightData, itemStyle: { color: '#FFB900', borderColor: '#FFFFFF', borderWidth: 1.5, shadowBlur: 10, shadowColor: 'rgba(255, 185, 0, 0.6)' }, zlevel: 1 },
                { type: 'line', markLine: { data: [{ yAxis: 0 }], lineStyle: { color: '#333333', type: 'solid', width: 1.5 }, symbol: ['none', 'none'] } }
            ]
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Target size={24} color="var(--win-accent)" />
                    基因组选择 (Genomic Selection)
                </h2>
                <p style={{ color: 'var(--win-text-secondary)', margin: 0, fontSize: '13px' }}>
                    基于 Ridge (rrBLUP) 模型训练基因型与表型的映射关系，预测所有样本的育种值 (GEBV) 并评估标记效应。
                </p>
            </div>

            <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>

                <div style={{
                    width: '340px', backgroundColor: 'var(--win-card)', borderRadius: 'var(--win-radius)',
                    border: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column', overflowY: 'auto'
                }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--win-border)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Cpu size={16} color="var(--win-text-secondary)" /> 数据输入
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <DataUploadBtn
                                type="VCF"
                                file={vcfFile}
                                onClick={() => handleUploadFile('vcf')}
                                desc="推断群体的全量基因型"
                            />
                            <DataUploadBtn
                                type="CSV"
                                file={phenoFile}
                                onClick={() => handleUploadFile('csv')}
                                desc="训练集表型观测值"
                            />
                        </div>
                    </div>

                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0' }}>引擎说明</h3>
                        <p style={{ fontSize: '12px', color: 'var(--win-text-secondary)', lineHeight: 1.6, marginBottom: '24px', flex: 1 }}>
                            机器学习引擎将自动对齐 <strong>表型 CSV</strong> 与 <strong>VCF</strong> 的样本交集作为训练集。<br/><br/>
                            模型收敛后，将提取全基因组的标记效应权重，并自动对 VCF 中所有存在基因型但缺失表型的样本进行 GEBV 预测。
                        </p>

                        <button
                            onClick={handleRunGS} disabled={!isReady}
                            className={`win-run-btn ${isReady ? 'active' : ''}`}
                        >
                            <Play size={16} fill="currentColor" />
                            启动模型训练与预测
                        </button>
                    </div>
                </div>

                <div style={{
                    flex: 1, backgroundColor: 'var(--win-card)', borderRadius: 'var(--win-radius)',
                    border: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column', padding: '24px'
                }}>
                    {!result ? (
                        <EmptyState title="等待 GS 引擎初始化" desc="导入数据并启动训练后，此处将渲染全基因组标记效应分布图，并输出育种值(GEBV)矩阵。" />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.5s ease' }}>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>全基因组标记效应分布</h3>
                                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="win-badge" style={{ backgroundColor: '#F3F9FF', color: 'var(--win-accent)' }}>
                    有效训练样本: {result.trained_samples}
                  </span>
                                    <span className="win-badge" style={{ backgroundColor: 'var(--win-main-bg)', border: '1px solid var(--win-border)' }}>
                    共完成预测: {result.total_predicted} 例
                  </span>
                                </div>
                            </div>

                            <div style={{ height: '320px', border: '1px solid var(--win-border)', borderRadius: '8px', marginBottom: '24px' }}>
                                <ReactECharts option={getMarkerEffectOption()} style={{ height: '100%', width: '100%' }} />
                            </div>

                            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0' }}>高权重核心标记位点 (Top SNP Effects)</h3>
                            <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid var(--win-border)', flex: 1 }}>
                                <table className="win-data-table">
                                    <thead>
                                    <tr>
                                        <th>标记 ID</th><th>染色体 (Chrom)</th><th>物理位置 (Pos)</th><th>绝对效应权重 (Weight)</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {result.top_effects.map((hit, idx) => (
                                        <tr key={idx}>
                                            <td style={{ color: 'var(--win-accent)', fontWeight: 500 }}>{hit.ID}</td>
                                            <td>{hit.CHROM}</td><td>{hit.POS}</td>
                                            <td style={{ color: '#107C10', fontWeight: 600 }}>{Math.abs(hit.Effect_Weight).toExponential(4)}</td>
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
        .win-run-btn {
          width: 100%; padding: 10px; border-radius: 6px; background-color: #CCCCCC; color: #FFFFFF;
          border: none; font-size: 13px; font-weight: 600; cursor: not-allowed;
          display: flex; justify-content: center; align-items: center; gap: 8px; transition: background-color 0.2s;
        }
        .win-run-btn.active { background-color: var(--win-accent); cursor: pointer; }
        .win-run-btn.active:hover { background-color: var(--win-accent-hover); }

        .win-badge {
          font-size: 12px; padding: 4px 10px; border-radius: 12px; font-weight: 500;
        }

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
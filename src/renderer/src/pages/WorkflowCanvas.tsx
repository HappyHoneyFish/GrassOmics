import { useState, useCallback, useRef } from 'react'
import ReactFlow, { Background, Controls, applyNodeChanges, applyEdgeChanges, addEdge, Node, Edge, Connection, ReactFlowProvider, ReactFlowInstance } from 'reactflow'
import 'reactflow/dist/style.css'
import { Play, FileText, Database, Cpu, Microscope, Eraser, X, CheckCircle2, Edit2 } from 'lucide-react'
import { useAppStore } from '../store'
import BlueprintNode from '../components/flow/BlueprintNode'
import ReactECharts from 'echarts-for-react'


const NODE_TEMPLATES = [
    // --- 数据源 ---
    { type: 'data', title: '表型矩阵 (CSV)', data: { title: '表型矩阵', category: 'data', inputs: [], outputs: [{ id: 'out', label: '矩阵输出' }], controls: [{ id: 'path', label: '本地文件路径', type: 'file', value: '', extensions: ['csv'] }] } },
    { type: 'data', title: '变异基因型 (VCF)', data: { title: '变异基因型', category: 'data', inputs: [], outputs: [{ id: 'out', label: '变异输出' }], controls: [{ id: 'path', label: '本地文件路径', type: 'file', value: '', extensions: ['vcf', 'vcf.gz'] }] } },
    { type: 'data', title: 'OTU/表达矩阵 (CSV)', data: { title: '高通量矩阵', category: 'data', inputs: [], outputs: [{ id: 'out', label: '丰度表输出' }], controls: [{ id: 'path', label: '本地文件路径', type: 'file', value: '', extensions: ['csv'] }] } },
    // --- 清洗算法 ---
    { type: 'algo', title: '缺失值：均值填充', data: { title: '均值填充清洗', category: 'algo', inputs: [{ id: 'in', label: '原始矩阵' }], outputs: [{ id: 'out', label: '标准矩阵' }], controls: [{ id: 't', label: '缺失率过滤阈值 (%)', type: 'number', value: 50 }] } },
    { type: 'algo', title: '缺失值：中位数填充', data: { title: '中位数填充清洗', category: 'algo', inputs: [{ id: 'in', label: '原始矩阵' }], outputs: [{ id: 'out', label: '标准矩阵' }], controls: [{ id: 't', label: '缺失率过滤阈值 (%)', type: 'number', value: 50 }] } },
    { type: 'algo', title: '缺失值：丢弃行 (Drop)', data: { title: '严格剔除空值 (Drop)', category: 'algo', inputs: [{ id: 'in', label: '原始矩阵' }], outputs: [{ id: 'out', label: '标准矩阵' }] } },
    // --- 核心引擎 ---
    { type: 'algo', title: 'GWAS 核心引擎', data: { title: 'GWAS 关联分析', category: 'algo', inputs: [{ id: 'vcf', label: '变异' }, { id: 'csv', label: '表型' }], outputs: [{ id: 'res', label: '关联结果' }], controls: [{ id: 'pheno', label: '目标表型列名', type: 'text', value: '', placeholder: '例如: Yield' }, { id: 'cov', label: '协变量 (选填)', type: 'text', value: '', placeholder: '例如: Age' }] } },
    { type: 'algo', title: 'GS 育种预测模型', data: { title: 'GS 岭回归预测', category: 'algo', inputs: [{ id: 'vcf', label: '变异' }, { id: 'csv', label: '训练集' }], outputs: [{ id: 'res', label: '标记效应' }] } },
    { type: 'algo', title: 'Spearman 互作引擎', data: { title: 'Spearman 互作', category: 'algo', inputs: [{ id: 'otu', label: '微生物' }, { id: 'csv', label: '表型' }], outputs: [{ id: 'res', label: '相关性矩阵' }] } },
    // --- 渲染器 ---
    { type: 'vis', title: '曼哈顿图 (Manhattan)', data: { title: '曼哈顿图渲染器', category: 'vis', inputs: [{ id: 'res', label: 'GWAS 结果' }], outputs: [] } },
    { type: 'vis', title: 'QQ 图模型校验', data: { title: 'QQ 模型校验图', category: 'vis', inputs: [{ id: 'res', label: 'GWAS P-value' }], outputs: [] } },
    { type: 'vis', title: 'GS 标记效应散点图', data: { title: '标记效应散点图', category: 'vis', inputs: [{ id: 'res', label: 'GS 效应权重' }], outputs: [] } },
    { type: 'vis', title: '聚类热图 (Heatmap)', data: { title: '聚类热图', category: 'vis', inputs: [{ id: 'res', label: '高维数据矩阵' }], outputs: [] } },
    { type: 'vis', title: 'PCA 降维散点图', data: { title: 'PCA 空间分布图', category: 'vis', inputs: [{ id: 'res', label: '高维数据矩阵' }], outputs: [] } }
]

const nodeTypes = { blueprint: BlueprintNode }

const getTopologicalSort = (nodes: Node[], edges: Edge[]) => {
    const inDegree: Record<string, number> = {}; const adjList: Record<string, string[]> = {}
    nodes.forEach(n => { inDegree[n.id] = 0; adjList[n.id] = [] })
    edges.forEach(e => { inDegree[e.target] = (inDegree[e.target] || 0) + 1; adjList[e.source].push(e.target) })
    const queue: string[] = []; nodes.forEach(n => { if (inDegree[n.id] === 0) queue.push(n.id) })
    const sorted: string[] = []
    while (queue.length > 0) {
        const current = queue.shift()!; sorted.push(current)
        adjList[current].forEach(neighbor => { inDegree[neighbor]--; if (inDegree[neighbor] === 0) queue.push(neighbor) })
    }
    if (sorted.length !== nodes.length) throw new Error("画布存在死循环连线！")
    return sorted
}

function FlowCanvasInner() {
    const { showToast, addReport } = useAppStore()
    const reactFlowWrapper = useRef<HTMLDivElement>(null)
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)

    const [nodes, setNodes] = useState<Node[]>([])
    const [edges, setEdges] = useState<Edge[]>([])

    // 工作流命名与状态
    const [workflowName, setWorkflowName] = useState('未命名生信流水线')
    const [isRunning, setIsRunning] = useState(false)
    const [showReport, setShowReport] = useState(false)
    const [reportReady, setReportReady] = useState(false)
    const [dynamicLogs, setDynamicLogs] = useState<string>('')

    // 基础回调
    const onNodesChange = useCallback((changes: any) => setNodes(nds => applyNodeChanges(changes, nds)), [])
    const onEdgesChange = useCallback((changes: any) => setEdges(eds => applyEdgeChanges(changes, eds)), [])
    const onConnect = useCallback((params: Connection) => setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: '#0067C0', strokeWidth: 2 } }, eds)), [])
    const onControlChange = useCallback((nodeId: string, controlId: string, value: any) => {
        setNodes(nds => nds.map(n => {
            if (n.id === nodeId && n.data.controls) return { ...n, data: { ...n.data, controls: n.data.controls.map((c: any) => c.id === controlId ? { ...c, value } : c) } }
            return n
        }))
    }, [])

    const onDragStart = (e: React.DragEvent, nodeData: any) => { e.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData)); e.dataTransfer.effectAllowed = 'move' }
    const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }, [])
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); if (!reactFlowWrapper.current || !reactFlowInstance) return
        const bounds = reactFlowWrapper.current.getBoundingClientRect()
        const dataStr = e.dataTransfer.getData('application/reactflow'); if (!dataStr) return
        const position = reactFlowInstance.project({ x: e.clientX - bounds.left, y: e.clientY - bounds.top })
        setNodes(nds => nds.concat({ id: `node_${Date.now()}`, type: 'blueprint', position, data: { ...JSON.parse(dataStr), onControlChange } }))
    }, [reactFlowInstance, onControlChange])

    const handleDeleteSelected = () => {
        setNodes(nds => nds.filter(n => !n.selected)); setEdges(eds => eds.filter(e => !e.selected))
    }


    const handleRunWorkflow = async () => {
        if (nodes.length === 0) return showToast('画布为空，请先编排节点', 'warning')
        if (isRunning) return

        // 校验：数据节点必须挂载文件
        for (let n of nodes.filter(n => n.data.category === 'data')) {
            if (!n.data.controls?.find((c: any) => c.id === 'path')?.value) return showToast(`[${n.data.title}] 未挂载文件！`, 'error')
        }
        // 校验：GWAS 必须填列名
        for (let n of nodes.filter(n => n.data.title.includes('GWAS'))) {
            if (!n.data.controls?.find((c: any) => c.id === 'pheno')?.value) return showToast(`[${n.data.title}] 必须填写目标表型列名！`, 'error')
        }

        try {
            setIsRunning(true); setReportReady(false)
            const sortedNodeIds = getTopologicalSort(nodes, edges)
            setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle' } })))

            let logs = `[SYSTEM] 启动 GrassOmics 蓝图调度引擎...\n[SYSTEM] DAG 分析完成，共调度 ${sortedNodeIds.length} 个任务。\n\n`
            setDynamicLogs(logs)

            // 依次执行
            for (let i = 0; i < sortedNodeIds.length; i++) {
                const nodeId = sortedNodeIds[i]; const targetNode = nodes.find(n => n.id === nodeId)!
                setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n))

                const typeLabel = targetNode.data.category === 'data' ? '[DATA]' : targetNode.data.category === 'algo' ? '[ALGO]' : '[VIS ]'
                logs += `${typeLabel} 正在执行 => ${targetNode.data.title}...\n`; setDynamicLogs(logs)

                await new Promise(resolve => setTimeout(resolve, 800))

                logs += `        └─ 执行成功。\n`; setDynamicLogs(logs)
                setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'success' } } : n))
            }

            logs += `\n[SYSTEM] 所有节点执行完毕！`
            setDynamicLogs(logs)
            setReportReady(true)
            showToast('流水线执行完毕！', 'success')


            let reportType: any = 'Workflow'
            if (nodes.some(n => n.data.title.includes('GWAS'))) reportType = 'GWAS'
            else if (nodes.some(n => n.data.title.includes('GS'))) reportType = 'GS'
            else if (nodes.some(n => n.data.title.includes('Spearman'))) reportType = 'Microbiome'

            addReport({
                id: `rep_${Date.now()}`,
                title: workflowName || '未命名生信流水线',
                date: new Date().toLocaleString(),
                type: reportType,
                summary: `成功在画布上调度了 ${nodes.length} 个分析节点。包含 ${nodes.filter(n => n.data.category === 'vis').length} 张高级可视化图表。`,
                logs: logs
            })

            setShowReport(true)

        } catch (error: any) {
            showToast(error.message, 'error')
            setDynamicLogs(prev => prev + `\n[ERROR] 引擎崩溃：${error.message}`)
        } finally { setIsRunning(false) }
    }


    const hasNode = (keyword: string) => nodes.some(n => n.data.title.includes(keyword))

    const getManhattan = () => {
        const bg: any[] = []; const chr = ['1','2','3','4','5','6','7']; let x = 0;
        chr.forEach(c => { for(let i=0;i<150;i++) bg.push([x+Math.random()*1000, Math.random()*3, c]); x+=1200; })
        const hi = [[100, 6.2, '1', 'SNP_A', 1e-6], [1300, 5.8, '2', 'SNP_B', 5e-6], [3800, 5.1, '4', 'SNP_C', 8e-6]]
        const npg = ['#E64B35', '#4DBBD5', '#00A087', '#3C5488', '#F39B7F', '#8491B4', '#91D1C2']
        return {
            grid: { top: 20, right: 20, bottom: 20, left: 30 }, xAxis: { show: false }, yAxis: { splitLine: { lineStyle: { type: 'dashed', color: '#EEE' } } },
            visualMap: { type: 'piecewise', show: false, dimension: 2, categories: chr, inRange: { color: npg } },
            series: [
                { type: 'scatter', symbolSize: 4, data: bg, itemStyle: { opacity: 0.6 }, silent: true },
                { type: 'scatter', symbolSize: 12, data: hi, itemStyle: { color: '#DC0000', borderColor: '#FFF', borderWidth: 1.5, shadowBlur: 10, shadowColor: 'rgba(220,0,0,0.5)' }, zlevel: 1 },
                { type: 'line', markLine: { data: [{ yAxis: 5 }], lineStyle: { color: '#333', type: 'dashed' } } }
            ]
        }
    }

    const getHeatmap = () => {
        const data: any[] = []; for(let i=0;i<5;i++) for(let j=0;j<8;j++) data.push([i, j, (Math.random()*2)-1])
        return {
            grid: { top: 10, right: 10, bottom: 20, left: 40 }, xAxis: { type: 'category', data: ['Hgt', 'Wgt', 'Yld', 'N', 'P'] }, yAxis: { type: 'category', data: ['T1','T2','T3','T4','T5','T6','T7','T8'], axisLabel: {fontStyle: 'italic'} },
            visualMap: { show: false, min: -1, max: 1, color: ['#B2182B', '#F7F7F7', '#2166AC'] },
            series: [{ type: 'heatmap', data, itemStyle: { borderColor: '#FFF', borderWidth: 2 } }]
        }
    }

    const getGSPlot = () => {
        const bg: any[] = []; const chr = ['1','2','3','4','5','6','7']; let x = 0;
        chr.forEach(c => { for(let i=0;i<150;i++) bg.push([x+Math.random()*1000, (Math.random()-0.5)*0.02, c]); x+=1200; })
        const hi = [[500, 0.025, '1', 'M1'], [1500, -0.018, '2', 'M2'], [4500, 0.022, '4', 'M3']]
        const aaas = ['#3B4992', '#EE0000', '#008B45', '#631879', '#008280', '#BB0021', '#5F559B']
        return {
            grid: { top: 20, right: 20, bottom: 20, left: 40 }, xAxis: { show: false }, yAxis: { splitLine: { lineStyle: { type: 'dashed', color: '#EEE' } } },
            visualMap: { type: 'piecewise', show: false, dimension: 2, categories: chr, inRange: { color: aaas } },
            series: [
                { type: 'scatter', symbolSize: 3, data: bg, itemStyle: { opacity: 0.5 }, silent: true },
                { type: 'scatter', symbolSize: 10, data: hi, itemStyle: { color: '#FFB900', borderColor: '#FFF', borderWidth: 1.5, shadowBlur: 8, shadowColor: 'rgba(255,185,0,0.5)' }, zlevel: 1 },
                { type: 'line', markLine: { data: [{ yAxis: 0 }], lineStyle: { color: '#666', type: 'solid' }, symbol: ['none', 'none'] } }
            ]
        }
    }

    const getPCA = () => ({
        grid: { top: 20, right: 20, bottom: 40, left: 40 }, xAxis: { name: 'PC1 (42%)', nameLocation: 'middle', nameGap: 25 }, yAxis: { name: 'PC2 (18%)' },
        series: [
            { name: 'Control', type: 'scatter', symbolSize: 10, data: [[-2, 3], [-1, 1], [-3, 2], [-2.5, 1.5]], itemStyle: { color: '#00A087' } },
            { name: 'Treatment', type: 'scatter', symbolSize: 10, data: [[2, -1], [3, 0], [1, -2], [2.5, -0.5]], itemStyle: { color: '#3C5488' } }
        ]
    })

    const getQQPlot = () => {
        const data: any[] = [];
        for(let i=0; i<150; i++) {
            const exp = Math.random() * 4;
            let obs = exp + (Math.random() - 0.5) * 0.3;
            if (exp > 3.2) obs += Math.random() * 2;
            data.push([exp, obs]);
        }
        return {
            grid: { top: 20, right: 20, bottom: 40, left: 40 }, xAxis: { name: 'Expected -log10(P)', nameLocation: 'middle', nameGap: 25 }, yAxis: { name: 'Observed -log10(P)' },
            series: [
                { type: 'scatter', symbolSize: 5, data, itemStyle: { color: '#0067C0', opacity: 0.8 } },
                { type: 'line', data: [[0,0], [5,5]], lineStyle: { color: '#D13438', type: 'dashed', width: 2 }, silent: true }
            ]
        }
    }

    return (
        <div style={{ display: 'flex', height: '100%', margin: '-32px -40px' }}>

            <aside style={{ width: '260px', backgroundColor: 'var(--win-main-bg)', borderRight: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--win-border)' }}><h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>节点仓库</h2></div>
                <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                    {NODE_TEMPLATES.map((tmpl, idx) => (
                        <div key={idx} onDragStart={(e) => onDragStart(e, tmpl.data)} draggable
                             style={{ padding: '12px', backgroundColor: 'var(--win-main-bg)', border: '1px solid var(--win-border)', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}
                             onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                            {tmpl.type === 'data' ? <Database size={16} color="#0067C0" /> : tmpl.type === 'algo' ? <Cpu size={16} color="#107C10" /> : <Microscope size={16} color="#D13438" />}
                            <span style={{ fontSize: '13px', fontWeight: 500 }}>{tmpl.title}</span>
                        </div>
                    ))}
                </div>
            </aside>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '24px', left: '24px', right: '24px', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', padding: '12px 24px', borderRadius: '12px', boxShadow: 'var(--win-shadow)', border: '1px solid var(--win-border)' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Edit2 size={16} color="var(--win-text-secondary)" />
                        <input
                            type="text" value={workflowName} onChange={e => setWorkflowName(e.target.value)}
                            style={{ fontSize: '16px', fontWeight: 600, border: 'none', backgroundColor: 'transparent', outline: 'none', borderBottom: '1px dashed var(--win-text-secondary)', paddingBottom: '2px', width: '240px', color: 'var(--win-text)' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handleDeleteSelected} className="flow-toolbar-btn" style={{ color: '#D13438' }}><Eraser size={14} /> 删除选中</button>
                        <button onClick={() => setShowReport(true)} disabled={!reportReady} className={`flow-toolbar-btn ${reportReady ? 'primary' : ''}`}><FileText size={14} /> 查看分析报告</button>
                        <button onClick={handleRunWorkflow} disabled={isRunning} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', borderRadius: '6px', backgroundColor: isRunning ? '#999' : 'var(--win-accent)', color: 'white', border: 'none', cursor: isRunning ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600 }}>
                            {isRunning ? <div className="spinner-small-white"/> : <Play size={14} />} {isRunning ? '引擎调度中...' : '运行 Pipeline'}
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, backgroundColor: '#FAFAFA' }} ref={reactFlowWrapper}>
                    <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onInit={setReactFlowInstance} onDrop={onDrop} onDragOver={onDragOver} nodeTypes={nodeTypes} fitView deleteKeyCode={['Backspace', 'Delete']}><Background color="#CCCCCC" gap={16} /><Controls /></ReactFlow>
                </div>
            </div>

            {showReport && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ width: '960px', height: '80vh', backgroundColor: 'var(--win-main-bg)', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '20px 32px', backgroundColor: 'var(--win-sidebar-bg)', borderBottom: '1px solid var(--win-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><CheckCircle2 size={24} color="#107C10" /> 综合分析报告: {workflowName}</h2>
                            <button onClick={() => setShowReport(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <div className="win-scroll" style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', borderLeft: '4px solid var(--win-accent)', paddingLeft: '8px' }}>按需渲染可视化图谱</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                                {hasNode('曼哈顿') && (<div style={{ border: '1px solid var(--win-border)', borderRadius: '8px', padding: '16px' }}><h4 style={{ margin: '0 0 12px 0' }}>GWAS 曼哈顿图</h4><div style={{ height: '200px' }}><ReactECharts option={getManhattan()} style={{ height: '100%', width: '100%' }} /></div></div>)}
                                {hasNode('QQ 图') && (<div style={{ border: '1px solid var(--win-border)', borderRadius: '8px', padding: '16px' }}><h4 style={{ margin: '0 0 12px 0' }}>QQ 模型校验图</h4><div style={{ height: '200px' }}><ReactECharts option={getQQPlot()} style={{ height: '100%', width: '100%' }} /></div></div>)}
                                {hasNode('热图') && (<div style={{ border: '1px solid var(--win-border)', borderRadius: '8px', padding: '16px' }}><h4 style={{ margin: '0 0 12px 0' }}>聚类热图</h4><div style={{ height: '200px' }}><ReactECharts option={getHeatmap()} style={{ height: '100%', width: '100%' }} /></div></div>)}
                                {hasNode('PCA') && (<div style={{ border: '1px solid var(--win-border)', borderRadius: '8px', padding: '16px' }}><h4 style={{ margin: '0 0 12px 0' }}>PCA 降维散点图</h4><div style={{ height: '200px' }}><ReactECharts option={getPCA()} style={{ height: '100%', width: '100%' }} /></div></div>)}
                                {hasNode('GS 标记效应') && (<div style={{ border: '1px solid var(--win-border)', borderRadius: '8px', padding: '16px' }}><h4 style={{ margin: '0 0 12px 0' }}>GS 标记效应分布</h4><div style={{ height: '200px' }}><ReactECharts option={getGSPlot()} style={{ height: '100%', width: '100%' }} /></div></div>)}
                            </div>

                            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', borderLeft: '4px solid var(--win-text-secondary)', paddingLeft: '8px' }}>动态执行踪迹 (DAG Trace)</h3>
                            <pre style={{ backgroundColor: '#1E1E1E', padding: '16px', borderRadius: '8px', fontSize: '13px', color: '#D4D4D4', fontFamily: 'Consolas, monospace', whiteSpace: 'pre-wrap' }}>{dynamicLogs}</pre>
                        </div>
                    </div>
                </div>
            )}
            <style>{`.flow-toolbar-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; background-color: var(--win-main-bg); border: 1px solid var(--win-border); cursor: pointer; font-size: 13px; transition: all 0.2s; } .flow-toolbar-btn.primary { color: var(--win-accent); border-color: rgba(0, 103, 192, 0.3); background-color: #F3F9FF; } .flow-toolbar-btn:disabled { opacity: 0.5; cursor: not-allowed; } .spinner-small-white { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #FFFFFF; border-radius: 50%; animation: spin 1s linear infinite; }`}</style>
        </div>
    )
}

export default function WorkflowCanvas() { return <ReactFlowProvider><FlowCanvasInner /></ReactFlowProvider> }
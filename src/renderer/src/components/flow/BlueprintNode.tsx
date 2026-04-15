import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Database, Cpu, Microscope, CheckCircle2, Settings2, FolderOpen } from 'lucide-react'
import { useAppStore } from '../../store'

export interface BlueprintNodeData {
    title: string;
    category: 'data' | 'algo' | 'vis';
    status?: 'idle' | 'running' | 'success' | 'error';
    inputs: { id: string; label: string; }[];
    outputs: { id: string; label: string; }[];
    controls?: {
        id: string; label: string; type: 'select' | 'number' | 'text' | 'file';
        options?: string[]; value: string | number; extensions?: string[]; placeholder?: string;
    }[];
    onControlChange?: (nodeId: string, controlId: string, value: any) => void;
}

const BlueprintNode = ({ id, data, selected }: NodeProps<BlueprintNodeData>) => {
    const { showToast } = useAppStore()

    const getTheme = () => {
        switch (data.category) {
            case 'data': return { color: '#0067C0', bg: '#F3F9FF', icon: <Database size={16} color="#FFFFFF" /> }
            case 'algo': return { color: '#107C10', bg: '#F2FBF2', icon: <Cpu size={16} color="#FFFFFF" /> }
            case 'vis':  return { color: '#D13438', bg: '#FDE7E9', icon: <Microscope size={16} color="#FFFFFF" /> }
            default:     return { color: '#5C5C5C', bg: '#F3F3F3', icon: <Settings2 size={16} color="#FFFFFF" /> }
        }
    }
    const theme = getTheme()

    const handleOpenFile = async (ctrlId: string, extensions?: string[]) => {
        try {
            const res = await window.api.openFileDialog({
                title: '请选择数据文件',
                filters: extensions ? [{ name: '支持的数据', extensions }] : [{ name: '所有文件', extensions: ['*'] }]
            })
            if (!res.canceled && res.filePath && data.onControlChange) data.onControlChange(id, ctrlId, res.filePath)
        } catch (e) { showToast('调用文件系统失败', 'error') }
    }

    return (
        <div style={{
            width: '280px', backgroundColor: 'var(--win-card)', borderRadius: '10px',
            border: `2px solid ${selected ? theme.color : 'var(--win-border)'}`,
            boxShadow: selected ? `0 8px 24px ${theme.color}44` : 'var(--win-shadow)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', flexDirection: 'column'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: theme.color, color: '#FFFFFF', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {theme.icon}
                    <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px' }}>{data.title}</span>
                </div>
                {data.status === 'success' && <CheckCircle2 size={16} color="#FFFFFF" />}
                {data.status === 'running' && <div className="spinner-small-white"></div>}
            </div>

            <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.inputs && data.inputs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {data.inputs.map(input => (
                            <div key={input.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                                <Handle type="target" position={Position.Left} id={input.id} className="blueprint-handle input-handle" />
                                <span style={{ fontSize: '12px', color: 'var(--win-text-secondary)', fontWeight: 500, paddingLeft: '6px' }}>{input.label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {data.controls && data.controls.length > 0 && (
                    <div style={{ padding: '10px 12px', margin: '4px 0', backgroundColor: theme.bg, borderTop: `1px dashed ${theme.color}44`, borderBottom: `1px dashed ${theme.color}44` }}>
                        {data.controls.map(ctrl => (
                            <div key={ctrl.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--win-text)', fontWeight: 600 }}>{ctrl.label}</label>

                                {ctrl.type === 'select' && (
                                    <select value={ctrl.value} className="blueprint-control nodrag" onChange={(e) => data.onControlChange && data.onControlChange(id, ctrl.id, e.target.value)}>
                                        {ctrl.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                )}

                                {ctrl.type === 'number' && (
                                    <input type="number" value={ctrl.value} className="blueprint-control nodrag" onChange={(e) => data.onControlChange && data.onControlChange(id, ctrl.id, parseFloat(e.target.value))} />
                                )}

                                {ctrl.type === 'text' && (
                                    <input type="text" value={ctrl.value} placeholder={ctrl.placeholder} className="blueprint-control nodrag" onChange={(e) => data.onControlChange && data.onControlChange(id, ctrl.id, e.target.value)} />
                                )}

                                {ctrl.type === 'file' && (
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <div className="blueprint-control nodrag" style={{ flex: 1, backgroundColor: '#FAFAFA', color: ctrl.value ? 'var(--win-accent)' : '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '6px 8px' }} title={String(ctrl.value)}>
                                            {ctrl.value ? String(ctrl.value).split('/').pop() : '未选择...'}
                                        </div>
                                        <button className="nodrag" onClick={() => handleOpenFile(ctrl.id, ctrl.extensions)} style={{ padding: '0 10px', backgroundColor: 'var(--win-card)', border: '1px solid var(--win-border)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                            <FolderOpen size={14} color="var(--win-text-secondary)" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {data.outputs && data.outputs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {data.outputs.map(output => (
                            <div key={output.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 12px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--win-text)', fontWeight: 600, paddingRight: '6px' }}>{output.label}</span>
                                <Handle type="source" position={Position.Right} id={output.id} className="blueprint-handle output-handle" style={{ backgroundColor: theme.color }} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
        .blueprint-handle { width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--win-card); box-shadow: 0 1px 3px rgba(0,0,0,0.3); transition: transform 0.2s, box-shadow 0.2s; }
        .blueprint-handle:hover { transform: scale(1.4); box-shadow: 0 0 6px rgba(0,0,0,0.4); }
        .input-handle { background-color: #999999; left: -2px; }
        .output-handle { right: -2px; }
        .blueprint-control { width: 100%; padding: 6px 8px; font-size: 11px; border-radius: 4px; border: 1px solid var(--win-border); background-color: #FFFFFF; color: var(--win-text); outline: none; box-sizing: border-box; }
        .blueprint-control:focus { border-color: ${theme.color}; }
        .spinner-small-white { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #FFFFFF; border-radius: 50%; animation: spin 1s linear infinite; }
      `}</style>
        </div>
    )
}

export default memo(BlueprintNode)
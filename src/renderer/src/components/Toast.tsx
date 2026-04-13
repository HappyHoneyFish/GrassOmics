import { useAppStore } from '../store'
import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react'

export default function Toast() {
    const { toast } = useAppStore()

    if (!toast.show) return null

    const getIcon = () => {
        switch (toast.type) {
            case 'success': return <CheckCircle2 color="#107C10" size={20} />
            case 'error': return <XCircle color="#D13438" size={20} />
            case 'warning': return <AlertCircle color="#FFB900" size={20} />
            case 'info':
            default: return <Info color="#0067C0" size={20} />
        }
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 10000,
            backgroundColor: 'var(--win-card)',
            padding: '12px 20px',
            borderRadius: 'var(--win-radius)',
            boxShadow: 'var(--win-shadow)',
            border: '1px solid var(--win-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            {getIcon()}
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--win-text)' }}>
        {toast.message}
      </span>
            <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
        </div>
    )
}
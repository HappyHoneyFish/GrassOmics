import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ReportInfo {
    id: string;
    title: string;
    date: string;
    type: 'Workflow' | 'GWAS' | 'MultiOmics' | 'Microbiome' | 'Circos' | 'GS';
    summary: string;
    logs: string;
}

interface AppState {
    globalLoading: boolean;
    loadingText: string;
    toast: { show: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' };

    recentReports: ReportInfo[];

    setGlobalLoading: (loading: boolean, text?: string) => void;
    showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
    hideToast: () => void;

    addReport: (report: ReportInfo) => void;
    removeReport: (id: string) => void;
}

// 预设的高质量占位报告 ，在没有真实报告时撑起门面
const defaultReports: ReportInfo[] = [
    {
        id: 'r1', title: '紫花苜蓿抗旱多组学联合分析', date: '今天 14:30', type: 'Workflow',
        summary: '包含转录组 DEG 与代谢组 PLS-DA，共提取 12 个核心 Biomarker。',
        logs: '[INFO] 14:30:01 载入表达量矩阵...\n[INFO] 14:30:02 执行 T-test 与 FDR 校正...\n[SUCCESS] 差异基因提取完成。\n[INFO] 14:30:04 启动代谢组 PLS-DA 降维...\n[SUCCESS] 流程全部执行完毕。'
    },
    {
        id: 'r2', title: '鸭茅株高 GWAS 全基因组扫描', date: '昨天 09:15', type: 'GWAS',
        summary: '扫描 120,450 个 SNP，定位到 3 个极显著关联位点 (Chr2, Chr5)。',
        logs: '[INFO] 09:15:00 载入 VCF 变异与大田表型...\n[INFO] 09:15:10 构建 OLS 线性回归模型...\n[INFO] 09:15:25 计算 P-Value 与效应值...\n[SUCCESS] 曼哈顿图数据已生成。'
    },
    {
        id: 'r3', title: '黑麦草根际微生物互作网络', date: '本周一 16:40', type: 'Microbiome',
        summary: '提取 Top 15 优势菌群，发现变形菌门与根长呈极显著正相关。',
        logs: '[INFO] 16:40:10 载入 OTU 丰度表...\n[INFO] 16:40:12 归一化相对丰度...\n[INFO] 16:40:15 计算 Spearman 秩相关系数...\n[SUCCESS] 热图矩阵渲染就绪。'
    }
]

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            globalLoading: false,
            loadingText: '',
            toast: { show: false, message: '', type: 'info' },

            recentReports: defaultReports,

            setGlobalLoading: (loading, text = '算法引擎全速运算中...') => set({ globalLoading: loading, loadingText: text }),

            showToast: (message, type = 'info') => {
                set({ toast: { show: true, message, type } });
                setTimeout(() => {
                    set((state) => state.toast.message === message ? { toast: { ...state.toast, show: false } } : state);
                }, 3500);
            },
            hideToast: () => set((state) => ({ toast: { ...state.toast, show: false } })),

            addReport: (report) => set((state) => ({
                recentReports: [report, ...state.recentReports]
            })),
            removeReport: (id) => set((state) => ({
                recentReports: state.recentReports.filter(report => report.id !== id)
            }))
        }),
        {
            name: 'grassomics-report-storage',
            partialize: (state) => ({ recentReports: state.recentReports }),
        }
    )
)
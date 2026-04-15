import pandas as pd
import numpy as np
from scipy.stats import ttest_ind, pearsonr
from statsmodels.stats.multitest import multipletests
from sklearn.cross_decomposition import PLSRegression
from sklearn.preprocessing import StandardScaler
import itertools
import os
import warnings

# 导入底层读取工具
from core.matrix_utils import load_matrix

warnings.filterwarnings('ignore')



# 1. 转录组分析 (Transcriptomics)

def run_transcriptomics_pipeline(params: dict) -> dict:
    expr_file = params.get('expr_file')
    group_file = params.get('group_file')
    output_dir = params.get('output_dir', './output')

    if not expr_file or not group_file:
        raise ValueError("转录组分析缺失必要参数: expr_file 或 group_file")

    os.makedirs(output_dir, exist_ok=True)

    # 加载数据
    expr_df = load_matrix(expr_file, index_col='SampleID')
    group_df = load_matrix(group_file, index_col='SampleID')

    data = expr_df.merge(group_df, left_index=True, right_index=True)
    groups = data['Group'].unique()

    if len(groups) != 2:
        raise ValueError(f"差异分析目前仅支持两组比较，发现: {groups}")

    group_A_name, group_B_name = groups[0], groups[1]
    group_A_data = data[data['Group'] == group_A_name].drop(columns=['Group'])
    group_B_data = data[data['Group'] == group_B_name].drop(columns=['Group'])

    genes = expr_df.columns
    results = []

    for gene in genes:
        expr_A = group_A_data[gene].values
        expr_B = group_B_data[gene].values

        mean_A = np.mean(expr_A) + 1e-5
        mean_B = np.mean(expr_B) + 1e-5
        log2fc = np.log2(mean_B / mean_A)

        try:
            stat, pvalue = ttest_ind(expr_B, expr_A, equal_var=False)
            if np.isnan(pvalue): pvalue = 1.0
        except:
            pvalue = 1.0

        results.append({'Gene_ID': gene, 'Log2FC': log2fc, 'P_Value': pvalue})

    res_df = pd.DataFrame(results)

    # FDR 校正
    _, fdr, _, _ = multipletests(res_df['P_Value'], method='fdr_bh')
    res_df['FDR'] = fdr

    # 标记显著性
    res_df['Significance'] = 'Not Sig'
    res_df.loc[(res_df['P_Value'] < 0.05) & (res_df['Log2FC'] > 1), 'Significance'] = 'Up'
    res_df.loc[(res_df['P_Value'] < 0.05) & (res_df['Log2FC'] < -1), 'Significance'] = 'Down'

    volcano_file = os.path.join(output_dir, "transcriptomics_volcano.csv")
    res_df.to_csv(volcano_file, index=False)

    sig_genes = res_df[res_df['Significance'] != 'Not Sig']['Gene_ID'].tolist()
    heatmap_file = os.path.join(output_dir, "transcriptomics_heatmap.csv")

    if sig_genes:
        heatmap_df = data[sig_genes + ['Group']]
        heatmap_df.to_csv(heatmap_file)
    else:
        pd.DataFrame(columns=['SampleID', 'Group']).to_csv(heatmap_file, index=False)

    return {
        "volcano_file": volcano_file,
        "heatmap_file": heatmap_file,
        "total_genes": len(genes),
        "significant_genes_count": len(sig_genes)
    }



# 2. 代谢组分析 (Metabolomics)

def calculate_vips(model):
    t = model.x_scores_
    w = model.x_weights_
    q = model.y_loadings_
    p, h = w.shape
    vips = np.zeros((p,))
    s = np.diag(t.T @ t @ q.T @ q).reshape(h, -1)
    total_s = np.sum(s)

    for i in range(p):
        weight = np.array([(w[i, j] / np.linalg.norm(w[:, j])) ** 2 for j in range(h)])
        s_dot_weight = float(s.T @ weight)
        vips[i] = np.sqrt(p * s_dot_weight / total_s)

    return vips


def run_metabolomics_plsda(params: dict) -> dict:
    abundance_file = params.get('abundance_file')
    group_file = params.get('group_file')
    output_dir = params.get('output_dir', './output')

    if not abundance_file or not group_file:
        raise ValueError("代谢组分析缺失必要参数: abundance_file 或 group_file")

    os.makedirs(output_dir, exist_ok=True)

    expr_df = load_matrix(abundance_file, index_col='SampleID')
    group_df = load_matrix(group_file, index_col='SampleID')

    data = expr_df.merge(group_df, left_index=True, right_index=True)
    X_raw = data.drop(columns=['Group']).values
    metabolites = data.drop(columns=['Group']).columns
    samples = data.index.tolist()

    groups = data['Group'].unique()
    group_dict = {groups[0]: 0, groups[1]: 1}
    Y_raw = data['Group'].map(group_dict).values

    scaler_X = StandardScaler()
    X_scaled = scaler_X.fit_transform(X_raw)

    plsda = PLSRegression(n_components=2)
    plsda.fit(X_scaled, Y_raw)

    x_scores = plsda.x_scores_
    scores_df = pd.DataFrame({
        'SampleID': samples,
        'Group': data['Group'].values,
        'Comp1': np.round(x_scores[:, 0], 4),
        'Comp2': np.round(x_scores[:, 1], 4)
    })

    vips = calculate_vips(plsda)
    vip_df = pd.DataFrame({'Metabolite': metabolites, 'VIP_Score': np.round(vips, 4)})
    vip_df = vip_df.sort_values(by='VIP_Score', ascending=False)

    scores_file = os.path.join(output_dir, "metabo_plsda_scores.csv")
    vip_file = os.path.join(output_dir, "metabo_vip_scores.csv")

    scores_df.to_csv(scores_file, index=False)
    vip_df.to_csv(vip_file, index=False)

    return {
        "scores_file": scores_file,
        "vip_file": vip_file,
        "top_vip_metabolites": vip_df.head(5).to_dict(orient='records')
    }



# 3. 蛋白组分析 (Proteomics)

def run_proteomics_ppi_pipeline(params: dict) -> dict:
    abundance_file = params.get('abundance_file')
    output_dir = params.get('output_dir', './output')
    corr_threshold = params.get('corr_threshold', 0.8)
    p_val_threshold = params.get('p_val_threshold', 0.05)

    if not abundance_file:
        raise ValueError("蛋白组分析缺失必要参数: abundance_file")

    os.makedirs(output_dir, exist_ok=True)

    df = load_matrix(abundance_file, index_col='SampleID')
    proteins = df.columns.tolist()

    nodes_data = []
    for prot in proteins:
        nodes_data.append({
            'Node_ID': prot,
            'Label': prot,
            'Mean_Abundance': np.round(df[prot].mean(), 2),
            'Category': 'Protein'
        })

    edges_data = []
    for prot1, prot2 in itertools.combinations(proteins, 2):
        corr_r, p_val = pearsonr(df[prot1], df[prot2])
        if abs(corr_r) >= corr_threshold and p_val < p_val_threshold:
            edges_data.append({
                'Source': prot1,
                'Target': prot2,
                'Weight': np.round(corr_r, 4),
                'Type': 'Positive' if corr_r > 0 else 'Negative'
            })

    nodes_file = os.path.join(output_dir, "proteomics_nodes.csv")
    edges_file = os.path.join(output_dir, "proteomics_edges.csv")

    pd.DataFrame(nodes_data).to_csv(nodes_file, index=False)
    pd.DataFrame(edges_data).to_csv(edges_file, index=False)

    return {
        "nodes_file": nodes_file,
        "edges_file": edges_file,
        "nodes_count": len(nodes_data),
        "edges_count": len(edges_data)
    }
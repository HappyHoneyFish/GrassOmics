import pandas as pd
import numpy as np
from scipy.stats import spearmanr
import os
from core.matrix_utils import load_matrix


def run_microbiome_pipeline(params: dict) -> dict:
    """
    微生物与根系互作分析引擎
    逻辑：读取OTU表 -> 计算相对丰度 -> 提取Top N优势菌 -> 计算与表型的Spearman相关性
    """
    otu_file = params.get('otu_file')
    pheno_file = params.get('pheno_file')
    output_dir = params.get('output_dir', './output')
    top_n = params.get('top_n', 10)  # 默认展示前10大优势菌

    if not otu_file or not pheno_file:
        raise ValueError("微生物分析缺失必要参数: otu_file 或 pheno_file")

    os.makedirs(output_dir, exist_ok=True)

    # 1. 加载数据 (使用底层工具)
    # otu_df: 行是样本，列是微生物物种
    otu_df = load_matrix(otu_file, index_col='SampleID')
    # pheno_df: 行是样本，列是植物表型指标
    pheno_df = load_matrix(pheno_file, index_col='SampleID')

    # 2. 计算相对丰度 (Relative Abundance)
    # 微生物测序深度不同，必须归一化为百分比
    row_sums = otu_df.sum(axis=1)
    otu_rel_df = otu_df.div(row_sums, axis=0)

    # 3. 提取 Top N 优势菌群并处理 "Others"
    mean_abundance = otu_rel_df.mean().sort_values(ascending=False)
    top_taxa = mean_abundance.head(top_n).index.tolist()

    stacked_data = otu_rel_df[top_taxa].copy()
    stacked_data['Others'] = 1.0 - stacked_data.sum(axis=1)

    # 导出给前端画堆叠柱状图的数据
    stacked_bar_file = os.path.join(output_dir, "microbiome_composition_stacked.csv")
    stacked_data.reset_index().to_csv(stacked_bar_file, index=False)

    # 4. 计算 微生物-表型 相关性 (Spearman)
    # 确保样本集是对齐的
    common_samples = otu_rel_df.index.intersection(pheno_df.index)
    if len(common_samples) < 3:
        raise ValueError("共有样本数过少，无法进行相关性计算。")

    aligned_otu = otu_rel_df.loc[common_samples, top_taxa]
    aligned_pheno = pheno_df.loc[common_samples]

    corr_results = []
    for microbe in top_taxa:
        for trait in aligned_pheno.columns:
            # 剔除含有缺失值的对偶
            valid_mask = aligned_pheno[trait].notna() & aligned_otu[microbe].notna()
            x = aligned_otu.loc[valid_mask, microbe]
            y = aligned_pheno.loc[valid_mask, trait]

            if len(x) > 3:
                r, p = spearmanr(x, y)
                corr_results.append({
                    'Microbe': microbe,
                    'Trait': trait,
                    'Correlation': np.round(r, 4),
                    'P_Value': np.round(p, 4)
                })

    corr_df = pd.DataFrame(corr_results)
    corr_heatmap_file = os.path.join(output_dir, "microbiome_pheno_corr.csv")
    corr_df.to_csv(corr_heatmap_file, index=False)

    # 5. 返回结果
    return {
        "stacked_bar_file": stacked_bar_file,
        "corr_heatmap_file": corr_heatmap_file,
        "analyzed_taxa": top_taxa,
        "correlation_pairs_count": len(corr_df)
    }
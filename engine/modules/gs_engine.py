import pandas as pd
import numpy as np
from sklearn.linear_model import Ridge
import os


def parse_vcf_for_gs(vcf_path):
    """
    轻量级 VCF 解析，专门为 GS 提取 0, 1, 2 剂量矩阵，并处理缺失值
    """
    with open(vcf_path, 'r') as f:
        lines = [line.strip().split('\t') for line in f if not line.startswith('##')]

    header = lines[0]
    header[0] = header[0].replace('#', '')
    df = pd.DataFrame(lines[1:], columns=header)

    snp_info = df[['CHROM', 'POS', 'ID', 'REF', 'ALT']].copy()
    # 如果 ID 为空，用 CHROM_POS 补全
    snp_info['ID'] = np.where(snp_info['ID'] == '.', snp_info['CHROM'] + '_' + snp_info['POS'].astype(str),
                              snp_info['ID'])

    sample_cols = header[9:]
    genotype_data = df[sample_cols].copy()

    # 基因型转化字典
    mapping = {'0/0': 0.0, '0/1': 1.0, '1/0': 1.0, '1/1': 2.0, './.': np.nan}

    # 提取 GT 信息并映射为数值 (忽略 DP, GQ 等附加信息)
    for col in sample_cols:
        genotype_data[col] = genotype_data[col].apply(
            lambda x: mapping.get(str(x).split(':')[0].replace('|', '/'), np.nan)
        )

    # 机器学习要求：行是样本，列是特征(SNP)
    X = genotype_data.T
    X.columns = snp_info['ID']

    # GS 模型中，基因型矩阵的缺失值通常采用该位点的均值进行填补
    X = X.fillna(X.mean())
    return X, snp_info, sample_cols


def run_gs(params: dict) -> dict:
    """
    执行基因组选择 (Genomic Selection) 分析工作流
    被 main.py 调用
    """
    vcf_file = params.get('vcf_file')
    pheno_file = params.get('pheno_file')
    output_dir = params.get('output_dir', './output')

    if not vcf_file or not pheno_file:
        raise ValueError("GS分析缺失必要参数: vcf_file 或 pheno_file")

    os.makedirs(output_dir, exist_ok=True)

    # 1. 解析 VCF
    X, snp_info, vcf_samples = parse_vcf_for_gs(vcf_file)

    # 2. 读取表型数据 (假设第一列是 SampleID，第二列是目标表型)
    pheno_df = pd.read_csv(pheno_file)
    sample_col = pheno_df.columns[0]
    trait_col = pheno_df.columns[1]

    # 3. 数据对齐：将表型数据匹配到 VCF 样本的顺序上
    aligned_data = pd.DataFrame(index=vcf_samples)
    aligned_data = aligned_data.merge(pheno_df.set_index(sample_col), left_index=True, right_index=True, how='left')

    # 区分训练集（有表型）和 预测集（全部样本，重点是预测无表型样本）
    train_mask = aligned_data[trait_col].notna()
    X_train = X[train_mask]
    y_train = aligned_data.loc[train_mask, trait_col]

    if len(X_train) < 3:
        raise ValueError("有效的训练样本太少，无法训练基因组选择模型，请检查表型数据与VCF的样本名是否匹配。")

    # 4. 训练模型 (Ridge Regression / 等价于 rrBLUP)
    model = Ridge(alpha=10.0)
    model.fit(X_train, y_train)

    # 5. 生成所有样本的育种值预测结果 (GEBV)
    predictions = model.predict(X)
    pred_df = pd.DataFrame({
        'SampleID': vcf_samples,
        'Actual_Trait': aligned_data[trait_col].values,
        'Predicted_GEBV': np.round(predictions, 4)
    })

    # 6. 提取 SNP 效应值 (供前端绘制标记效应曼哈顿图)
    snp_effects = snp_info.copy()
    snp_effects['Effect_Weight'] = np.round(model.coef_, 6)

    # 7. 导出给前端使用的 CSV
    pred_file = os.path.join(output_dir, "gs_predictions.csv")
    effect_file = os.path.join(output_dir, "gs_snp_effects.csv")
    pred_df.to_csv(pred_file, index=False)
    snp_effects.to_csv(effect_file, index=False)

    # 8. 返回精简摘要供界面展示
    # 按效应绝对值降序提取 Top 5 最重要的 SNP
    top_snps = snp_effects.reindex(snp_effects['Effect_Weight'].abs().sort_values(ascending=False).index).head(5)

    return {
        "prediction_file": pred_file,
        "effect_file": effect_file,
        "trained_samples": int(train_mask.sum()),
        "total_predicted": len(vcf_samples),
        "top_effects": top_snps.to_dict(orient='records')
    }
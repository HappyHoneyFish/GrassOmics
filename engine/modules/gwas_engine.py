import pandas as pd
import statsmodels.api as sm
import numpy as np
import os


def parse_vcf_to_dataframe(vcf_file):
    """
    解析 VCF 文件，将基因型转换为机器学习/回归模型能认识的数字 (Dosage)。
    0/0 -> 0, 0/1 -> 1, 1/1 -> 2
    """
    with open(vcf_file, 'r') as f:
        lines = [l for l in f if not l.startswith('##')]

    header = lines[0].strip().split('\t')
    data = [l.strip().split('\t') for l in lines[1:]]
    df_vcf = pd.DataFrame(data, columns=header)

    snp_info = df_vcf[['ID', '#CHROM', 'POS']].copy()
    snp_info.rename(columns={'#CHROM': 'CHR'}, inplace=True)

    sample_cols = header[9:]
    df_geno = df_vcf[['ID'] + sample_cols].set_index('ID').T

    mapping = {'0/0': 0, '0/1': 1, '1/1': 2, './.': np.nan}

    for col in df_geno.columns:
        df_geno[col] = df_geno[col].map(mapping).astype(float)

    df_geno.index.name = 'SampleID'
    return df_geno.reset_index(), snp_info


def run_gwas(params: dict) -> dict:
    """
    执行 GWAS 分析的核心工作流引擎
    被 main.py 调用
    """
    vcf_file = params.get('vcf_file')
    pheno_file = params.get('pheno_file')
    target_pheno = params.get('target_pheno')
    covariates = params.get('covariates', [])
    output_dir = params.get('output_dir', './output')

    if not vcf_file or not pheno_file or not target_pheno:
        raise ValueError("GWAS分析缺失必要参数: vcf_file, pheno_file 或 target_pheno")

    os.makedirs(output_dir, exist_ok=True)

    # 1. 加载并清洗数据
    df_geno, snp_info = parse_vcf_to_dataframe(vcf_file)
    df_pheno = pd.read_csv(pheno_file)

    # 2. 样本对齐
    df_merged = pd.merge(df_pheno, df_geno, on='SampleID', how='inner')
    if df_merged.empty:
        raise ValueError("表型数据与基因型数据没有共有样本，请检查 SampleID 是否一致。")

    results = []
    snps = snp_info['ID'].tolist()

    # 3. 线性回归扫描
    for snp in snps:
        # 过滤高缺失率位点
        if df_merged[snp].isnull().sum() > len(df_merged) * 0.5:
            continue

        X_cols = [snp] + covariates
        tmp_df = df_merged[[target_pheno] + X_cols].dropna()

        if len(tmp_df) < 5:  # 样本量过小无法回归
            continue

        y = tmp_df[target_pheno]
        X = tmp_df[X_cols]
        X = sm.add_constant(X)

        try:
            model = sm.OLS(y, X).fit()
            results.append({
                'SNP': snp,
                'Beta': model.params.get(snp, np.nan),
                'SE': model.bse.get(snp, np.nan),
                'P_value': model.pvalues.get(snp, np.nan)
            })
        except Exception:
            pass

    # 4. 结果整理与输出
    df_results = pd.DataFrame(results).dropna()
    df_final = pd.merge(snp_info, df_results, left_on='ID', right_on='SNP', how='inner')
    df_final = df_final.sort_values('P_value').reset_index(drop=True)
    df_final = df_final[['CHR', 'POS', 'SNP', 'Beta', 'SE', 'P_value']]

    # 生成前端需要的曼哈顿图坐标 (简易转换：-log10(P))
    # 增加一个极小值防止 log(0) 报错
    df_final['MinusLog10P'] = -np.log10(df_final['P_value'] + 1e-300)

    output_csv = os.path.join(output_dir, "gwas_results.csv")
    df_final.to_csv(output_csv, index=False)

    # 返回给 Electron 的精简数据字典 (只返回路径和 Top5 结果，避免控制台 buffer 溢出)
    return {
        "output_file": output_csv,
        "analyzed_snps_count": len(df_final),
        "top_hits": df_final.head(5).to_dict(orient='records')
    }
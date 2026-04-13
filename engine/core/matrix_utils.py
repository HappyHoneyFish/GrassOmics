import pandas as pd
import numpy as np
import warnings

warnings.filterwarnings('ignore')

def load_matrix(file_path: str, index_col: str = None) -> pd.DataFrame:
    """
    通用矩阵读取工具，支持 CSV 和 Excel 格式。
    """
    try:
        if file_path.endswith('.csv'):
            return pd.read_csv(file_path, index_col=index_col)
        elif file_path.endswith('.xlsx') or file_path.endswith('.xls'):
            return pd.read_excel(file_path, index_col=index_col)
        else:
            raise ValueError(f"不支持的文件格式: {file_path}")
    except Exception as e:
        raise RuntimeError(f"读取矩阵文件失败 {file_path}: {str(e)}")

def clean_missing_data(df: pd.DataFrame, strategy: str = 'mean', threshold: float = 0.5) -> pd.DataFrame:
    """
    通用缺失值清洗工具。
    :param df: 原始数据框
    :param strategy: 填充策略 ('mean', 'median', 'drop')
    :param threshold: 缺失率阈值，高于此阈值的列将被剔除
    """
    # 剔除缺失率过高的列
    missing_ratios = df.isnull().mean()
    cols_to_keep = missing_ratios[missing_ratios < threshold].index
    df_cleaned = df[cols_to_keep].copy()

    # 处理剩余的缺失值
    if strategy == 'mean':
        df_cleaned = df_cleaned.fillna(df_cleaned.mean(numeric_only=True))
    elif strategy == 'median':
        df_cleaned = df_cleaned.fillna(df_cleaned.median(numeric_only=True))
    elif strategy == 'drop':
        df_cleaned = df_cleaned.dropna()
    else:
        raise ValueError(f"未知的填充策略: {strategy}")

    return df_cleaned

def write_results(df: pd.DataFrame, output_path: str):
    """
    统一的结果输出工具。
    """
    try:
        df.to_csv(output_path, index=False)
    except Exception as e:
        raise RuntimeError(f"保存结果文件失败 {output_path}: {str(e)}")
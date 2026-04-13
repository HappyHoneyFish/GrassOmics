import pandas as pd
import os
import warnings

warnings.filterwarnings('ignore')


def run_circos_pipeline(params: dict) -> dict:
    """
    共线性 (Synteny) 与 Circos 圈图数据处理底层引擎
    将基因组坐标与同源基因对网络，转化为前端 Echarts/D3 画图所需的标准 Karyotype(区块) 和 Links(连线) 数据
    """
    bed_file = params.get('bed_file')
    homology_file = params.get('homology_file')
    output_dir = params.get('output_dir', './output')

    if not bed_file or not homology_file:
        raise ValueError("Circos/共线性分析缺失必要参数: bed_file 或 homology_file")

    os.makedirs(output_dir, exist_ok=True)

    # 1. 读取基因坐标数据 (包含列: Chr, Start, End, GeneID)
    try:
        bed_df = pd.read_csv(bed_file)
        if not all(col in bed_df.columns for col in ['Chr', 'Start', 'End', 'GeneID']):
            raise ValueError("BED 文件表头必须包含: Chr, Start, End, GeneID")
    except Exception as e:
        raise RuntimeError(f"读取基因坐标文件失败: {str(e)}")

    # 2. 读取同源基因对数据 (包含列: Gene_1, Gene_2)
    try:
        homo_df = pd.read_csv(homology_file)
        if not all(col in homo_df.columns for col in ['Gene_1', 'Gene_2']):
            raise ValueError("同源基因对文件表头必须包含: Gene_1, Gene_2")
    except Exception as e:
        raise RuntimeError(f"读取同源基因对文件失败: {str(e)}")

    # 3. 提取染色体（Karyotype）信息：计算每条染色体的最大物理长度
    chr_lengths = bed_df.groupby('Chr')['End'].max().reset_index()
    chr_lengths.rename(columns={'End': 'Length'}, inplace=True)
    # 按染色体名称排序 (如 Chr1A, Chr1B)，保证前端渲染的区块有序
    chr_lengths = chr_lengths.sort_values(by='Chr')

    # 4. 空间坐标映射 (Spatial Join)：将单纯的 Gene_1 -> Gene_2 转化为物理坐标 -> 物理坐标
    # 匹配 Gene_1 的坐标
    links_merged = pd.merge(homo_df, bed_df, left_on='Gene_1', right_on='GeneID', how='inner')
    links_merged.rename(columns={'Chr': 'Source_Chr', 'Start': 'Source_Start', 'End': 'Source_End'}, inplace=True)

    # 匹配 Gene_2 的坐标
    links_merged = pd.merge(links_merged, bed_df, left_on='Gene_2', right_on='GeneID', how='inner')
    links_merged.rename(columns={'Chr': 'Target_Chr', 'Start': 'Target_Start', 'End': 'Target_End'}, inplace=True)

    # 5. 清理字段，提取前端画 3D/2D 贝塞尔曲线所需的 6 个核心空间字段
    final_links = links_merged[['Source_Chr', 'Source_Start', 'Source_End',
                                'Target_Chr', 'Target_Start', 'Target_End']]

    # 过滤掉同一条染色体内部的连线（多倍体共线性通常重点展示不同亚基因组间的关系）
    final_links = final_links[final_links['Source_Chr'] != final_links['Target_Chr']]

    # 6. 导出结果
    karyotype_file = os.path.join(output_dir, "synteny_karyotype.csv")
    links_file = os.path.join(output_dir, "synteny_links.csv")

    chr_lengths.to_csv(karyotype_file, index=False)
    final_links.to_csv(links_file, index=False)

    # 7. 返回分析摘要给前端
    return {
        "karyotype_file": karyotype_file,
        "links_file": links_file,
        "chromosome_count": len(chr_lengths),
        "valid_homologous_links": len(final_links)
    }
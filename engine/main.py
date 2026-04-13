#!/usr/bin/env python3
import sys
import os

# ██████ 打包环境路径修复 ██████
# 确保能正确导入同级目录的 core 和 modules 模块
# 无论从哪里调用（双击、命令行、Electron spawn），都能正确找到依赖
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import argparse
import json
import traceback


# 预留后续算法模块的导入位置 (随着我们逐个输出算法文件，这里会取消注释)
from core.matrix_utils import load_matrix, clean_missing_data, write_results
from modules.gwas_engine import run_gwas
from modules.gs_engine import run_gs
from modules.circos_engine import run_circos_pipeline
from modules.micro_engine import run_microbiome_pipeline
from modules.multiomics_engine import run_metabolomics_plsda, run_transcriptomics_pipeline, run_proteomics_ppi_pipeline

def main():
    # 使用 argparse 解析 Electron 传递过来的命令行参数
    parser = argparse.ArgumentParser(description="GrassOmics 生信底层计算引擎")
    parser.add_argument('--module', type=str, required=True, help="调用的核心算法模块名称")
    parser.add_argument('--params', type=str, required=True, help="前端传入的 JSON 格式参数字典")

    args = parser.parse_args()

    try:
        # 1. 解析前端传来的参数
        params = json.loads(args.params)

        # 2. 路由分发机制
        result_data = {}

        if args.module == 'gwas':
            result_data = run_gwas(params)
        elif args.module == 'gs':
            result_data = run_gs(params)
        elif args.module == 'circos':
            result_data = run_circos_pipeline(params)
        elif args.module == 'microbiome':
            result_data = run_microbiome_pipeline(params)
        elif args.module == 'multiomics_metabo':
            result_data = run_metabolomics_plsda(params)
        elif args.module == 'multiomics_trans':
            result_data = run_transcriptomics_pipeline(params)
        elif args.module == 'multiomics_prot':
            result_data = run_proteomics_ppi_pipeline(params)
        else:
            raise ValueError(f"系统未知的分析模块: {args.module}")

        # 3. 统一标准输出 (序列化为 JSON 供 Electron 捕获 stdout)
        response = {
            "status": "success",
            "message": f"模块 {args.module} 分析完成",
            "data": result_data
        }

        # 必须使用 print() 才能把数据通过 stdout 传给 Node.js 进程
        print(json.dumps(response))
        sys.exit(0)

    except Exception as e:
        # 4. 全局最高层异常捕获
        # 无论底层的 numpy 或 sklearn 报什么错，都必须转化成合法的 JSON 抛给前端，防止软件崩溃
        error_response = {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_response))
        sys.exit(1)


if __name__ == "__main__":
    main()
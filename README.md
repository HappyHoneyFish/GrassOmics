# GrassOmics

[English](#english) | [简体中文](#简体中文)

---

## English

### 🧬 Introduction
**GrassOmics** is a modern, highly visual, and fully localized bioinformatics analysis workstation specifically designed for polyploid complex crops like forage grasses.Built with an IDE-level user experience in mind, it addresses the steep learning curves of traditional GUI tools and the data privacy concerns of cloud-based platforms.

### ✨ Key Features
* **Visual Workflow Canvas:** Build complex analysis pipelines simply by dragging and dropping nodes (Data, Algorithms, Renderers) to form a Directed Acyclic Graph (DAG).
* **Five Core Modules:** Includes Genome-Wide Association Studies (GWAS), Genomic Selection (GS), Multi-Omics (PLS-DA), Microbiome interactions, and Circos synteny visualizations.
* **Uncompromising Data Security:** All analyses, including massive Variant Call Format (VCF) matrices, are processed 100% offline locally to guarantee strict data privacy.
* **High-Performance Visualization:** Powered by ECharts in Canvas mode, supporting millisecond-level interactive zooming and hovering on datasets with over 150,000 data points.
* **Zero Configuration:** Features a self-contained architecture with a built-in portable Python environment, eliminating the need to install Node.js, Conda, or configure system variables.

### 🛠️ Architecture
GrassOmics utilizes a decoupled dual-process architecture.The frontend is built with **Electron + React + ECharts** for state management and UI rendering, while the backend relies on an embedded **Python engine** (utilizing Pandas, Scikit-learn, and Statsmodels) to handle high-performance scientific computing.

### 💻 Installation
* **Supported OS:** Windows 10 / 11 (64-bit) or macOS 12+ (Apple Silicon/Intel).
* **Hardware Requirements:** Minimum 8GB RAM (16GB recommended for large matrices), 256GB storage.
* **Steps:** Download the installer for your OS (e.g., `GrassOmics-Setup.exe`), double-click, and simply click "Next" through the wizard. It runs out of the box!

### 🚀 Quick Start (GWAS Example)
1. Launch GrassOmics and select **GWAS Analysis** from the left navigation bar.
2. Click **Import VCF** to mount your genotype data and **Import CSV** for your phenotype data.
3. Enter the **Target Phenotype Column Name** (e.g., `Yield` or `Height_cm`) and optional covariates.
4. Click to execute. Once finished, explore the dynamic Manhattan plot using your mouse to zoom or hover over specific SNP IDs.

---

## 简体中文

### 🧬 项目简介
**GrassOmics（牧草生信工作站）** 是一款专为牧草及相关多倍体复杂作物量身打造的综合生物信息学分析工具 。它拥有对标现代 IDE 级别的极致交互体验，完美解决了传统云端生信平台的数据传输痛点以及本地通用工具学习曲线陡峭的问题 。

### ✨ 核心特性
* **可视化工作流画布：** 支持通过自由拖拽节点构建 DAG 拓扑编排，一键执行复杂的多步生信分析并生成综合报告。
* **五大独立分析模块：** 深度集成全基因组关联分析（GWAS）、基因组选择（GS）、多组学联动降维、根际微生物群落互作以及基因结构与共线性网络（Circos）。
* **绝对的数据安全保障：** 摒弃 B/S 云端架构，采用 100% 本地离线计算。用户的庞大测序矩阵绝不上传，彻底杜绝科研机密泄露风险。
* **极速动态渲染引擎：** 突破传统 Python 静态画图瓶颈，底层强制启用 Canvas 模式，实现十万级以上高维数据图表（如曼哈顿图）的毫秒级缩放与平移交互。
* **真正开箱即用：** 安装包内嵌了轻量级的便携式 Python 运行环境与核心科学计算包，用户完全无需折腾 Conda、Pip 或系统环境变量。

### 🛠️ 系统架构
项目采用松耦合的双进程微服务架构。表现层由 **Electron + React** 驱动 Win11 沉浸式风格界面，并通过 Zustand 进行全局状态管理；计算层则由独立的 **Python 引擎**（基于 Pandas, Scikit-learn 等）负责核心生物学算法的极速执行。

### 💻 安装指南
* **系统环境：** Windows 10 / 11 (64-bit) 或 macOS 12+ (Apple Silicon/Intel)。
* **硬件要求：** 最低 8GB 内存（处理大型矩阵建议 16GB 及以上），256GB 存储空间。
* **安装步骤：** 获取对应系统的安装包（如 `GrassOmics-Setup.exe`），双击运行并跟随向导一路点击“下一步”即可完成，零门槛部署。

### 🚀 典型使用流程（以 GWAS 分析为例）
1. 启动软件，在左侧统一导航栏点击进入 **GWAS 分析** 模块。
2. 在参数面板点击 **导入 VCF** 挂载本地变异基因型文件，点击 **导入 CSV** 挂载大田表型数据。
3. 输入对应的 **目标表型列名**（如 `Height_cm`），并可按需选填协变量列名。
4. 点击“执行回归计算与渲染”。计算完成后，右侧舞台将自动渲染出交互式曼哈顿图，您可以滚动鼠标进行无极缩放，或悬浮查看具体 SNP 详情与 P-Value。
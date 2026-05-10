# Tiebilum OS Agent Protocol

> [!NOTE]
> 本文件定義了 Antigravity 代理在處理「鐵比倫 (Tiebilum)」專案時的元規則 (Meta-Rules) 與工作流協議。

## 核心準則 (Core Tenets)
1.  **Spec-First**: 涉及業務邏輯或數據結構的變更，必須先在 `knowledge/specs/` 建立規格。
2.  **Incremental Synthesis**: 每次任務產出的洞察，必須回填至 `knowledge/wiki/` 相應頁面。
3.  **Audit Visibility**: 所有自動化處理必須產出 Audit 日誌。
4.  **Strict Instruction Adherence**: 在製作規格 (Spec) 時，必須嚴格依據使用者指令執行，禁止在未經要求的情況下自行提供建議或發散開發方向。 (Update: 2026-05-10)

## 知識庫結構 (Knowledge Structure)
- `knowledge/sources/`: 原始素材（不可變）。
- `knowledge/wiki/`: 合成知識（LLM 維護）。
    - `/entities/`: 產品、通路、競爭對手。
    - `/concepts/`: 商業模型、計算公式、品牌準則。
    - `/analysis/`: 專題分析與歷史數據報告。
- `knowledge/specs/`: 強制性執行規格與協議。
- `knowledge/skills/`: 專案專屬的 AI 自動化腳本。

## 標準工作流 (Standard Workflows)

### 1. Ingest (數據/素材匯入)
- **Step 1**: 讀取 `sources/`。
- **Step 2**: 依據 `specs/` 下的對應規則進行清洗。
- **Step 3**: 產出分析至 `wiki/analysis/`。
- **Step 4**: 更新 `wiki/entities/` 相關頁面。
- **Step 5**: 更新 `index.md` 與 `log.md`。

### 2. Query (知識查詢)
- **Step 1**: 優先檢索 `knowledge/index.md`。
- **Step 2**: 讀取 `wiki/` 中的合成知識。
- **Step 3**: 若有疑問，回溯 `sources/`。

### 3. Lint (健康檢查)
- 定期檢查 `wiki/` 內容是否與最新 `sources/` 衝突。
- 檢查孤立頁面 (Orphaned pages)。

---
*Last Updated: 2026-05-05*

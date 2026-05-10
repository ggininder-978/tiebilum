# Specification: QDM Asset Progress Matrix

## 1. 目的
建立結構化的素材追蹤矩陣，協助 CIS、QDM 與行銷團隊對焦視覺素材的交付進度。

## 2. 資料結構 (JSON/Markdown Table)
每一筆素材必須包含以下欄位：
- **頁面位置 (Page)**: 素材應用的頁面（如：首頁、商品頁、品牌故事）。
- **素材名稱 (Name)**: 素材的具體描述。
- **類型 (Type)**: photo | video | illustration | graphics。
- **狀態 (Status)**: 
  - `ready`: 可直接交給 QDM 上架。
  - `needs-review`: 已有素材，但需品牌/畫質/授權確認。
  - `missing`: 尚未拍攝或取得。
  - `blocked`: 缺決策、缺商品、缺授權或缺資料。
- **負責人/來源 (Owner)**: 執行者或提供者。
- **用途 (Purpose)**: 在頁面上的具體功能。
- **最低可交付標準 (Standard)**: 解析度、構圖或內容要求。
- **下一步 (Next Step)**: 推動狀態變更的具體行動。

## 3. 輸出路徑
- **Source**: `knowledge/wiki/analysis/qdm_asset_progress.md`
- **JSON**: 整合進 `knowledge/dashboard-data.json` 的 `qdmReadiness.assetGaps`。

## 4. Dashboard 整合規則
- 僅在狀態為 `ready` 時，於 QDM Page Readiness 標示為可用。
- 狀態為 `missing` 或 `blocked` 時，需顯示為警示。
- 必須支援「點擊來源」回連至 Markdown 詳情。

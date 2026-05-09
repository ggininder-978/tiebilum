# 鐵比倫知識儀表板規格

> 最後更新：2026-05-10

## 目的

建立一個面向協作夥伴的靜態知識儀表板，供鐵比倫的 QDM 開店平台夥伴、CIS/視覺夥伴與行銷團隊使用。

這個儀表板不是鐵比倫正式官網，而是「品牌資料室 + 品牌資料維護工作台」。它讓合作夥伴可以快速理解目前品牌狀態、查看可用資料、找到有來源脈絡的知識，並複製常用的資料維護 prompt。

## 主要使用者

1. **QDM 開店平台夥伴**：需要品牌脈絡、頁面文案方向、商品資訊、視覺素材與缺漏素材狀態；不需要處理自建網站或平台技術規劃。
2. **CIS / 視覺夥伴**：需要品牌故事、語氣、定位、視覺線索、商品脈絡與目前設計進度。
3. **行銷團隊**：需要商品事實、銷售重點、活動脈絡、銷售分析摘要與目前知識缺口。
4. **品牌資料維護者**：需要看見 wiki freshness、audit 狀態、資料缺口與下一步行動。

## 成功標準

- 合作夥伴能在 30 秒內理解鐵比倫目前的品牌狀態。
- 合作夥伴不需要翻 repository 資料夾，就能找到品牌、商品、定位與分析資料。
- 頁面清楚區分「已確認知識」與「缺漏 / 待確認事項」。
- 儀表板提供可複製的「問代理人」prompt，支援常見後續任務。
- 儀表板能透過 GitHub Pages 以靜態檔部署，並保留 `.nojekyll`。
- 儀表板不需要 secret、登入驗證或後端服務。

## 非目標

- 不取代未來正式的鐵比倫官網。
- 不公開私密 source 檔案或憑證。
- 不讓 GitHub Pages 上的 JavaScript 直接寫回 repository。
- 不把粗略分析包裝成正式對外行銷主張。
- 不使用浮誇術語，例如「戰略指揮中心」或沒有證據支撐的「高品質」。

## 資料來源

儀表板資料必須由已維護的本地知識檔生成：

- `knowledge/index.md`
- `knowledge/log.md`
- `knowledge/wiki/entities/*.md`
- `knowledge/wiki/concepts/*.md`
- `knowledge/wiki/analysis/*.md`
- 選定的 `knowledge/wiki/analysis/*.csv` 摘要；只有檔案足夠小且對儀表板卡片有幫助時才納入。

`knowledge/sources/` 下的原始檔仍然是 source material，不直接暴露在儀表板中。若未來需要公開原始資料摘錄，必須另有 spec 批准安全摘錄清單。

## 必要檔案

- `knowledge/specs/tiebilum_knowledge_dashboard_spec.md`：本規格。
- `tools/build_knowledge_dashboard_data.mjs`：資料匯出腳本。
- `knowledge/dashboard-data.json`：供 HTML 頁面讀取的生成資料。
- `index.html`：GitHub Pages 使用的靜態儀表板 UI。
- `knowledge/wiki/analysis/tiebilum_knowledge_dashboard_audit.md`：建置與驗證紀錄。

## 資料合約

`knowledge/dashboard-data.json` 必須包含：

```json
{
  "generatedAt": "ISO-8601 timestamp",
  "brand": {
    "name": "鐵比倫 Tiebilum",
    "stage": "string",
    "oneLine": "string",
    "positioning": "string",
    "voice": ["string"]
  },
  "progress": [
    {
      "area": "官網素材與文案 | CIS 視覺 | 行銷資料 | 品牌資料維護",
      "status": "ready | in-progress | needs-review | missing",
      "summary": "string",
      "items": ["string"]
    }
  ],
  "library": [
    {
      "id": "stable-id",
      "title": "string",
      "category": "品牌脈絡 | 視覺/CIS | 官網素材與文案 | 行銷資料 | 財務分析 | 品牌資料維護",
      "status": "confirmed | draft | needs-review | missing",
      "summary": "string",
      "path": "repository-relative path",
      "tags": ["string"],
      "updatedHint": "string"
    }
  ],
  "gaps": [
    {
      "title": "string",
      "area": "string",
      "whyItMatters": "string",
      "nextAction": "string"
    }
  ],
  "agentPrompts": [
    {
      "title": "string",
      "intent": "string",
      "prompt": "string"
    }
  ],
  "audit": {
    "latestLogEntries": ["string"],
    "warnings": ["string"]
  }
}
```

## UI 需求

### 1. 品牌現狀頁首

必須呈現：

- 品牌名稱。
- 一句話目前狀態。
- 使用者說明：供官網、CIS 與行銷協作夥伴使用。
- 最後生成時間。
- 三個精簡狀態標籤：品牌、素材/CIS、知識庫。

### 2. 協作進度地圖

呈現四條進度線：

- 官網素材與文案
- CIS 視覺
- 行銷資料
- 品牌資料維護

每條進度線顯示目前狀態、短摘要與下一步事項。它應該可掃描、可操作，而不是裝飾性區塊。

### 3. 知識資料庫

必須提供：

- 搜尋輸入框。
- 分類篩選。
- 狀態篩選。
- 由 wiki 支撐的知識卡片。
- 每張卡片顯示標題、分類、狀態、摘要、標籤與來源路徑。

UI 可以連到 repository-relative path，但靜態 GitHub Pages 不能開啟本機 filesystem path。

### 4. 資料缺口

清楚呈現缺漏或待確認項目，例如：

- 商品成本缺漏。
- 視覺素材缺漏。
- 品牌語氣待確認。
- QDM 開店平台頁面文案待核准。

### 5. 資料維護 Prompt 面板

提供常見品牌資料整理任務的可複製 prompt：

- 根據目前品牌語氣產出首頁文案方向。
- 列出 QDM 開店平台頁面仍缺哪些素材與文案。
- 摘要商品頁可用於行銷的內容。
- 將目前資料缺口整理成行動清單。
- 準備給 CIS 夥伴審閱的問題。

按鈕會複製 prompt 文字到剪貼簿，並顯示可見的 copied 狀態。

## 品牌語氣與視覺方向

- 語氣：樸實、實用、透明、有職人感。
- 避免浮誇詞彙，例如「戰略指揮中心」、沒有證據支撐的「高品質」，或通用科技行銷語。
- 視覺風格：安靜的編輯型工作頁，而不是 landing page hero。
- 使用克制的色彩、緊湊資訊層級與清楚 section label。
- 不做卡片套卡片。
- 使用穩定的 responsive 尺寸，避免篩選器、卡片與狀態標籤因內容改變而跳動。

## 可及性與響應式

- 必須支援桌面與手機。
- 在 375px 手機寬度下，文字不得重疊。
- 控制項必須有可見 label。
- 鍵盤使用者必須能 tab 到搜尋、篩選與 prompt 按鈕。
- 顏色不能是唯一的狀態提示。

## 建置規則

- 對同一組檔案內容，資料產生器的輸出必須可重現，除了 `generatedAt` 之外。
- 資料產生器應容忍 wiki 檔案缺漏，並輸出 audit warning，而不是能處理時就直接中止。
- 生成的 dashboard data 不得包含完整私密 source document。
- 頁面必須能在 GitHub Pages 上運作，不依賴額外 build service；只需提交生成好的 JSON 與 HTML。

## 驗證需求

宣稱完成前必須檢查：

1. 執行資料產生器，確認 `knowledge/dashboard-data.json` 已建立。
2. 執行本機靜態伺服器或等效的 file-serving 檢查。
3. 確認頁面能載入 `dashboard-data.json`。
4. 確認搜尋與篩選會改變可見的 library cards。
5. 確認 prompt 複製按鈕可用，或在不能複製時有可見 fallback。
6. 檢查 desktop 與 mobile layout 的 screenshot 或 browser-rendered dimensions。
7. 確認 `curl` 或本機 request 可載入 `index.html` 與 `knowledge/dashboard-data.json`。

## Audit 需求

每次儀表板建置或更新，必須在 `knowledge/wiki/analysis/tiebilum_knowledge_dashboard_audit.md` 追加紀錄，包含：

- 時間戳。
- 讀取的檔案。
- 生成的檔案。
- warning 或缺漏資料。
- 驗證命令與結果。

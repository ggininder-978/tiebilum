# Specification: AI Copy QA Workbench

## 1. 目的
建立本地互動式 HTML 工作台，讓使用者審閱、修改 AI 產出的文案，並將結果回寫至 Markdown 與 JSON 資料庫。

## 2. 資料結構 (ai_copy_qa_queue.json)
```json
{
  "generatedAt": "ISO-8601 timestamp",
  "items": [
    {
      "id": "stable-id",
      "page": "首頁 | 商品頁 | 品牌介紹",
      "slot": "主標 | 副標 | CTA | 描述",
      "aiDraft": "string",
      "source": ["path"],
      "riskTags": ["unsupported-claim | medical-risk | marketing-fluff | tone-mismatch | needs-source | approved"],
      "reviewStatus": "pending | approved | revised | rejected | needs-source",
      "humanRevision": "string",
      "reviewNote": "string",
      "updatedAt": "timestamp"
    }
  ]
}
```

## 3. 風險標籤與狀態定義
### 風險標籤 (Risk Tags)
- `unsupported-claim`: 無來源支持。
- `medical-risk`: 涉及療效或健康暗示。
- `marketing-fluff`: 語氣浮誇或空泛。
- `tone-mismatch`: 不符合職人/誠實鄰里語氣。
- `approved`: 無明顯問題。

### 審核狀態 (Review Status)
- `pending`: 尚未審閱。
- `approved`: 可直接使用。
- `revised`: 已人工修改，使用修正版。
- `needs-source`: 需補來源。

## 4. 技術架構 (Local Node.js)
### 4.1 資料生成器 (`tools/build_copy_qa_queue.mjs`)
- 讀取 Dashboard JSON 與內容檔案。
- 內建初步風險偵測（關鍵字比對）。
- 保留既有的人工修正結果。

### 4.2 本地服務 (`tools/copy_qa_server.mjs`)
- **Port**: 8787
- **GET /api/copy-qa**: 讀取 JSON。
- **POST /api/copy-qa**: 接收 payload 並更新 JSON、Markdown 與 Audit Log。

### 4.3 互動工作台 (`outputs/copy_qa_workbench.html`)
- 高資訊密度、審稿專用 UI。
- 提供頁面、狀態、風險篩選。
- 支援直接編輯 `humanRevision` 與 `reviewNote`。

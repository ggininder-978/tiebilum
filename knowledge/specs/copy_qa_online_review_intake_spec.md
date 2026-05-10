# Specification: Copy QA Online Review Intake

## 1. 目的
建立外部夥伴提交文案建議的管道，確保文案勘誤能與外部團隊協作，但不開放直接寫入權限，維持資料庫的安全性與純淨度。

## 2. 使用情境
外部夥伴（CIS、QDM、行銷團隊）在 Dashboard 看到需要修正的文案時，透過線上表單提交建議，內容包含：
- 原文位置 (Page/Slot)
- 建議修正版 (Suggested Revision)
- 修改原因 (Reason)
- 來源依據 (Evidence)
- 提交者資訊 (Name/Team)

## 3. 資料合約 (ai_copy_qa_intake_queue.json)
```json
{
  "generatedAt": "ISO-8601 timestamp",
  "items": [
    {
      "intakeId": "stable-id (hash based)",
      "submittedAt": "ISO-8601 timestamp",
      "submitterName": "string",
      "submitterTeam": "QDM | CIS | Marketing | Owner | Other",
      "targetCopyId": "string | unknown",
      "page": "首頁 | 商品頁 | 品牌介紹",
      "slot": "主標 | 副標 | CTA | 商品描述",
      "originalText": "string",
      "suggestedRevision": "string",
      "reason": "string",
      "sourceEvidence": "string",
      "riskTags": ["unsupported-claim | medical-risk | marketing-fluff | tone-mismatch | needs-source"],
      "intakeStatus": "new | needs-review | accepted | rejected | merged",
      "ownerNote": "string",
      "source": "online-form | imported-csv",
      "updatedAt": "ISO-8601 timestamp"
    }
  ]
}
```

## 4. 狀態定義
- `new`: 剛匯入，尚未審閱。
- `accepted`: 接受建議，等待合併。
- `rejected`: 不採用。
- `merged`: 已正式合併到 `ai_copy_qa_queue.json`。

## 5. 工具鏈流程
1. **線上提交**: 使用者在 `outputs/copy_qa_online_intake.html` 填寫表單。
2. **手動匯出**: 業主從表單後端（如 Google Form）匯出 CSV。
3. **AI 匯入**: 執行 `tools/import_copy_qa_intake.mjs` 將 CSV 轉入 `ai_copy_qa_intake_queue.json`。
4. **業主審核**: 業主將狀態標記為 `accepted`。
5. **正式合併**: 執行 `tools/merge_copy_qa_intake.mjs` 將所有 `accepted` 項目併入正式文案庫。

## 6. 安全限制
- 嚴禁處理 Sales Diagnosis 相關數據。
- 嚴禁存取 `sales-diagnosis-vault.json`。
- 外部輸入之 HTML 內容必須全數轉義 (Escape)。

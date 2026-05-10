# Guide: Connecting Copy QA Intake to Google Form

## 1. 建立表單
請在 Google Forms 建立以下欄位（建議全設為必填）：
1. **提交者姓名** (Short Answer)
2. **所屬團隊** (Multiple Choice/Dropdown: QDM, CIS, Marketing, Owner, Other)
3. **頁面位置** (Short Answer)
4. **文案位置** (Short Answer)
5. **原文** (Paragraph)
6. **建議修正版** (Paragraph)
7. **修改原因** (Paragraph)
8. **來源依據** (Short Answer)
9. **可能風險** (Checkboxes: medical-risk, marketing-fluff, unsupported-claim, tone-mismatch)

## 2. 獲取 entry.xxxxx ID
1. 在表單編輯頁面點擊右上方「預覽 (Preview)」。
2. 對每個輸入欄位按右鍵選擇「檢查 (Inspect)」。
3. 尋找 `<input type="hidden" name="entry.123456789">` 或 `name="entry.123456789"`。
4. 紀錄每個欄位對應的數字。

## 3. 獲取 formResponse URL
表單提交的 Endpoint 格式如下：
`https://docs.google.com/forms/d/e/[FORM_ID]/formResponse`

## 4. 欄位對應表 (待填寫)
請將以下資訊貼回給 AI，我將為您產生最終的 HTML：

- **formResponse URL**: 
- **提交者姓名 ID**: 
- **所屬團隊 ID**: 
- **頁面位置 ID**: 
- **文案位置 ID**: 
- **原文 ID**: 
- **建議修正版 ID**: 
- **修改原因 ID**: 
- **來源依據 ID**: 
- **可能風險 ID**: 

---
*完成對應後，夥伴在網頁提交表單，資料會直接進入您的 Google Sheet，我們再進行 CSV 匯入即可。*

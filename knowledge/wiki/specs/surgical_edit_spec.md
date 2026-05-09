# Surgical Edit Spec: 手術式修改規格

本規格定義了在修改已有專案時，如何保持代碼庫的純淨度與最小干擾。

## 1. 範疇限制 (Scope Control)
*   **只動必要處**：每一行修改都必須能直接追溯回使用者需求。
*   **嚴禁「順手」重構**：除非重構是完成任務的必要條件，否則禁止修改相鄰的代碼、註釋或格式。
*   **死代碼處理**：
    *   **如果是你製造的**：必須立即刪除（如：被你替換掉的函數）。
    *   **如果是原本就在的**：提報但不刪除，除非被明確要求。

## 2. 風格匹配 (Style Matching)
*   **優先順序**：專案現有風格 > 個人偏好。
*   **具體細節**：引號使用（單/雙）、變數命名法（camelCase/snake_case）、空格與縮排。
*   **一致性測試**：修改後的代碼看起來應該像是由同一位工程師所寫。

## 3. 變動最小化 (Diff Minimization)
*   避免不必要的重排。
*   避免更改現有的邏輯結構（如：將 `if-else` 改成 `switch`），除非能顯著解決 Bug。

---
*Ref: [karpathy-guidelines SKILL.md](file:///knowledge/sources/karpathy-skills/skills/karpathy-guidelines/SKILL.md)*

# Superpowers Workflow: 標準作業流程

Superpowers 定義了 AI 代理執行任務的標準生命週期，確保每一步都具備「可追蹤性」與「高品質」。

## 七步標準流程 (The 7-Step Cycle)

1.  **Brainstorming (腦力激盪)**
    *   **目標**：將模糊想法轉化為設計文件 (Specs)。
    *   **產出**：`docs/superpowers/specs/YYYY-MM-DD-design.md`。
    *   **門檻**：未經使用者批准設計，嚴禁進入下一階段。

2.  **Using Git Worktrees (環境隔離)**
    *   **目標**：建立隔離的開發分支。
    *   **做法**：確保基底測試全部通過，避免污染主分支。

3.  **Writing Plans (撰寫計畫)**
    *   **目標**：將設計拆解為「一口大小 (Bite-sized)」的任務。
    *   **要求**：每個任務應在 2-5 分鐘內可完成，且包含明確的驗證步驟。

4.  **Executing Plans (執行計畫)**
    *   **做法**：可調用子代理 (Subagents) 分工執行。每項任務後都需進行兩階段審核（規格符合度度、程式碼質量）。

5.  **Test-Driven Development (TDD)**
    *   **規則**：Red -> Green -> Refactor。
    *   **嚴格性**：如果程式碼是在測試之前寫的，該程式碼必須被刪除。

6.  **Code Review (代碼審查)**
    *   **做法**：根據計畫逐項檢查，嚴重問題（Critical）必須阻斷進度。

7.  **Finishing Branch (完成與合併)**
    *   **做法**：最終驗證所有測試，提供 Merge/PR/Discard 等選項，並清理環境。

---
*Derived from: [superpowers sources](file:///knowledge/sources/superpowers)*

# Agent Behavior Shaping: AI 行為塑造技術

本文件提取自 `superpowers`，用於定義如何透過結構化指令強制限制代理人行為。

## 1. 紅旗標誌 (Red Flags)
當 AI 產生以下心理活動時，必須立即停止 (STOP)，因為這代表正在「合理化」不規範行為：

*   「這只是個簡單的問題，不需要查技能。」
*   「我需要更多上下文，先問個問題（而不查技能）。」
*   「我記得這個技能，不用再讀一遍。」
*   「直接做這件事會比較有效率。」

## 2. 硬門檻 (Hard Gates)
在規格中設置不可逾越的檢查點：

*   **無設計不實作**：未經設計批准，禁止寫任何實作程式碼。
*   **無測試不編碼**：禁止在沒有失敗測試的情況下撰寫功能代碼。
*   **100% 遵守率**：如果技能適用，調用它是強制性的，沒有例外。

## 3. 指令優先級 (Instruction Priority)
當指令衝突時的處理順序：
1.  **使用者明確指令** (如 `AGENTS.md`, 直接要求) — 最高優先級。
2.  **專屬技能 (Skills)** — 覆蓋預設行為。
3.  **預設系統提示詞** — 最低優先級。

## 應用於 Tiebilum OS
未來在建立 `knowledge/skills/` 下的自動化腳本（如 `ingest-data`）時，應包含上述「紅旗」與「硬門檻」，確保 AI 執行數據清洗時不會因為偷懶而跳過審計步驟。

---
*Ref: [using-superpowers SKILL.md](file:///knowledge/sources/superpowers/skills/using-superpowers/SKILL.md)*

# Superpowers Philosophy: 代理人協作哲學

## 核心思維 (The Mindset)
Superpowers 不僅是工具，是一套**軟體開發方法論**，旨在解決 AI 代理常見的「過度自信」、「忽視細節」與「缺乏測試」等問題。

### 1. 蘇格拉底式引導 (Socratic Dialogue)
*   **原則**：在動手寫程式之前，必須先進行大量的釐清。
*   **做法**：AI 不應直接跳入實作，而是透過「一次一個問題」的方式，引導人類夥伴共同釐清需求與約束。

### 2. 證據勝於宣稱 (Evidence over Claims)
*   **原則**：不要相信 AI 說「我修好了」，要相信測試報告。
*   **做法**：嚴格執行 **TDD (測試驅動開發)**。在看到測試失敗（Red）之前，不准寫實作程式碼；實作後必須看到測試通過（Green）。

### 3. YAGNI (You Aren't Gonna Need It)
*   **原則**：無情地剔除不必要的功能。
*   **做法**：在設計階段就進行「自評 (Self-Review)」，找出過度設計的部分並移除。

### 4. 拒絕「AI 廢話」 (Anti-Slop)
*   **原則**：保護人類夥伴的聲譽，不提交低質量的 Pull Requests。
*   **做法**：如果問題不夠具體、沒有經過人類審閱、或是純屬猜測的修復，AI 必須拒絕提交。

## 關鍵指標
*   **94% PR 拒絕率**：這是對高標準的堅持。
*   **1% 適用律**：只要有 1% 的機會適用某個技能，AI 就必須調用它。

---
*Derived from: [superpowers sources](file:///knowledge/sources/superpowers)*

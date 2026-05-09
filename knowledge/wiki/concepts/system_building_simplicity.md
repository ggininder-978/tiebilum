# System Building Simplicity: 極簡系統構建學

本文件探討如何應用 Karpathy 的「簡潔優先」原則，避免系統開發中的熵增。

## 1. 識別過度工程 (Over-engineering)
*   **特徵 A：過早抽象**。例如：為了一個簡單的折扣計算建立整套 `Strategy Pattern`。
*   **特徵 B：推測性功能 (Speculative Features)**。例如：在沒有效能問題時就加入複雜的 `Redis` 快取層。
*   **特徵 C：隱形靈活性**。加入大量未要求的參數與配置項。

## 2. 實踐準則：今天解決今天的問題
*   **延後決策**：直到需求明確出現（如：出現第二種折扣類型）再進行重構。
*   **可讀性 > 擴展性**：在初期，易於理解的 50 行代碼遠比「具備擴展潛力」的 200 行代碼有價值。
*   **無痛重構**：只要有良好的測試覆蓋，簡單的代碼隨時可以轉化為複雜模式。

## 3. 心理測驗
當你準備寫出一段精妙的結構時，問自己：
> **「如果我要在半夜兩點修復這段代碼，我會感謝現在的自己，還是想殺了現在的自己？」**

---
*Derived from: [karpathy-skills EXAMPLES.md](file:///knowledge/sources/karpathy-skills/EXAMPLES.md)*

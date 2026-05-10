# Tiebilum OS Operation Log

## [2026-05-10] 📈 Feature | 實作 Dashboard 來源追溯 (Source Traceability)
- **Spec**: 更新 JSON contract，為知識卡片加入 `whyItMatters` 與 `nextAction`。
- **Logic**: 強化 `build_knowledge_dashboard_data.mjs`，在產生資料時注入策略意圖。
- **UI**: 將知識卡片升級為決策節點，顯示來源路徑、最後更新時間與下一步行動，使 Dashboard 成為真正的專案管理樞紐。

## [2026-05-09] Synthesis | LLM Wiki + HTML Artifacts
- **Source Review**: Reviewed user-provided X thread summary and cross-checked public references for Claude Artifacts, Karpathy's LLM Wiki pattern, LLM Wiki structure, and an MCP-backed implementation.
- **Synthesis**: Added `knowledge/wiki/concepts/llm_wiki_html_artifacts.md`.
- **Insight**: HTML Artifacts should be treated as an interactive view/control layer over the markdown wiki, not as the canonical data store. The durable loop is source -> wiki -> artifact -> agent request -> wiki update.
- **Audit**: Public X pages did not expose readable text in the browser fetch, so the user-provided excerpt was treated as the primary thread content.

## [2026-05-09] Refresh | 重新匯入桌面最新版成本結構 Excel
- **Source Refresh**: 重新匯入 `C:/Users/user/Desktop/資料分析/鐵比倫-產品成本結構試算 (1).xlsx`（檔案時間 2026-05-09 21:56），覆蓋 `knowledge/sources/` 內新版 xlsx 與三個工作表 CSV。
- **Rebuild**: 重跑 `outputs/financial_analysis_2025/build_financial_analysis.mjs`，公式錯誤掃描 0 筆，工作簿 `tiebilum_2025_financial_sales_analysis.xlsx` 已更新。
- **Result**: 2025 營收維持 NT$1,523,247，商品貢獻淨利維持 NT$233,288，商品排名未變。
- **Remaining Gaps**: 黑糖蜜 1890ml、梅精黑糖 1890ml 仍缺批價與產品成本；雜支與設備攤提年度金額仍空白；黑糖檸檬 150ml 仍為負淨利。

## [2026-05-09] Ingest | 補入新版成本結構 Excel
- **Source**: 匯入 `knowledge/sources/鐵比倫-產品成本結構試算 (1).xlsx`，並匯出三個工作表 CSV 作為新版分析來源。
- **Improvement**: 新檔含公式快取值，黑糖蜜、黑糖檸檬等蜜類成本與淨利改用小數精度；黑糖薑母茶保留 `40台斤(一箱)` 作為規格基準，不再標示 missing spec。
- **Still Missing**: 1890ml 黑糖蜜、1890ml 梅精黑糖仍缺批價與產品成本；年度營業成本的雜支、設備攤提仍未確認。
- **Rebuild**: 重跑 `outputs/financial_analysis_2025/build_financial_analysis.mjs`，2025 營收維持 NT$1,523,247，商品貢獻淨利更新為 NT$233,288。

## [2026-05-09] Analysis | 2025 商品銷售與財務資料更新
- **Spec**: 新增 `knowledge/specs/2025_financial_sales_analysis_spec.md`，明確規範競品區排除、營收/淨利補算、成本缺漏與 audit 欄位。
- **Cleaning**: 重新從 `knowledge/sources/` 三份原始 CSV 清洗；排除 `競品` 區烤肉組參考列，保留 25 筆 2025 銷售列。
- **Outputs**: 更新 `2025_sales_sku_master.csv`、`2025_product_sales_ranking.csv`、`2025_channel_financials.csv`、`2025_sales_cleaning_audit.csv`，並重建 `outputs/financial_analysis_2025/tiebilum_2025_financial_sales_analysis.xlsx`。
- **Insights**: 2025 營收 NT$1,523,247，商品貢獻淨利 NT$233,287，貢獻淨利率 15.3%；薑汁黑糖為營收與淨利雙冠，黑糖薑母茶為高營收低淨利品項。
- **Audit Notes**: 1 筆負淨利列（黑糖檸檬），2 筆成本缺漏列（1890ml 蜜類），年度營業成本 NT$1,553,948 可能與商品表內單位營業費用重疊，需業主確認正式淨利口徑。

## [2026-05-09] 🧬 Skill | 建立 HTML Effectiveness 技能
- **Extraction**: 提取 `thariqs.github.io/html-effectiveness/` 核心知識點。
- **Synthesis**: 建立 `skills/html-effectiveness/SKILL.md`，定義空間資訊化、互動式探索與閉環編輯器三大準則。
- **Outcome**: 強化 Tiebilum OS 與人類的溝通密度，確保複雜決策能透過高品質 HTML 介面呈現。

## [2026-05-09] 🧹 Archive | 封存產品提案相關資料與技能
- **Archive**: 將 `content/proposals/` 與 `skills/tiebilum-product-dev/` 移至 `archive/20260509_product_proposals/`。
- **Cleanup**: 更新 `README.md` 移除失效索引。
- **Status**: 目錄結構簡化，聚焦於核心零售品牌轉型。

## [2026-05-05] 🧘 Synthesis | 提取 Karpathy 宗師思維
- **Ingest**: Clone `https://github.com/forrestchang/andrej-karpathy-skills.git` 至 `sources/`。
- **Synthesis**: 完成 4 篇 Wiki 頁面，涵蓋開發原則、極簡系統論、手術式修改規格與驗證流程。
- **Outcome**: 強化了 Tiebilum OS 的「抗熵增」能力，現在大腦已知曉如何在已有程式碼中進行最小化干擾的精準作業。

## [2026-05-05] 🏺 Synthesis | 品牌靈魂與風土知識提取
- **Analysis**: 整合「產品護城河」、「市場受眾」與「埔里甘蔗史」三份原始素材。
- **Synthesis**: 
    - 擴充 [[brand_tiebilum]] 實體。
    - 建立 [[brand_history]] (澳洲 Badila 品種史)。
    - 建立 [[market_positioning]] (誠實挑戰者與 Persona 模型)。
- **Outcome**: 完成品牌文化層的知識建檔，為後續的行銷文案（Brand Voice）提供邏輯支撐。

## [2026-05-05] 🧬 Synthesis | 提取 Superpowers 協議
- **Ingest**: Clone `https://github.com/obra/superpowers.git` 至 `sources/`。
- **Synthesis**: 完成 4 篇 Wiki 頁面，涵蓋哲學、工作流、技能索引與行為塑造技術。
- **Outcome**: 提升了 Tiebilum OS 的元認知能力，現在大腦已知曉如何透過「硬門檻」與「紅旗」來強化執行質量。

## [2026-05-05] 🧠 Brain Refactor | 初始化 Tiebilum OS
- **Reorganization**: 重構 `knowledge/` 目錄，區分 `sources/`, `wiki/`, `specs/`。
- **Protocol**: 建立 `AGENTS.md` 作為元協議。
- **Indexing**: 建立 `index.md` 知識索引。
- **Status**: 基礎架構已完工，進入知識合成階段。

## [2026-05-04] 🧹 Ingest | 2025 銷售數據清洗
- **Source**: `2025 營收銷量(原始檔案).csv`
- **Output**: 產出 `2025_sales_sku_master.csv` 與 `2025_sales_cleaning_audit.csv`。
- **Insights**: 發現黑糖薑母茶 (OEM) 淨利過低，黑糖檸檬存在負毛利風險。

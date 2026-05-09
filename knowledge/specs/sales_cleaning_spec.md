# 09 銷售資料欄位映射與清洗規則

> 目的：保留原始 CSV 作為來源憑證，另以規則建立可重複執行的 SKU 層級清洗流程。
> 適用資料：`2025 營收銷量(原始檔案).csv`、`單品成本結構(原始檔案).csv`、`營業成本(原始檔案).csv`
> 建立日期：2026-05-04

---

## 1. 清洗原則

1. **原始資料不覆寫**：原始 CSV 只讀取、不修改。所有修正、拆欄、補算都寫入清洗後資料表。
2. **SKU 優先於品名加總**：凡同品名存在不同規格、通路、批價或成本，先以 SKU 層級分析，再做產品族群 rollup。
3. **reported 與 calculated 分開**：原始表已填值保留為 `reported_*`，補算值另存 `calculated_*`，並用 `*_source` 標記來源。
4. **空白、0、待確認不同義**：空白代表未填；`0` 代表原表明確為 0；`待確認` 代表已知缺口，不可當作 0。
5. **精準淨利優先用公式**：若可取得 `商品毛利`、`營業費用`、`發票5%`，精準單件淨利以 `商品毛利 - 營業費用 - 發票5%` 計算；原始 `淨利` 欄位只作顯示/對照。

---

## 2. 清洗後主表欄位

| 欄位 | 說明 | 來源/規則 |
| :--- | :--- | :--- |
| `source_file` | 原始檔名 | 匯入時填入 |
| `source_row` | 原始列號 | 匯入時填入 |
| `raw_route` | 原始通路/規格文字 | `客戶/通路` 或 `通路/規格` |
| `raw_moq` | 原始 MOQ/合作方式文字 | `合作方式/MOQ` 或 `MOQ` |
| `channel_type` | 通路類型 | 依 mapping rules 判定 |
| `channel_name` | 通路/客戶名稱 | 依 mapping rules 判定 |
| `customer_name` | 客戶名稱 | 原始字串含 `客戶：` 時擷取 |
| `product_name_raw` | 原始品名 | `品名` |
| `product_name_std` | 標準品名 | 移除空白、同義字標準化 |
| `package_type` | 包裝/型態 | 例如手切夾鏈袋、單顆包、蜜類瓶裝、薑母茶 |
| `spec_name` | 標準規格名稱 | 例如 `手切夾鏈袋 380g`、`手切 600g/台斤` |
| `unit_quantity` | 規格數值 | 例如 380、600、350 |
| `unit` | 規格單位 | `g`、`ml` |
| `sales_unit` | 銷售單位 | 例如包、台斤、瓶、盒 |
| `moq_std` | 標準 MOQ | 從 MOQ 欄整理 |
| `quantity_2025` | 2025 銷量 | `2025訂購數量` |
| `wholesale_price` | 批價 | `批價` |
| `product_cogs` | 產品成本 | `產品成本` |
| `gross_profit_per_unit` | 單件商品毛利 | `商品毛利` |
| `gross_margin` | 商品毛利率 | `商品毛利率` |
| `operating_expense_per_unit` | 單件營業費用 | `營業費用` |
| `invoice_tax_per_unit` | 單件發票成本 | `發票5%` |
| `expense_subtotal_per_unit` | 單件費用小計 | `費用小計` |
| `reported_net_profit_per_unit` | 原始單件淨利 | `淨利` |
| `calculated_net_profit_per_unit` | 精準單件淨利 | `商品毛利 - 營業費用 - 發票5%` |
| `net_profit_per_unit` | 採用單件淨利 | 優先使用精準公式，缺欄時退回 reported |
| `reported_contribution_profit` | 原始商品貢獻淨利 | `商品貢獻淨利` |
| `calculated_contribution_profit` | 補算商品貢獻淨利 | `quantity_2025 * net_profit_per_unit` |
| `contribution_profit` | 採用商品貢獻淨利 | 已填 reported 時保留；reported 空白時補算 |
| `reported_revenue` | 原始營業額 | `營業額` |
| `calculated_revenue` | 補算營業額 | `quantity_2025 * wholesale_price` |
| `revenue` | 採用營業額 | 已填 reported 時保留；reported 空白時補算 |
| `revenue_source` | 營收來源 | `reported` / `calculated` / `missing` |
| `profit_source` | 淨利來源 | `reported` / `calculated` / `missing` |
| `analysis_sku` | 分析用 SKU 鍵 | `product + channel + spec + price + cost` |
| `quality_flags` | 資料品質註記 | 多值字串 |

---

## 3. 通路與規格解析規則

| 原始型態 | 解析方式 |
| :--- | :--- |
| `批發-台糖\n(手切夾鏈袋380g)` | `channel_type=批發`、`channel_name=台糖`、`package_type=手切夾鏈袋`、`unit_quantity=380`、`unit=g` |
| `批發-農會\n(手切夾鏈袋380g)` | `channel_type=批發`、`channel_name=農會`、`package_type=手切夾鏈袋`、`unit_quantity=380`、`unit=g` |
| `貼牌客戶-埔里農會\n(手切夾鏈袋380g)` | `channel_type=貼牌`、`channel_name=埔里農會`、`package_type=手切夾鏈袋`、`unit_quantity=380`、`unit=g` |
| `手切(每台斤)` | `channel_type=批發/未分類`、`package_type=手切`、`unit_quantity=600`、`unit=g`、`sales_unit=台斤` |
| `單顆包(每台斤）` | `channel_type=批發/未分類`、`package_type=單顆包`、`unit_quantity=600`、`unit=g`、`sales_unit=台斤` |
| `蜜類-350ml` | `package_type=蜜類瓶裝`、`unit_quantity=350`、`unit=ml`、`sales_unit=瓶` |
| `蜜類-150ml` | `package_type=蜜類瓶裝`、`unit_quantity=150`、`unit=ml`、`sales_unit=瓶` |
| `蜜類-1890ml` | `package_type=蜜類瓶裝`、`unit_quantity=1890`、`unit=ml`、`sales_unit=瓶` |
| `科技中藥廠` + `黑糖薑母茶` | `channel_type=OEM`、`package_type=薑母茶`、規格待確認 |
| `日月町禮盒組` | `channel_type=通路上架`、`package_type=禮盒`、`sales_unit=組` |

---

## 4. 補算與口徑規則

### 營業額

採用值：

```text
revenue =
  reported_revenue if reported_revenue is not blank
  else quantity_2025 * wholesale_price
```

例：`黑糖薑母茶` 原始營業額空白，但有 `2360 × 112`，因此 `revenue=264,320` 且 `revenue_source=calculated`。

### 商品貢獻淨利

單件淨利：

```text
calculated_net_profit_per_unit =
  gross_profit_per_unit - operating_expense_per_unit - invoice_tax_per_unit
```

採用值：

```text
contribution_profit =
  reported_contribution_profit if reported_contribution_profit is not blank
  else quantity_2025 * calculated_net_profit_per_unit
```

例：`黑糖薑母茶` 原始商品貢獻淨利空白，應使用精準公式：

```text
66 - 58.01405867 - 5.6 = 2.38594133
2.38594133 × 2360 = 5,630.82
```

---

## 5. 品質旗標

| Flag | 觸發條件 | 意義 |
| :--- | :--- | :--- |
| `calculated_revenue` | 原始營業額空白但可補算 | 營收為推算值 |
| `calculated_profit` | 原始商品貢獻淨利空白但可補算 | 貢獻淨利為推算值 |
| `missing_price` | 批價空白 | 不可補算營業額 |
| `missing_cost` | 產品成本空白 | 成本分析不完整 |
| `missing_spec` | 無法解析重量/容量 | 不可做 100g/ml 標準化 |
| `mixed_product_rollup` | 同產品跨多 SKU/規格 | 產品總銷量不可當單一規格解讀 |
| `negative_profit` | 單件或總貢獻淨利小於 0 | 需檢查定價/成本 |
| `zero_reported_revenue` | 原始營業額為 0 但有銷量 | 需確認是未填、贈品、或不計營收 |

---

## 6. 下一步清洗順序

1. 建立 `cleaned_sales_sku_master.csv`，每列是一個可分析 SKU。
2. 建立 `cleaning_audit.csv`，列出每一列使用了哪些補算與品質旗標。
3. 更新 Excel builder，改由 `cleaned_sales_sku_master.csv` 產生 Dashboard。
4. 對 Dashboard KPI 加上口徑註記：reported、calculated、mixed-spec rollup。

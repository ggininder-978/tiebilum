# 2025 Financial Sales Analysis Spec

> Last updated: 2026-05-09

## Purpose

This spec defines the cleaning and analysis rules for Tiebilum 2025 product sales ranking, cost structure, and net profit reporting.

## Source Files

- `knowledge/sources/鐵比倫-產品成本結構試算.xlsx - 2025 營收銷量(原始檔案).csv`
- `knowledge/sources/鐵比倫-產品成本結構試算.xlsx - 單品成本結構(原始檔案).csv`
- `knowledge/sources/鐵比倫-產品成本結構試算.xlsx - 營業成本(原始檔案).csv`
- `knowledge/sources/鐵比倫-產品成本結構試算 (1).xlsx`
- `knowledge/sources/鐵比倫-產品成本結構試算 (1).xlsx - 2025 營收銷量(客戶填寫).csv`
- `knowledge/sources/鐵比倫-產品成本結構試算 (1).xlsx - 單品成本結構(客戶填寫).csv`
- `knowledge/sources/鐵比倫-產品成本結構試算 (1).xlsx - 營業成本項目.csv`

## Cleaning Rules

1. The sales table header row is the row containing `客戶/通路`, `品名`, and `2025訂購數量`.
2. Rows after the row whose `合作方式/MOQ` equals `競品` are competitor reference rows and must be excluded from Tiebilum sales totals.
3. Channel/spec fields are inherited downward from the most recent non-empty `客戶/通路` row.
4. Rows with a product name and positive `2025訂購數量` are sales rows.
5. Category subtotal rows with no product name are retained only for reconciliation/audit, not SKU ranking.
6. Blank or non-numeric price/cost/profit values are treated as missing, not zero, unless the source explicitly reports `0`.
7. `營業額` uses the reported source value when present and non-blank; otherwise it is calculated as `2025訂購數量 * 批價`.
8. Unit-level calculated net profit is `商品毛利 - 營業費用 - 發票5%`.
9. `商品貢獻淨利` uses the reported source value when present and non-zero; otherwise it is calculated as `2025訂購數量 * calculated_net_profit_per_unit`.
10. Product rankings exclude competitor rows but include sales rows with missing costs; missing-cost rows must be flagged.
11. If a route has no gram/ml package size but its MOQ contains a business-relevant unit such as `台斤` or `箱`, preserve that text as `unit_basis` rather than flagging the row as missing spec.

## Financial Definitions

- `revenue`: recognized 2025 sales amount from source or calculated quantity times wholesale price.
- `product_cogs_total`: product cost per unit times quantity, where product cost is available.
- `gross_profit_total`: unit gross profit times quantity, where available.
- `expense_subtotal_total`: source per-unit expense subtotal times quantity, where available.
- `contribution_profit`: product-level net profit contribution after product COGS, source per-unit operating expense allocation, and invoice tax.
- `confirmed_annual_operating_cost`: numeric annual operating cost rows in the operating-cost source table, excluding blank item rows and source total rows.
- `management_net_after_confirmed_annual_cost`: `contribution_profit - confirmed_annual_operating_cost`. This is a management view and may double count if source per-unit operating expense already allocates the same annual cost pool.

## Required Outputs

- Corrected clean sales master: `knowledge/wiki/analysis/2025_sales_sku_master.csv`
- Product ranking: `knowledge/wiki/analysis/2025_product_sales_ranking.csv`
- Channel financial summary: `knowledge/wiki/analysis/2025_channel_financials.csv`
- Audit log: `knowledge/wiki/analysis/2025_sales_cleaning_audit.csv`
- Wiki analysis note: `knowledge/wiki/analysis/2025_financial_sales_analysis.md`
- Excel workbook: `outputs/financial_analysis_2025/tiebilum_2025_financial_sales_analysis.xlsx`

## Audit Requirements

The audit output must include:

- Source row and action for every included sales row.
- Explicit exclusion record for the competitor section.
- Quality flags for missing price, missing cost, missing spec, calculated revenue, calculated profit, zero revenue, and negative profit.
- Reconciliation against source subtotal rows when subtotal rows exist.

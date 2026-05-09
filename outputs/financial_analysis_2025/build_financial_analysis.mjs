import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const knowledgeDir = path.join(repoRoot, "knowledge");
const outputPath = path.join(__dirname, "tiebilum_2025_financial_sales_analysis.xlsx");

const files = {
  sales: path.join(knowledgeDir, "cleaned_sales_sku_master.csv"),
  productCosts: path.join(knowledgeDir, "鐵比倫-產品成本結構試算.xlsx - 單品成本結構(原始檔案).csv"),
  operatingCosts: path.join(knowledgeDir, "鐵比倫-產品成本結構試算.xlsx - 營業成本(原始檔案).csv"),
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((value) => value.replace(/^\uFEFF/, "").trim()));
}

async function readCsv(file) {
  const text = await fs.readFile(file, "utf8");
  return parseCsv(text);
}

function toNumber(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replace(/,/g, "").replace(/%/g, "").trim();
  if (cleaned === "" || cleaned.toLowerCase() === "n/a" || cleaned === "待確認") return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function toPercent(value) {
  const num = toNumber(value);
  if (num === null) return null;
  return String(value).includes("%") || num > 1 ? num / 100 : num;
}

function splitChannel(raw) {
  const clean = (raw || "").replace(/\r?\n/g, " / ").replace(/\s+/g, " ").trim();
  if (!clean) return { channel: "", spec: "", customer: "" };
  const customerMatch = clean.match(/客戶：(.+)$/);
  const customer = customerMatch ? customerMatch[1].trim() : "";
  const withoutCustomer = clean.replace(/\s*\/\s*客戶：.+$/, "").trim();
  const parts = withoutCustomer.split(/\s*\/\s*/).filter(Boolean);
  const singlePartLooksLikeSpec =
    parts.length === 1 && /(g|ml|台斤|手切|單顆包|蜜類|禮盒|罐裝)/i.test(parts[0]);
  return {
    channel: parts[0] || withoutCustomer,
    spec: singlePartLooksLikeSpec ? parts[0] : parts.slice(1).join(" / "),
    customer,
  };
}

function inferUnitBasis(row) {
  const text = `${row.spec || ""} ${row.channel || ""}`.replace(/\s+/g, " ");
  const gramMatch = text.match(/(\d+(?:\.\d+)?)\s*g/i);
  if (gramMatch) {
    return {
      unitBasis: `${Number(gramMatch[1])}g`,
      normalizedUnitQty: Number(gramMatch[1]),
      normalizedUnitType: "g",
      comparabilityNote: "可用每100g營收/獲利比較",
    };
  }

  const mlMatch = text.match(/(\d+(?:\.\d+)?)\s*ml/i);
  if (mlMatch) {
    return {
      unitBasis: `${Number(mlMatch[1])}ml`,
      normalizedUnitQty: Number(mlMatch[1]),
      normalizedUnitType: "ml",
      comparabilityNote: "液態品項，建議同 ml 規格內比較",
    };
  }

  if (text.includes("台斤")) {
    return {
      unitBasis: "600g/台斤",
      normalizedUnitQty: 600,
      normalizedUnitType: "g",
      comparabilityNote: "以一台斤600g標準化",
    };
  }

  return {
    unitBasis: "未標示",
    normalizedUnitQty: null,
    normalizedUnitType: "",
    comparabilityNote: "原始資料未標示重量/容量，僅能用件數比較",
  };
}

function getHeaderMap(row) {
  return Object.fromEntries(row.map((header, index) => [header, index]));
}

function cleanSales(rows) {
  const [header, ...data] = rows;
  const h = getHeaderMap(header);

  let inCompetitorSection = false;
  const cleaned = data.map((row) => {
    if ((row[h["raw_moq"]] || "").trim() === "競品") {
      inCompetitorSection = true;
    }
    if (inCompetitorSection) return null;

    if (!(row[h["product_name_raw"]] || "").trim()) return null;

    const qty = toNumber(row[h["quantity_2025"]]);
    if (qty === null || qty <= 0) return null;
    const wholesalePrice = toNumber(row[h["wholesale_price"]]);
    const netProfitPerUnit = toNumber(row[h["net_profit_per_unit"]]);
    const revenue = toNumber(row[h["revenue"]]);
    const totalNetProfit = toNumber(row[h["contribution_profit"]]);

    const baseRow = {
      sourceRow: toNumber(row[h["source_row"]]),
      channel: row[h["channel_name"]] || "未分類",
      spec: row[h["package_type"]] || "未標示規格",
      customer: "", // 暫不從原始字串解析
      moq: row[h["raw_moq"]],
      product: row[h["product_name_raw"]],
      quantity: qty,
      wholesalePrice,
      productCost: toNumber(row[h["product_cogs"]]),
      grossProfit: toNumber(row[h["gross_profit_per_unit"]]),
      grossMargin: toNumber(row[h["gross_margin"]]),
      operatingExpense: toNumber(row[h["operating_expense_per_unit"]]),
      invoiceTax: toNumber(row[h["invoice_tax_per_unit"]]),
      expenseSubtotal: toNumber(row[h["expense_subtotal_per_unit"]]),
      netProfitPerUnit,
      netMargin: wholesalePrice ? netProfitPerUnit / wholesalePrice : 0,
      reportedContribution: toNumber(row[h["reported_contribution_profit"]]),
      reportedRevenue: toNumber(row[h["reported_revenue"]]),
      totalNetProfit,
      revenue,
      unitBasis: `${row[h["unit_quantity"]] || ""}${row[h["unit"]] || ""}`,
      normalizedUnitQty: toNumber(row[h["unit_quantity"]]),
      normalizedUnitType: row[h["unit"]],
      comparabilityNote: row[h["quality_flags"]],
      analysisSku: row[h["analysis_sku"]],
    };
    return baseRow;
  }).filter(Boolean);

  return {
    rows: cleaned,
    sourceRevenueTotal: cleaned.reduce((sum, r) => sum + (r.revenue || 0), 0),
    sourceContributionTotal: cleaned.reduce((sum, r) => sum + (r.totalNetProfit || 0), 0),
    sourceMargin: null,
  };
}

function cleanProductCosts(rows) {
  const headerIndex = rows.findIndex((row) => row.includes("通路/規格") && row.includes("淨利率"));
  const h = getHeaderMap(rows[headerIndex]);
  let currentChannel = splitChannel("");
  let currentMoq = "";
  const cleaned = [];

  for (let sourceRow = headerIndex + 1; sourceRow < rows.length; sourceRow += 1) {
    const row = rows[sourceRow];
    if ((row[h["通路/規格"]] || "").trim()) {
      currentChannel = splitChannel(row[h["通路/規格"]]);
      currentMoq = (row[h["MOQ"]] || "").replace(/\r?\n/g, " / ").trim();
    }

    const product = (row[h["品名"]] || "").trim();
    if (!product) continue;

    const wholesalePrice = toNumber(row[h["批價"]]);
    const productCost = toNumber(row[h["產品成本"]]);
    if (wholesalePrice === null && productCost === null) continue;

    cleaned.push({
      sourceRow: sourceRow + 1,
      channel: currentChannel.channel,
      spec: currentChannel.spec,
      customer: currentChannel.customer,
      moq: currentMoq,
      product,
      retailPrice: toNumber(row[h["售價"]]),
      wholesalePrice,
      discount: toPercent(row[h["基本折數"]]),
      productCost,
      grossProfit: toNumber(row[h["商品毛利"]]),
      grossMargin: toPercent(row[h["商品毛利率"]]),
      shipping: toNumber(row[h["運費負擔"]]),
      operatingExpense: toNumber(row[h["營業費用"]]),
      marketingExpense: toNumber(row[h["行銷費用"]]),
      paymentFee: toNumber(row[h["金流費用"]]),
      invoiceTax: toNumber(row[h["發票5%"]]),
      expenseSubtotal: toNumber(row[h["費用小計"]]),
      netProfitPerUnit: toNumber(row[h["淨利"]]),
      netMargin: toPercent(row[h["淨利率"]]),
    });
  }

  return cleaned;
}

function cleanOperatingCosts(rows) {
  const [header, ...body] = rows;
  return body
    .filter((row) => row.some((value) => value.trim() !== ""))
    .map((row, index) => {
      const amount = toNumber(row[1]);
      const rawAmount = (row[1] || "").trim();
      return {
        sourceRow: index + 2,
        item: row[0] || "",
        annualCost: amount,
        rawAmount,
        content: row[2] || "",
        note: row[3] || "",
        status: amount !== null ? "Confirmed" : rawAmount ? "Pending" : "Blank",
      };
    })
    .filter((row) => row.item);
}

function aggregateBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) {
      map.set(key, {
        key,
        units: 0,
        revenue: 0,
        productCostTotal: 0,
        grossProfitTotal: 0,
        operatingExpenseTotal: 0,
        contributionProfit: 0,
      });
    }
    const item = map.get(key);
    item.units += row.quantity || 0;
    item.revenue += row.revenue || 0;
    item.productCostTotal += (row.productCost || 0) * (row.quantity || 0);
    item.grossProfitTotal += (row.grossProfit || 0) * (row.quantity || 0);
    item.operatingExpenseTotal += (row.expenseSubtotal || 0) * (row.quantity || 0);
    item.contributionProfit += row.totalNetProfit || 0;
  }
  return [...map.values()]
    .map((row) => ({
      ...row,
      averagePrice: row.units ? row.revenue / row.units : 0,
      grossMargin: row.revenue ? row.grossProfitTotal / row.revenue : 0,
      netMargin: row.revenue ? row.contributionProfit / row.revenue : 0,
    }))
    .sort((a, b) => b.contributionProfit - a.contributionProfit);
}

function aggregateSku(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = row.analysisSku;
    if (!map.has(key)) {
      map.set(key, {
        key,
        product: row.product,
        channel: row.channel,
        spec: row.spec || "未標示規格",
        unitBasis: row.unitBasis,
        normalizedUnitQty: row.normalizedUnitQty,
        normalizedUnitType: row.normalizedUnitType,
        comparabilityNote: row.comparabilityNote,
        wholesalePrice: row.wholesalePrice,
        productCost: row.productCost,
        units: 0,
        revenue: 0,
        productCostTotal: 0,
        grossProfitTotal: 0,
        operatingExpenseTotal: 0,
        contributionProfit: 0,
      });
    }
    const item = map.get(key);
    item.units += row.quantity || 0;
    item.revenue += row.revenue || 0;
    item.productCostTotal += (row.productCost || 0) * (row.quantity || 0);
    item.grossProfitTotal += (row.grossProfit || 0) * (row.quantity || 0);
    item.operatingExpenseTotal += (row.expenseSubtotal || 0) * (row.quantity || 0);
    item.contributionProfit += row.totalNetProfit || 0;
  }

  return [...map.values()]
    .map((row) => {
      const averagePrice = row.units ? row.revenue / row.units : 0;
      const averageCost = row.units ? row.productCostTotal / row.units : 0;
      const netProfitPerUnit = row.units ? row.contributionProfit / row.units : 0;
      return {
        ...row,
        averagePrice,
        averageCost,
        netProfitPerUnit,
        grossMargin: row.revenue ? row.grossProfitTotal / row.revenue : 0,
        netMargin: row.revenue ? row.contributionProfit / row.revenue : 0,
        revenuePer100: row.normalizedUnitQty ? (averagePrice / row.normalizedUnitQty) * 100 : null,
        contributionPer100: row.normalizedUnitQty ? (netProfitPerUnit / row.normalizedUnitQty) * 100 : null,
      };
    })
    .sort((a, b) => b.contributionProfit - a.contributionProfit);
}

function aggregateProductRollup(rows) {
  const base = aggregateBy(rows, (row) => row.product);
  return base.map((summary) => {
    const productRows = rows.filter((row) => row.product === summary.key);
    const specs = new Set(productRows.map((row) => row.spec || "未標示規格"));
    const skuKeys = new Set(productRows.map((row) => row.analysisSku));
    const unitTypes = new Set(productRows.map((row) => row.normalizedUnitType || "unknown"));
    return {
      ...summary,
      skuCount: skuKeys.size,
      specCount: specs.size,
      unitTypeCount: unitTypes.size,
      comparabilityFlag: specs.size > 1 || unitTypes.size > 1 ? "Mixed specs - review SKU sheet" : "Single comparable spec",
      interpretation: specs.size > 1
        ? "產品族群銷量，不代表單一規格銷量"
        : "可作為單一規格銷量解讀",
    };
  });
}

function classify(row) {
  if (row.contributionProfit < 0 || row.netMargin < 0) return "Loss risk";
  if (row.units >= 1000 && row.netMargin < 0.05) return "Traffic, low profit";
  if (row.contributionProfit >= 30000) return "Core profit driver";
  if (row.netMargin >= 0.2) return "High-margin niche";
  return "Stable contributor";
}

function aoaWrite(sheet, start, rows) {
  if (rows.length === 0) return;
  const range = sheet.getRange(start).getResizedRange(rows.length - 1, rows[0].length - 1);
  range.values = rows;
}

function formulaWrite(sheet, start, rows) {
  if (rows.length === 0) return;
  const range = sheet.getRange(start).getResizedRange(rows.length - 1, rows[0].length - 1);
  range.formulas = rows;
}

function colName(index) {
  let n = index;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m) / 26);
  }
  return s;
}

function styleTable(sheet, rowCount, colCount, options = {}) {
  const lastCol = colName(colCount);
  sheet.getRange(`A1:${lastCol}1`).format.fill.color = options.headerFill || "#12312B";
  sheet.getRange(`A1:${lastCol}1`).format.font.color = "#FFFFFF";
  sheet.getRange(`A1:${lastCol}1`).format.font.bold = true;
  sheet.getRange(`A1:${lastCol}${rowCount}`).format.wrapText = true;
  sheet.getRange(`A1:${lastCol}${rowCount}`).format.verticalAlignment = "Top";
  sheet.freezePanes.freezeRows(1);
  sheet.showGridLines = false;
}

function setWidths(sheet, widths) {
  widths.forEach((width, index) => {
    sheet.getRange(`${colName(index + 1)}:${colName(index + 1)}`).format.columnWidthPx = width;
  });
}

function addRawSheet(workbook, name, rows) {
  const sheet = workbook.worksheets.add(name);
  const maxCols = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => [...row, ...Array(maxCols - row.length).fill("")]);
  aoaWrite(sheet, "A1", normalized);
  styleTable(sheet, normalized.length, maxCols, { headerFill: "#3F4A3C" });
  setWidths(sheet, Array.from({ length: maxCols }, (_, index) => (index < 3 ? 190 : 110)));
  return sheet;
}

const [salesRaw, productCostRaw, operatingCostRaw] = await Promise.all([
  readCsv(files.sales),
  readCsv(files.productCosts),
  readCsv(files.operatingCosts),
]);

const sales = cleanSales(salesRaw);
const productCosts = cleanProductCosts(productCostRaw);
const operatingCosts = cleanOperatingCosts(operatingCostRaw);
const skuSummary = aggregateSku(sales.rows);
const productSummary = aggregateProductRollup(sales.rows);
const channelSummary = aggregateBy(sales.rows, (row) => row.channel);
const confirmedOperatingCost = operatingCosts.reduce((sum, row) => sum + (row.annualCost || 0), 0);
const totalRevenue = sales.rows.reduce((sum, row) => sum + (row.revenue || 0), 0);
const totalContribution = sales.rows.reduce((sum, row) => sum + (row.totalNetProfit || 0), 0);
const brandOperatingIncome = totalContribution - confirmedOperatingCost;

const workbook = Workbook.create();
workbook.setColorScheme?.("light");

const dashboard = workbook.worksheets.add("Dashboard");
dashboard.showGridLines = false;
dashboard.getRange("A1").values = [["鐵比倫 2025 財務與銷售分析"]];
dashboard.getRange("A1:N1").merge();
dashboard.getRange("A1:N1").format.font.size = 20;
dashboard.getRange("A1:N1").format.font.bold = true;
dashboard.getRange("A1:N1").format.fill.color = "#12312B";
dashboard.getRange("A1:N1").format.font.color = "#FFFFFF";
dashboard.getRange("A2").values = [[`資料來源：三份原始 CSV；產出時間：${new Date().toISOString().slice(0, 10)}`]];
dashboard.getRange("A2:N2").merge();
dashboard.getRange("A2:N2").format.fill.color = "#E8EFE7";

const kpiRows = [
  ["年度營業額", totalRevenue, "商品貢獻淨利", totalContribution],
  ["已確認年度營業成本", confirmedOperatingCost, "品牌營業損益(貢獻淨利-固定成本)", brandOperatingIncome],
  ["商品貢獻淨利率", totalRevenue ? totalContribution / totalRevenue : 0, "固定成本覆蓋率", totalContribution ? confirmedOperatingCost / totalContribution : 0],
];
aoaWrite(dashboard, "A4", kpiRows);
dashboard.getRange("A4:D6").format.fill.color = "#F6F3EA";
dashboard.getRange("A4:D6").format.font.bold = true;
dashboard.getRange("B4:B5").format.numberFormat = '"NT$"#,##0;[Red]("NT$"#,##0);-';
dashboard.getRange("D4:D5").format.numberFormat = '"NT$"#,##0;[Red]("NT$"#,##0);-';
dashboard.getRange("B6:D6").format.numberFormat = "0.0%;[Red](0.0%);-";

const topSkus = skuSummary.slice(0, 8).map((row) => [
  row.product,
  row.channel,
  row.spec,
  row.units,
  row.revenue,
  row.contributionProfit,
  row.netMargin,
  classify(row),
]);
aoaWrite(dashboard, "A9", [["產品", "通路", "規格", "銷量", "營業額", "貢獻淨利", "淨利率", "診斷"], ...topSkus]);
dashboard.getRange("A9:H9").format.fill.color = "#12312B";
dashboard.getRange("A9:H9").format.font.color = "#FFFFFF";
dashboard.getRange("A9:H9").format.font.bold = true;
dashboard.getRange("E10:F17").format.numberFormat = '"NT$"#,##0;[Red]("NT$"#,##0);-';
dashboard.getRange("G10:G17").format.numberFormat = "0.0%;[Red](0.0%);-";

const alerts = skuSummary
  .filter((row) => row.contributionProfit < 0 || (row.units >= 1000 && row.netMargin < 0.05))
  .map((row) => [row.product, row.spec, classify(row), row.units, row.contributionProfit, row.netMargin]);
aoaWrite(dashboard, "I9", [["警示SKU", "規格", "類型", "銷量", "貢獻淨利", "淨利率"], ...alerts]);
dashboard.getRange("I9:N9").format.fill.color = "#7A2E1F";
dashboard.getRange("I9:N9").format.font.color = "#FFFFFF";
dashboard.getRange("I9:N9").format.font.bold = true;
dashboard.getRange("M10:M20").format.numberFormat = '"NT$"#,##0;[Red]("NT$"#,##0);-';
dashboard.getRange("N10:N20").format.numberFormat = "0.0%;[Red](0.0%);-";

dashboard.charts.add("bar", {
  title: "SKU/規格貢獻淨利排行",
  categories: topSkus.map((row) => `${row[0]} ${row[2]}`.trim()),
  series: [{ name: "貢獻淨利", values: topSkus.map((row) => row[5]) }],
  hasLegend: false,
  dataLabels: { showValue: true },
  from: { row: 21, col: 1 },
  extent: { widthPx: 720, heightPx: 320 },
});

dashboard.charts.add("column", {
  title: "通路營業額排行",
  categories: channelSummary.slice(0, 6).map((row) => row.key),
  series: [{ name: "營業額", values: channelSummary.slice(0, 6).map((row) => row.revenue) }],
  hasLegend: false,
  dataLabels: { showValue: true },
  from: { row: 21, col: 8 },
  extent: { widthPx: 620, heightPx: 320 },
});
setWidths(dashboard, [130, 145, 190, 85, 125, 125, 85, 145, 130, 190, 145, 85, 120, 85]);

addRawSheet(workbook, "Raw_Sales", salesRaw);
addRawSheet(workbook, "Raw_Product_Costs", productCostRaw);
addRawSheet(workbook, "Raw_Operating_Costs", operatingCostRaw);

const cleanSalesSheet = workbook.worksheets.add("Clean_Sales");
const cleanSalesHeader = [
  "Source Row",
  "Analysis SKU",
  "Channel",
  "Spec",
  "Customer",
  "MOQ/Notes",
  "Product",
  "Unit Basis",
  "Normalized Unit Qty",
  "Unit Type",
  "Comparability Note",
  "2025 Units",
  "Wholesale Price",
  "Product COGS",
  "Gross Profit/Unit",
  "Gross Margin",
  "Operating Expense/Unit",
  "Invoice 5%",
  "Expense Subtotal",
  "Net Profit/Unit",
  "Net Margin",
  "Reported Contribution",
  "Reported Revenue",
  "Calc Revenue",
  "Calc Contribution",
  "Revenue Diff",
  "Contribution Diff",
];
const cleanSalesValues = sales.rows.map((row) => [
  row.sourceRow,
  row.analysisSku,
  row.channel,
  row.spec,
  row.customer,
  row.moq,
  row.product,
  row.unitBasis,
  row.normalizedUnitQty,
  row.normalizedUnitType,
  row.comparabilityNote,
  row.quantity,
  row.wholesalePrice,
  row.productCost,
  row.grossProfit,
  row.grossMargin,
  row.operatingExpense,
  row.invoiceTax,
  row.expenseSubtotal,
    row.netProfitPerUnit,
    row.netMargin,
    row.reportedContribution,
    row.reportedRevenue,
  "",
  "",
  "",
  "",
]);
aoaWrite(cleanSalesSheet, "A1", [cleanSalesHeader, ...cleanSalesValues]);
formulaWrite(
  cleanSalesSheet,
  "X2",
  sales.rows.map((_, idx) => {
    const row = idx + 2;
    return [`=L${row}*M${row}`, `=L${row}*T${row}`, `=X${row}-W${row}`, `=Y${row}-V${row}`];
  }),
);
styleTable(cleanSalesSheet, sales.rows.length + 1, cleanSalesHeader.length);
setWidths(cleanSalesSheet, [80, 320, 150, 180, 120, 260, 150, 105, 105, 80, 210, 90, 105, 100, 115, 95, 130, 95, 115, 110, 95, 130, 120, 115, 130, 110, 130]);
cleanSalesSheet.getRange(`I2:I${sales.rows.length + 1}`).format.numberFormat = "#,##0;[Red](#,##0);-";
cleanSalesSheet.getRange(`L2:O${sales.rows.length + 1}`).format.numberFormat = "#,##0;[Red](#,##0);-";
cleanSalesSheet.getRange(`P2:P${sales.rows.length + 1}`).format.numberFormat = "0.0%;[Red](0.0%);-";
cleanSalesSheet.getRange(`Q2:T${sales.rows.length + 1}`).format.numberFormat = "#,##0.0;[Red](#,##0.0);-";
cleanSalesSheet.getRange(`U2:U${sales.rows.length + 1}`).format.numberFormat = "0.0%;[Red](0.0%);-";
cleanSalesSheet.getRange(`V2:AA${sales.rows.length + 1}`).format.numberFormat = "#,##0;[Red](#,##0);-";

const productCostSheet = workbook.worksheets.add("Clean_Product_Costs");
const productCostHeader = [
  "Source Row",
  "Channel",
  "Spec",
  "Customer",
  "MOQ/Notes",
  "Product",
  "Retail Price",
  "Wholesale Price",
  "Discount",
  "Product COGS",
  "Gross Profit/Unit",
  "Gross Margin",
  "Shipping",
  "Operating Expense",
  "Marketing",
  "Payment Fee",
  "Invoice 5%",
  "Expense Subtotal",
  "Net Profit/Unit",
  "Net Margin",
];
aoaWrite(productCostSheet, "A1", [
  productCostHeader,
  ...productCosts.map((row) => [
    row.sourceRow,
    row.channel,
    row.spec,
    row.customer,
    row.moq,
    row.product,
    row.retailPrice,
    row.wholesalePrice,
    row.discount,
    row.productCost,
    row.grossProfit,
    row.grossMargin,
    row.shipping,
    row.operatingExpense,
    row.marketingExpense,
    row.paymentFee,
    row.invoiceTax,
    row.expenseSubtotal,
    row.netProfitPerUnit,
    row.netMargin,
  ]),
]);
styleTable(productCostSheet, productCosts.length + 1, productCostHeader.length);
setWidths(productCostSheet, [80, 150, 190, 115, 260, 150, 90, 105, 85, 100, 115, 95, 85, 125, 85, 90, 85, 115, 115, 95]);
productCostSheet.getRange(`G2:H${productCosts.length + 1}`).format.numberFormat = "#,##0;[Red](#,##0);-";
productCostSheet.getRange(`I2:I${productCosts.length + 1}`).format.numberFormat = "0.0%;[Red](0.0%);-";
productCostSheet.getRange(`J2:K${productCosts.length + 1}`).format.numberFormat = "#,##0;[Red](#,##0);-";
productCostSheet.getRange(`L2:L${productCosts.length + 1}`).format.numberFormat = "0.0%;[Red](0.0%);-";
productCostSheet.getRange(`M2:S${productCosts.length + 1}`).format.numberFormat = "#,##0.0;[Red](#,##0.0);-";
productCostSheet.getRange(`T2:T${productCosts.length + 1}`).format.numberFormat = "0.0%;[Red](0.0%);-";

const operatingSheet = workbook.worksheets.add("Operating_Costs");
const operatingHeader = ["Source Row", "Item", "Annual Cost", "Raw Amount", "Status", "Content", "Notes"];
aoaWrite(operatingSheet, "A1", [
  operatingHeader,
  ...operatingCosts.map((row) => [row.sourceRow, row.item, row.annualCost, row.rawAmount, row.status, row.content, row.note]),
  ["", "Confirmed Operating Cost", confirmedOperatingCost, "", "", "", ""],
]);
styleTable(operatingSheet, operatingCosts.length + 2, operatingHeader.length, { headerFill: "#203A49" });
setWidths(operatingSheet, [80, 150, 120, 120, 90, 260, 360]);
operatingSheet.getRange(`C2:C${operatingCosts.length + 2}`).format.numberFormat = '"NT$"#,##0;[Red]("NT$"#,##0);-';
operatingSheet.getRange(`A${operatingCosts.length + 2}:G${operatingCosts.length + 2}`).format.fill.color = "#E8EFE7";
operatingSheet.getRange(`A${operatingCosts.length + 2}:G${operatingCosts.length + 2}`).format.font.bold = true;

const skuSheet = workbook.worksheets.add("SKU_Contribution");
const skuHeader = [
  "Analysis SKU",
  "Product",
  "Channel",
  "Spec",
  "Unit Basis",
  "Units",
  "Revenue",
  "Avg Wholesale Price",
  "Avg Product COGS",
  "Net Profit/Unit",
  "Contribution Profit",
  "Net Margin",
  "Revenue / 100 Unit",
  "Contribution / 100 Unit",
  "Diagnosis",
  "Comparability Note",
];
aoaWrite(skuSheet, "A1", [
  skuHeader,
  ...skuSummary.map((row) => [
    row.key,
    row.product,
    row.channel,
    row.spec,
    row.unitBasis,
    row.units,
    row.revenue,
    row.averagePrice,
    row.averageCost,
    row.netProfitPerUnit,
    row.contributionProfit,
    row.netMargin,
    row.revenuePer100,
    row.contributionPer100,
    classify(row),
    row.comparabilityNote,
  ]),
]);
styleTable(skuSheet, skuSummary.length + 1, skuHeader.length, { headerFill: "#12312B" });
setWidths(skuSheet, [320, 145, 150, 190, 105, 80, 120, 120, 115, 115, 130, 90, 120, 135, 145, 230]);
skuSheet.getRange(`F2:K${skuSummary.length + 1}`).format.numberFormat = "#,##0.0;[Red](#,##0.0);-";
skuSheet.getRange(`L2:L${skuSummary.length + 1}`).format.numberFormat = "0.0%;[Red](0.0%);-";
skuSheet.getRange(`M2:N${skuSummary.length + 1}`).format.numberFormat = "#,##0.0;[Red](#,##0.0);-";

const contributionSheet = workbook.worksheets.add("Product_Contribution");
const contributionHeader = [
  "Product",
  "SKU Count",
  "Spec Count",
  "Comparability Flag",
  "Units",
  "Revenue",
  "Avg Wholesale Price",
  "Product Cost Total",
  "Gross Profit Total",
  "Expense Allocation Total",
  "Contribution Profit",
  "Gross Margin",
  "Net Margin",
  "Diagnosis",
  "Interpretation",
];
aoaWrite(contributionSheet, "A1", [
  contributionHeader,
  ...productSummary.map((row) => [
    row.key,
    row.skuCount,
    row.specCount,
    row.comparabilityFlag,
    row.units,
    row.revenue,
    row.averagePrice,
    row.productCostTotal,
    row.grossProfitTotal,
    row.operatingExpenseTotal,
    row.contributionProfit,
    row.grossMargin,
    row.netMargin,
    classify(row),
    row.interpretation,
  ]),
]);
styleTable(contributionSheet, productSummary.length + 1, contributionHeader.length);
setWidths(contributionSheet, [170, 80, 80, 190, 90, 120, 130, 130, 135, 150, 135, 100, 100, 150, 230]);
contributionSheet.getRange(`B2:C${productSummary.length + 1}`).format.numberFormat = "#,##0;[Red](#,##0);-";
contributionSheet.getRange(`E2:K${productSummary.length + 1}`).format.numberFormat = "#,##0;[Red](#,##0);-";
contributionSheet.getRange(`L2:M${productSummary.length + 1}`).format.numberFormat = "0.0%;[Red](0.0%);-";

const channelSheet = workbook.worksheets.add("Channel_Contribution");
const channelHeader = [
  "Channel",
  "Units",
  "Revenue",
  "Avg Wholesale Price",
  "Product Cost Total",
  "Gross Profit Total",
  "Expense Allocation Total",
  "Contribution Profit",
  "Gross Margin",
  "Net Margin",
  "Diagnosis",
];
aoaWrite(channelSheet, "A1", [
  channelHeader,
  ...channelSummary.map((row) => [
    row.key,
    row.units,
    row.revenue,
    row.averagePrice,
    row.productCostTotal,
    row.grossProfitTotal,
    row.operatingExpenseTotal,
    row.contributionProfit,
    row.grossMargin,
    row.netMargin,
    classify(row),
  ]),
]);
styleTable(channelSheet, channelSummary.length + 1, channelHeader.length);
setWidths(channelSheet, [170, 90, 120, 130, 130, 135, 150, 135, 100, 100, 150]);
channelSheet.getRange(`B2:H${channelSummary.length + 1}`).format.numberFormat = "#,##0;[Red](#,##0);-";
channelSheet.getRange(`I2:J${channelSummary.length + 1}`).format.numberFormat = "0.0%;[Red](0.0%);-";

const checksSheet = workbook.worksheets.add("Checks");
const salesLastRow = sales.rows.length + 1;
const opPending = operatingCosts.filter((row) => row.status !== "Confirmed").length;
const negativeRows = sales.rows.filter((row) => (row.netProfitPerUnit || 0) < 0 || (row.totalNetProfit || 0) < 0).length;
const missingKeyRows = sales.rows.filter((row) => !row.channel || !row.product || !row.quantity || row.wholesalePrice === null).length;
const mixedSpecProducts = productSummary.filter((row) => row.comparabilityFlag.startsWith("Mixed")).length;
aoaWrite(checksSheet, "A1", [
  ["Check", "Actual", "Expected", "Difference", "Tolerance", "Status", "Notes"],
  ["UTF-8 source read", 3, 3, 0, 0, "OK", "All three original CSV files loaded with readable Chinese headers."],
  ["Clean sales row count", sales.rows.length, "> 0", "", 0, sales.rows.length > 0 ? "OK" : "Check", "Rows require product and 2025 quantity."],
  ["Revenue total vs reported", `=SUM(Clean_Sales!W2:W${salesLastRow})`, sales.sourceRevenueTotal, `=B4-C4`, 1, `=IF(ABS(D4)<=E4,"OK","Check")`, "Compares cleaned reported revenue to source summary row."],
  ["Calculated revenue vs reported", `=SUM(Clean_Sales!X2:X${salesLastRow})`, `=SUM(Clean_Sales!W2:W${salesLastRow})`, `=B5-C5`, 1, `=IF(ABS(D5)<=E5,"OK","Check")`, "Uses 2025 units x wholesale price, including rows whose source revenue is blank."],
  ["Contribution total vs reported", `=SUM(Clean_Sales!V2:V${salesLastRow})`, sales.sourceContributionTotal, `=B6-C6`, 1, `=IF(ABS(D6)<=E6,"OK","Check")`, "Compares cleaned reported contribution to source summary row."],
  ["Calculated contribution vs reported", `=SUM(Clean_Sales!Y2:Y${salesLastRow})`, `=SUM(Clean_Sales!V2:V${salesLastRow})`, `=B7-C7`, 1, `=IF(ABS(D7)<=E7,"OK","Check")`, "Uses 2025 units x net profit per unit."],
  ["Missing key fields", missingKeyRows, 0, `=B8-C8`, 0, `=IF(B8=0,"OK","Check")`, "Channel/product/quantity/price completeness."],
  ["Negative profit sales rows", negativeRows, 0, `=B9-C9`, 0, negativeRows === 0 ? "OK" : "Review", "Negative rows are surfaced as risk, not removed."],
  ["Pending operating cost items", opPending, 0, `=B10-C10`, 0, opPending === 0 ? "OK" : "Review", "Pending/blank cost rows retained for management follow-up."],
  ["Mixed-spec product rollups", mixedSpecProducts, 0, `=B11-C11`, 0, mixedSpecProducts === 0 ? "OK" : "Review", "Product rollups with multiple specs should be interpreted through SKU_Contribution."],
  ["Overall model status", "", "", "", "", `=IF(COUNTIF(F2:F11,"Check")+COUNTIF(F2:F11,"Review")=0,"OK","Review")`, "Review items are expected when source has negative profit, pending costs, or mixed specs."],
]);
styleTable(checksSheet, 12, 7, { headerFill: "#12312B" });
setWidths(checksSheet, [220, 125, 125, 115, 90, 90, 340]);
checksSheet.getRange("B4:E11").format.numberFormat = "#,##0;[Red](#,##0);-";
checksSheet.getRange("F2:F12").format.font.bold = true;

for (const sheet of workbook.worksheets.items) {
  sheet.getRange("A:AA").format.font.name = "Aptos";
}

await fs.mkdir(__dirname, { recursive: true });

const summaryInspect = await workbook.inspect({
  kind: "table",
  range: "Dashboard!A1:N17",
  include: "values,formulas",
  tableMaxRows: 30,
  tableMaxCols: 14,
});
console.log(summaryInspect.ndjson);

const formulaErrors = await workbook.inspect({
  kind: "match",
  range: "Dashboard!A1:N39",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "dashboard formula error scan",
});
console.log(formulaErrors.ndjson);

for (const range of [
  "Clean_Sales!A1:AA40",
  "Clean_Product_Costs!A1:T60",
  "Operating_Costs!A1:G20",
  "SKU_Contribution!A1:P40",
  "Product_Contribution!A1:O40",
  "Channel_Contribution!A1:K20",
  "Checks!A1:G13",
]) {
  const scan = await workbook.inspect({
    kind: "match",
    range,
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 300 },
    summary: `${range} formula error scan`,
  });
  console.log(scan.ndjson);
}

await workbook.render({ sheetName: "Dashboard", range: "A1:N39", scale: 1.5 });
await workbook.render({ sheetName: "Clean_Sales", range: "A1:AA20", scale: 1.5 });
await workbook.render({ sheetName: "SKU_Contribution", range: "A1:P25", scale: 1.5 });
await workbook.render({ sheetName: "Checks", range: "A1:G13", scale: 1.5 });

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

console.log(
  JSON.stringify(
    {
      outputPath,
      cleanSalesRows: sales.rows.length,
      skuRows: skuSummary.length,
      cleanProductCostRows: productCosts.length,
      operatingCostRows: operatingCosts.length,
      totalRevenue,
      totalContribution,
      confirmedOperatingCost,
      brandOperatingIncome,
      negativeRows,
      pendingOperatingCostRows: opPending,
      mixedSpecProducts,
    },
    null,
    2,
  ),
);

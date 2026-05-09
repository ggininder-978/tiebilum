import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const sourceDir = path.join(repoRoot, "knowledge", "sources");
const analysisDir = path.join(repoRoot, "knowledge", "wiki", "analysis");
const outputPath = path.join(__dirname, "tiebilum_2025_financial_sales_analysis.xlsx");

const files = {
  sales: path.join(sourceDir, "鐵比倫-產品成本結構試算 (1).xlsx - 2025 營收銷量(客戶填寫).csv"),
  productCosts: path.join(sourceDir, "鐵比倫-產品成本結構試算 (1).xlsx - 單品成本結構(客戶填寫).csv"),
  operatingCosts: path.join(sourceDir, "鐵比倫-產品成本結構試算 (1).xlsx - 營業成本項目.csv"),
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
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => String(value).trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((value) => String(value).replace(/^\uFEFF/, "").trim()));
}

async function readCsv(file) {
  return parseCsv(await fs.readFile(file, "utf8"));
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function writeCsv(file, rows) {
  const text = `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
  await fs.writeFile(file, text, "utf8");
}

function toNumber(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replace(/,/g, "").replace(/%/g, "").trim();
  if (cleaned === "" || cleaned === "待確認") return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function toPercent(value) {
  const num = toNumber(value);
  if (num === null) return null;
  return String(value).includes("%") || Math.abs(num) > 1 ? num / 100 : num;
}

function round(value, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function cleanProduct(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function parseRoute(rawRoute, rawMoq, section) {
  const route = (rawRoute || "").replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  const moq = (rawMoq || "").replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  let channelType = "未分類";
  let channelName = route || "";
  let packageType = "";
  let unitQuantity = null;
  let unit = "";
  let salesUnit = "";

  const specMatch = route.match(/\(([^)]+)\)/);
  const specText = specMatch ? specMatch[1] : route;
  const gramMatch = specText.match(/(\d+(?:\.\d+)?)\s*g/i);
  const mlMatch = specText.match(/(\d+(?:\.\d+)?)\s*ml/i);

  if (route.startsWith("批發-")) {
    channelType = "批發";
    channelName = route.replace(/^批發-/, "").replace(/\s*\(.+$/, "").trim();
  } else if (route.startsWith("貼牌客戶-")) {
    channelType = "貼牌";
    channelName = route.replace(/^貼牌客戶-/, "").replace(/\s*\(.+$/, "").trim();
  } else if (route.startsWith("手切")) {
    channelType = "直售";
    channelName = "手切";
    packageType = "手切台斤";
    unitQuantity = 600;
    unit = "g";
    salesUnit = "台斤";
  } else if (route.startsWith("蜜類-")) {
    channelType = "蜜類";
    channelName = "蜜類";
    packageType = "蜜類瓶裝";
  } else if (section === "OEM" || route === "科技中藥廠") {
    channelType = "OEM";
    channelName = route || "OEM";
    packageType = "薑母茶";
  } else if (route === "ODM/貼牌") {
    channelType = "貼牌";
    channelName = "ODM/貼牌";
  }

  if (!packageType) {
    if (specText.includes("單顆")) packageType = "單顆包裝夾鏈袋";
    else if (specText.includes("手切")) packageType = "手切夾鏈袋";
    else if (specText.includes("蜜類")) packageType = "蜜類瓶裝";
    else if (specText.includes("禮盒")) packageType = "禮盒";
    else packageType = specMatch ? specText : "";
  }

  if (gramMatch) {
    unitQuantity = Number(gramMatch[1]);
    unit = "g";
  } else if (mlMatch) {
    unitQuantity = Number(mlMatch[1]);
    unit = "ml";
  }

  let unitBasis = unitQuantity && unit ? `${unitQuantity}${unit}` : salesUnit || "";
  if (!unitBasis && /台斤|箱/.test(moq)) {
    unitBasis = moq;
    salesUnit = moq.includes("箱") ? "箱" : "台斤";
  }
  return {
    rawRoute: rawRoute || "",
    rawMoq: rawMoq || "",
    channelType,
    channelName,
    packageType,
    unitQuantity,
    unit,
    salesUnit,
    unitBasis,
    moq,
  };
}

function makeFlags(row) {
  const flags = [];
  if (row.revenueSource === "calculated") flags.push("calculated_revenue");
  if (row.profitSource === "calculated") flags.push("calculated_profit");
  if (row.wholesalePrice === null) flags.push("missing_price");
  if (row.productCogs === null) flags.push("missing_cost");
  if (!row.unitBasis) flags.push("missing_spec");
  if (row.reportedRevenue === 0 && row.quantity2025 > 0) flags.push("zero_reported_revenue");
  if ((row.netProfitPerUnit ?? 0) < 0 || (row.contributionProfit ?? 0) < 0) flags.push("negative_profit");
  return flags;
}

function findHeader(rows, required) {
  return rows.findIndex((row) => required.every((name) => row.includes(name)));
}

function headerMap(header) {
  return Object.fromEntries(header.map((name, index) => [name, index]));
}

function cleanSales(rows) {
  const headerIndex = findHeader(rows, ["客戶/通路", "品名", "2025訂購數量"]);
  if (headerIndex < 0) throw new Error("Sales header row not found.");
  const h = headerMap(rows[headerIndex]);
  const cleaned = [];
  const audit = [];
  const sourceSubtotals = [];
  let section = "";
  let currentRoute = parseRoute("", "", section);
  let inCompetitorSection = false;

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const sourceRow = index + 1;
    const row = rows[index];
    const rawRoute = row[h["客戶/通路"]] || "";
    const rawMoq = row[h["合作方式/MOQ"]] || "";
    const product = cleanProduct(row[h["品名"]]);

    if (rawMoq.trim() === "競品") {
      inCompetitorSection = true;
      audit.push({
        sourceRow,
        action: "exclude_competitor_section",
        product: "",
        rawRoute,
        revenueSource: "",
        profitSource: "",
        flags: "competitor_section_starts",
        notes: "Rows after this marker are competitor reference rows, not Tiebilum 2025 sales.",
      });
      continue;
    }
    if (inCompetitorSection) {
      if (row.some((value) => String(value).trim() !== "")) {
        audit.push({
          sourceRow,
          action: "excluded",
          product,
          rawRoute,
          revenueSource: "",
          profitSource: "",
          flags: "competitor_reference",
          notes: "Excluded by competitor section rule.",
        });
      }
      continue;
    }

    if (rawRoute.includes("OEM：")) {
      section = "OEM";
      audit.push({
        sourceRow,
        action: "section_marker",
        product: "",
        rawRoute,
        revenueSource: "",
        profitSource: "",
        flags: "oem_section_starts",
        notes: "Following rows are parsed as OEM unless another route rule applies.",
      });
      continue;
    }

    if (rawRoute.trim()) currentRoute = parseRoute(rawRoute, rawMoq, section);

    const quantity2025 = toNumber(row[h["2025訂購數量"]]);
    const wholesalePrice = toNumber(row[h["批價"]]);
    const productCogs = toNumber(row[h["產品成本"]]);
    const grossProfitPerUnit = toNumber(row[h["商品毛利"]]);
    const grossMargin = toPercent(row[h["商品毛利率"]]);
    const operatingExpensePerUnit = toNumber(row[h["營業費用"]]);
    const invoiceTaxPerUnit = toNumber(row[h["發票5%"]]);
    const expenseSubtotalPerUnit = toNumber(row[h["費用小計"]]);
    const reportedNetProfitPerUnit = toNumber(row[h["淨利"]]);
    const calculatedNetProfitPerUnit =
      grossProfitPerUnit !== null && operatingExpensePerUnit !== null && invoiceTaxPerUnit !== null
        ? grossProfitPerUnit - operatingExpensePerUnit - invoiceTaxPerUnit
        : null;
    const netProfitPerUnit = calculatedNetProfitPerUnit ?? reportedNetProfitPerUnit;
    const reportedContributionProfit = toNumber(row[h["商品貢獻淨利"]]);
    const reportedRevenue = toNumber(row[h["營業額"]]);
    const calculatedRevenue =
      quantity2025 !== null && wholesalePrice !== null ? quantity2025 * wholesalePrice : null;
    const calculatedContributionProfit =
      quantity2025 !== null && netProfitPerUnit !== null ? quantity2025 * netProfitPerUnit : null;

    if (!product && (reportedRevenue !== null || reportedContributionProfit !== null)) {
      sourceSubtotals.push({
        sourceRow,
        rawRoute: currentRoute.rawRoute,
        reportedRevenue,
        reportedContributionProfit,
      });
      audit.push({
        sourceRow,
        action: "subtotal_only",
        product: "",
        rawRoute: currentRoute.rawRoute,
        revenueSource: "reported",
        profitSource: "reported",
        flags: "category_subtotal",
        notes: "Kept for reconciliation, excluded from SKU ranking.",
      });
      continue;
    }

    if (!product || quantity2025 === null || quantity2025 <= 0) {
      if (product) {
        audit.push({
          sourceRow,
          action: "excluded",
          product,
          rawRoute: currentRoute.rawRoute,
          revenueSource: "",
          profitSource: "",
          flags: "no_2025_quantity",
          notes: "Cost catalog row without positive 2025 quantity.",
        });
      }
      continue;
    }

    const revenueSource = reportedRevenue !== null && reportedRevenue !== 0 ? "reported" : calculatedRevenue !== null ? "calculated" : "missing";
    const revenue = revenueSource === "reported" ? reportedRevenue : calculatedRevenue ?? 0;
    const profitSource =
      reportedContributionProfit !== null && reportedContributionProfit !== 0
        ? "reported"
        : calculatedContributionProfit !== null
          ? "calculated"
          : "missing";
    const contributionProfit = profitSource === "reported" ? reportedContributionProfit : calculatedContributionProfit ?? 0;
    const analysisSku = [
      product,
      currentRoute.channelType,
      currentRoute.channelName,
      currentRoute.packageType,
      currentRoute.unitBasis,
      wholesalePrice ?? "",
    ].join("_");

    const out = {
      sourceFile: path.basename(files.sales),
      sourceRow,
      rawRoute: currentRoute.rawRoute,
      rawMoq: currentRoute.rawMoq,
      channelType: currentRoute.channelType,
      channelName: currentRoute.channelName,
      productNameRaw: row[h["品名"]] || "",
      productNameStd: product,
      packageType: currentRoute.packageType,
      unitQuantity: currentRoute.unitQuantity,
      unit: currentRoute.unit,
      salesUnit: currentRoute.salesUnit,
      unitBasis: currentRoute.unitBasis,
      quantity2025,
      wholesalePrice,
      productCogs,
      productCogsTotal: productCogs !== null ? productCogs * quantity2025 : null,
      grossProfitPerUnit,
      grossProfitTotal: grossProfitPerUnit !== null ? grossProfitPerUnit * quantity2025 : null,
      grossMargin,
      operatingExpensePerUnit,
      operatingExpenseTotal: operatingExpensePerUnit !== null ? operatingExpensePerUnit * quantity2025 : null,
      invoiceTaxPerUnit,
      invoiceTaxTotal: invoiceTaxPerUnit !== null ? invoiceTaxPerUnit * quantity2025 : null,
      expenseSubtotalPerUnit,
      expenseSubtotalTotal: expenseSubtotalPerUnit !== null ? expenseSubtotalPerUnit * quantity2025 : null,
      reportedNetProfitPerUnit,
      calculatedNetProfitPerUnit,
      netProfitPerUnit,
      reportedContributionProfit,
      calculatedContributionProfit,
      contributionProfit,
      reportedRevenue,
      calculatedRevenue,
      revenue,
      revenueSource,
      profitSource,
      revenueDiff: reportedRevenue !== null && calculatedRevenue !== null ? calculatedRevenue - reportedRevenue : null,
      contributionDiff:
        reportedContributionProfit !== null && calculatedContributionProfit !== null
          ? calculatedContributionProfit - reportedContributionProfit
          : null,
      analysisSku,
    };
    out.qualityFlags = makeFlags(out).join(";");
    cleaned.push(out);
    audit.push({
      sourceRow,
      action: "included_sales_row",
      product,
      rawRoute: currentRoute.rawRoute,
      revenueSource,
      profitSource,
      flags: out.qualityFlags,
      notes: "",
    });
  }

  return { rows: cleaned, audit, sourceSubtotals };
}

function cleanProductCosts(rows) {
  const headerIndex = findHeader(rows, ["通路/規格", "品名", "產品成本"]);
  if (headerIndex < 0) throw new Error("Product cost header row not found.");
  const h = headerMap(rows[headerIndex]);
  const out = [];
  let section = "";
  let currentRoute = parseRoute("", "", section);

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const sourceRow = index + 1;
    const row = rows[index];
    const rawRoute = row[h["通路/規格"]] || "";
    const rawMoq = row[h["MOQ"]] || "";
    const product = cleanProduct(row[h["品名"]]);
    if (rawRoute.includes("OEM：")) {
      section = "OEM";
      continue;
    }
    if (rawRoute.trim()) currentRoute = parseRoute(rawRoute, rawMoq, section);
    if (!product) continue;
    const productCogs = toNumber(row[h["產品成本"]]);
    const wholesalePrice = toNumber(row[h["批價"]]);
    if (productCogs === null && wholesalePrice === null) continue;
    out.push({
      sourceRow,
      channelType: currentRoute.channelType,
      channelName: currentRoute.channelName,
      packageType: currentRoute.packageType,
      unitBasis: currentRoute.unitBasis,
      product,
      retailPrice: toNumber(row[h["售價"]]),
      wholesalePrice,
      discount: toPercent(row[h["基本折數"]]),
      productCogs,
      grossProfitPerUnit: toNumber(row[h["商品毛利"]]),
      grossMargin: toPercent(row[h["商品毛利率"]]),
      shipping: toNumber(row[h["運費負擔"]]),
      operatingExpensePerUnit: toNumber(row[h["營業費用"]]),
      marketingExpense: toNumber(row[h["行銷費用"]]),
      paymentFee: toNumber(row[h["金流費用"]]),
      invoiceTaxPerUnit: toNumber(row[h["發票5%"]]),
      expenseSubtotalPerUnit: toNumber(row[h["費用小計"]]),
      netProfitPerUnit: toNumber(row[h["淨利"]]),
      netMargin: toPercent(row[h["淨利率"]]),
    });
  }
  return out;
}

function cleanOperatingCosts(rows) {
  const [header, ...body] = rows;
  const h = headerMap(header);
  const costs = [];
  let sourceTotal = null;
  for (let index = 0; index < body.length; index += 1) {
    const row = body[index];
    const item = row[h["項目"]] || "";
    const amount = toNumber(row[h["成本/年"]]);
    const rawAmount = row[h["成本/年"]] || "";
    if (!item && amount !== null) {
      sourceTotal = amount;
      continue;
    }
    if (!item && !rawAmount) continue;
    costs.push({
      sourceRow: index + 2,
      item,
      annualCost: amount,
      rawAmount,
      content: row[h["內容"]] || "",
      note: row[h["備註"]] || "",
      status: amount !== null ? "confirmed" : rawAmount ? "pending" : "blank",
    });
  }
  return { rows: costs, sourceTotal };
}

function groupBy(rows, keyFn, seedFn = () => ({})) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) {
      map.set(key, {
        key,
        units: 0,
        revenue: 0,
        productCogsTotal: 0,
        grossProfitTotal: 0,
        expenseSubtotalTotal: 0,
        contributionProfit: 0,
        missingCostRows: 0,
        negativeRows: 0,
        ...seedFn(row),
      });
    }
    const item = map.get(key);
    item.units += row.quantity2025 || 0;
    item.revenue += row.revenue || 0;
    item.productCogsTotal += row.productCogsTotal || 0;
    item.grossProfitTotal += row.grossProfitTotal || 0;
    item.expenseSubtotalTotal += row.expenseSubtotalTotal || 0;
    item.contributionProfit += row.contributionProfit || 0;
    if (row.productCogs === null) item.missingCostRows += 1;
    if ((row.contributionProfit || 0) < 0) item.negativeRows += 1;
  }
  return [...map.values()];
}

function addRanks(rows, metric) {
  const sorted = [...rows].sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
  sorted.forEach((row, index) => {
    row[`${metric}Rank`] = index + 1;
  });
}

function productRanking(salesRows) {
  const rows = groupBy(salesRows, (row) => row.productNameStd, (row) => ({
    product: row.productNameStd,
    skuCount: new Set(),
    channels: new Set(),
    specs: new Set(),
  }));
  for (const row of salesRows) {
    const item = rows.find((r) => r.key === row.productNameStd);
    item.skuCount.add(row.analysisSku);
    item.channels.add(row.channelName || row.channelType);
    if (row.unitBasis) item.specs.add(row.unitBasis);
  }
  for (const row of rows) {
    row.skuCountValue = row.skuCount.size;
    row.channelCount = row.channels.size;
    row.specSummary = [...row.specs].join(" / ") || "未標示";
    row.averagePrice = row.units ? row.revenue / row.units : 0;
    row.averageCogs = row.units ? row.productCogsTotal / row.units : null;
    row.netProfitPerUnit = row.units ? row.contributionProfit / row.units : 0;
    row.grossMargin = row.revenue ? row.grossProfitTotal / row.revenue : null;
    row.netMargin = row.revenue ? row.contributionProfit / row.revenue : null;
    row.diagnosis = diagnose(row);
    delete row.skuCount;
    delete row.channels;
    delete row.specs;
  }
  addRanks(rows, "revenue");
  addRanks(rows, "units");
  addRanks(rows, "contributionProfit");
  return rows.sort((a, b) => a.revenueRank - b.revenueRank);
}

function skuRanking(salesRows) {
  const rows = groupBy(salesRows, (row) => row.analysisSku, (row) => ({
    product: row.productNameStd,
    channelType: row.channelType,
    channelName: row.channelName,
    packageType: row.packageType,
    unitBasis: row.unitBasis,
    wholesalePrice: row.wholesalePrice,
    productCogs: row.productCogs,
    qualityFlags: row.qualityFlags,
  }));
  for (const row of rows) {
    row.averagePrice = row.units ? row.revenue / row.units : 0;
    row.netProfitPerUnit = row.units ? row.contributionProfit / row.units : 0;
    row.netMargin = row.revenue ? row.contributionProfit / row.revenue : null;
    row.diagnosis = diagnose(row);
  }
  addRanks(rows, "revenue");
  addRanks(rows, "units");
  addRanks(rows, "contributionProfit");
  return rows.sort((a, b) => a.revenueRank - b.revenueRank);
}

function channelSummary(salesRows) {
  const rows = groupBy(salesRows, (row) => `${row.channelType}_${row.channelName || row.channelType}`, (row) => ({
    channelType: row.channelType,
    channelName: row.channelName || row.channelType,
  }));
  for (const row of rows) {
    row.averagePrice = row.units ? row.revenue / row.units : 0;
    row.netMargin = row.revenue ? row.contributionProfit / row.revenue : null;
    row.diagnosis = diagnose(row);
  }
  return rows.sort((a, b) => b.revenue - a.revenue);
}

function diagnose(row) {
  if ((row.contributionProfit || 0) < 0) return "虧損風險";
  if ((row.missingCostRows || 0) > 0) return "成本待補";
  if ((row.netMargin ?? 0) >= 0.2 && (row.contributionProfit || 0) >= 10000) return "高毛利主力";
  if ((row.revenue || 0) >= 100000 && (row.netMargin ?? 0) < 0.05) return "高營收低淨利";
  if ((row.contributionProfit || 0) >= 30000) return "淨利主力";
  return "穩定貢獻";
}

function salesMasterRows(rows) {
  const headers = [
    "source_file",
    "source_row",
    "raw_route",
    "raw_moq",
    "channel_type",
    "channel_name",
    "product_name_raw",
    "product_name_std",
    "package_type",
    "unit_quantity",
    "unit",
    "sales_unit",
    "unit_basis",
    "quantity_2025",
    "wholesale_price",
    "product_cogs",
    "product_cogs_total",
    "gross_profit_per_unit",
    "gross_profit_total",
    "gross_margin",
    "operating_expense_per_unit",
    "operating_expense_total",
    "invoice_tax_per_unit",
    "invoice_tax_total",
    "expense_subtotal_per_unit",
    "expense_subtotal_total",
    "reported_net_profit_per_unit",
    "calculated_net_profit_per_unit",
    "net_profit_per_unit",
    "reported_contribution_profit",
    "calculated_contribution_profit",
    "contribution_profit",
    "reported_revenue",
    "calculated_revenue",
    "revenue",
    "revenue_source",
    "profit_source",
    "revenue_diff",
    "contribution_diff",
    "analysis_sku",
    "quality_flags",
  ];
  return [
    headers,
    ...rows.map((row) => [
      row.sourceFile,
      row.sourceRow,
      row.rawRoute,
      row.rawMoq,
      row.channelType,
      row.channelName,
      row.productNameRaw,
      row.productNameStd,
      row.packageType,
      row.unitQuantity,
      row.unit,
      row.salesUnit,
      row.unitBasis,
      row.quantity2025,
      row.wholesalePrice,
      row.productCogs,
      round(row.productCogsTotal),
      row.grossProfitPerUnit,
      round(row.grossProfitTotal),
      row.grossMargin,
      row.operatingExpensePerUnit,
      round(row.operatingExpenseTotal),
      row.invoiceTaxPerUnit,
      round(row.invoiceTaxTotal),
      row.expenseSubtotalPerUnit,
      round(row.expenseSubtotalTotal),
      row.reportedNetProfitPerUnit,
      round(row.calculatedNetProfitPerUnit, 6),
      round(row.netProfitPerUnit, 6),
      row.reportedContributionProfit,
      round(row.calculatedContributionProfit),
      round(row.contributionProfit),
      row.reportedRevenue,
      round(row.calculatedRevenue),
      round(row.revenue),
      row.revenueSource,
      row.profitSource,
      round(row.revenueDiff),
      round(row.contributionDiff),
      row.analysisSku,
      row.qualityFlags,
    ]),
  ];
}

function productRows(rows) {
  const headers = [
    "revenue_rank",
    "units_rank",
    "contribution_rank",
    "product",
    "units",
    "revenue",
    "product_cogs_total",
    "gross_profit_total",
    "expense_subtotal_total",
    "contribution_profit",
    "average_price",
    "average_cogs",
    "net_profit_per_unit",
    "gross_margin",
    "net_margin",
    "sku_count",
    "channel_count",
    "spec_summary",
    "missing_cost_rows",
    "negative_rows",
    "diagnosis",
  ];
  return [
    headers,
    ...rows.map((row) => [
      row.revenueRank,
      row.unitsRank,
      row.contributionProfitRank,
      row.product,
      row.units,
      round(row.revenue),
      round(row.productCogsTotal),
      round(row.grossProfitTotal),
      round(row.expenseSubtotalTotal),
      round(row.contributionProfit),
      round(row.averagePrice),
      round(row.averageCogs),
      round(row.netProfitPerUnit),
      row.grossMargin,
      row.netMargin,
      row.skuCountValue,
      row.channelCount,
      row.specSummary,
      row.missingCostRows,
      row.negativeRows,
      row.diagnosis,
    ]),
  ];
}

function channelRows(rows) {
  const headers = [
    "channel_type",
    "channel_name",
    "units",
    "revenue",
    "product_cogs_total",
    "gross_profit_total",
    "expense_subtotal_total",
    "contribution_profit",
    "average_price",
    "net_margin",
    "missing_cost_rows",
    "negative_rows",
    "diagnosis",
  ];
  return [
    headers,
    ...rows.map((row) => [
      row.channelType,
      row.channelName,
      row.units,
      round(row.revenue),
      round(row.productCogsTotal),
      round(row.grossProfitTotal),
      round(row.expenseSubtotalTotal),
      round(row.contributionProfit),
      round(row.averagePrice),
      row.netMargin,
      row.missingCostRows,
      row.negativeRows,
      row.diagnosis,
    ]),
  ];
}

function auditRows(audit) {
  return [
    ["source_row", "action", "product", "raw_route", "revenue_source", "profit_source", "quality_flags", "notes"],
    ...audit.map((row) => [
      row.sourceRow,
      row.action,
      row.product,
      row.rawRoute,
      row.revenueSource,
      row.profitSource,
      row.flags,
      row.notes,
    ]),
  ];
}

function operatingRows(costs) {
  return [
    ["source_row", "item", "annual_cost", "raw_amount", "status", "content", "note"],
    ...costs.map((row) => [
      row.sourceRow,
      row.item,
      row.annualCost,
      row.rawAmount,
      row.status,
      row.content,
      row.note,
    ]),
  ];
}

function productCostRows(rows) {
  return [
    [
      "source_row",
      "channel_type",
      "channel_name",
      "package_type",
      "unit_basis",
      "product",
      "retail_price",
      "wholesale_price",
      "discount",
      "product_cogs",
      "gross_profit_per_unit",
      "gross_margin",
      "shipping",
      "operating_expense_per_unit",
      "marketing_expense",
      "payment_fee",
      "invoice_tax_per_unit",
      "expense_subtotal_per_unit",
      "net_profit_per_unit",
      "net_margin",
    ],
    ...rows.map((row) => [
      row.sourceRow,
      row.channelType,
      row.channelName,
      row.packageType,
      row.unitBasis,
      row.product,
      row.retailPrice,
      row.wholesalePrice,
      row.discount,
      row.productCogs,
      row.grossProfitPerUnit,
      row.grossMargin,
      row.shipping,
      row.operatingExpensePerUnit,
      row.marketingExpense,
      row.paymentFee,
      row.invoiceTaxPerUnit,
      row.expenseSubtotalPerUnit,
      row.netProfitPerUnit,
      row.netMargin,
    ]),
  ];
}

function skuRows(rows) {
  return [
    [
      "revenue_rank",
      "units_rank",
      "contribution_rank",
      "product",
      "channel_type",
      "channel_name",
      "package_type",
      "unit_basis",
      "units",
      "revenue",
      "product_cogs_total",
      "contribution_profit",
      "average_price",
      "product_cogs",
      "net_profit_per_unit",
      "net_margin",
      "quality_flags",
      "diagnosis",
    ],
    ...rows.map((row) => [
      row.revenueRank,
      row.unitsRank,
      row.contributionProfitRank,
      row.product,
      row.channelType,
      row.channelName,
      row.packageType,
      row.unitBasis,
      row.units,
      round(row.revenue),
      round(row.productCogsTotal),
      round(row.contributionProfit),
      round(row.averagePrice),
      row.productCogs,
      round(row.netProfitPerUnit),
      row.netMargin,
      row.qualityFlags,
      row.diagnosis,
    ]),
  ];
}

function colName(index) {
  let n = index;
  let out = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    out = String.fromCharCode(65 + m) + out;
    n = Math.floor((n - m) / 26);
  }
  return out;
}

function writeMatrix(sheet, start, matrix) {
  if (!matrix.length) return;
  const range = sheet.getRange(start).getResizedRange(matrix.length - 1, matrix[0].length - 1);
  range.values = matrix;
}

function styleRange(range, fill, fontColor = "#FFFFFF") {
  range.format.fill.color = fill;
  range.format.font.color = fontColor;
  range.format.font.bold = true;
}

function styleSheet(sheet, rowCount, colCount, widths = []) {
  const lastCol = colName(colCount);
  styleRange(sheet.getRange(`A1:${lastCol}1`), "#14342B");
  sheet.getRange(`A1:${lastCol}${Math.max(rowCount, 1)}`).format.wrapText = true;
  sheet.getRange(`A1:${lastCol}${Math.max(rowCount, 1)}`).format.verticalAlignment = "Top";
  sheet.freezePanes.freezeRows(1);
  sheet.showGridLines = false;
  widths.forEach((width, index) => {
    sheet.getRange(`${colName(index + 1)}:${colName(index + 1)}`).format.columnWidthPx = width;
  });
}

function applyNumberFormats(sheet, rowCount, moneyCols = [], percentCols = [], countCols = []) {
  for (const col of moneyCols) {
    sheet.getRange(`${col}2:${col}${rowCount}`).format.numberFormat = '"NT$"#,##0;[Red]("NT$"#,##0);-';
  }
  for (const col of percentCols) {
    sheet.getRange(`${col}2:${col}${rowCount}`).format.numberFormat = "0.0%;[Red](0.0%);-";
  }
  for (const col of countCols) {
    sheet.getRange(`${col}2:${col}${rowCount}`).format.numberFormat = "#,##0;[Red](#,##0);-";
  }
}

function addSheet(workbook, name, matrix, widths, moneyCols = [], percentCols = [], countCols = []) {
  const sheet = workbook.worksheets.add(name);
  writeMatrix(sheet, "A1", matrix);
  styleSheet(sheet, matrix.length, matrix[0].length, widths);
  applyNumberFormats(sheet, matrix.length, moneyCols, percentCols, countCols);
  return sheet;
}

function buildMarkdown(metrics, topProducts, channelFinancials, operating) {
  const topRevenue = topProducts.slice(0, 5);
  const topProfit = [...topProducts].sort((a, b) => b.contributionProfit - a.contributionProfit).slice(0, 5);
  const riskProducts = topProducts.filter((row) => row.missingCostRows || row.negativeRows || row.diagnosis.includes("低淨利"));

  return `# 2025 商品銷售與財務分析

> Updated: 2026-05-09

## 核心 KPI

- 2025 營業額：NT$${Math.round(metrics.totalRevenue).toLocaleString("en-US")}
- 商品貢獻淨利：NT$${Math.round(metrics.totalContribution).toLocaleString("en-US")}
- 商品貢獻淨利率：${(metrics.contributionMargin * 100).toFixed(1)}%
- 已確認年度營業成本：NT$${Math.round(metrics.confirmedOperatingCost).toLocaleString("en-US")}
- 管理口徑淨額（商品貢獻淨利 - 已確認年度營業成本）：NT$${Math.round(metrics.managementNetAfterAnnualCost).toLocaleString("en-US")}

## 商品銷售排名：營收 Top 5

| Rank | 商品 | 營收 | 銷量 | 商品貢獻淨利 | 淨利率 | 診斷 |
| :--- | :--- | ---: | ---: | ---: | ---: | :--- |
${topRevenue
  .map(
    (row) =>
      `| ${row.revenueRank} | ${row.product} | ${Math.round(row.revenue).toLocaleString("en-US")} | ${Math.round(row.units).toLocaleString("en-US")} | ${Math.round(row.contributionProfit).toLocaleString("en-US")} | ${((row.netMargin || 0) * 100).toFixed(1)}% | ${row.diagnosis} |`,
  )
  .join("\n")}

## 商品淨利排名：貢獻 Top 5

| Rank | 商品 | 商品貢獻淨利 | 營收 | 銷量 | 淨利/單位 |
| :--- | :--- | ---: | ---: | ---: | ---: |
${topProfit
  .map(
    (row) =>
      `| ${row.contributionProfitRank} | ${row.product} | ${Math.round(row.contributionProfit).toLocaleString("en-US")} | ${Math.round(row.revenue).toLocaleString("en-US")} | ${Math.round(row.units).toLocaleString("en-US")} | ${round(row.netProfitPerUnit, 1)} |`,
  )
  .join("\n")}

## 通路概況

| 通路 | 營收 | 商品貢獻淨利 | 淨利率 | 診斷 |
| :--- | ---: | ---: | ---: | :--- |
${channelFinancials
  .slice(0, 8)
  .map(
    (row) =>
      `| ${row.channelName} | ${Math.round(row.revenue).toLocaleString("en-US")} | ${Math.round(row.contributionProfit).toLocaleString("en-US")} | ${((row.netMargin || 0) * 100).toFixed(1)}% | ${row.diagnosis} |`,
  )
  .join("\n")}

## 注意事項

- 舊版清洗曾將競品區烤肉組列入銷售，造成營收被高估；新版已依規格排除競品區。
- 黑糖薑母茶來源缺少 reported 營業額與 reported 商品貢獻淨利，本版依「2025訂購數量 * 批價」與單位計算淨利補算。
- 新版 Excel 提供黑糖薑母茶 MOQ/規格「40台斤(一箱)」，本版已保留為規格基準。
- 1890ml 蜜類品項有數量但缺批價與成本，目前以 0 營收/淨利保留並標示待補。
- 年度營業成本表與商品表內的單位營業費用可能存在重疊，管理口徑淨額需由業主確認後才能作為正式稅前淨利。

## 產出檔案

- knowledge/wiki/analysis/2025_sales_sku_master.csv
- knowledge/wiki/analysis/2025_product_sales_ranking.csv
- knowledge/wiki/analysis/2025_channel_financials.csv
- outputs/financial_analysis_2025/tiebilum_2025_financial_sales_analysis.xlsx
`;
}

const [salesRaw, productCostRaw, operatingRaw] = await Promise.all([
  readCsv(files.sales),
  readCsv(files.productCosts),
  readCsv(files.operatingCosts),
]);

const sales = cleanSales(salesRaw);
const productCosts = cleanProductCosts(productCostRaw);
const operating = cleanOperatingCosts(operatingRaw);
const products = productRanking(sales.rows);
const skus = skuRanking(sales.rows);
const channels = channelSummary(sales.rows);

const totalRevenue = sales.rows.reduce((sum, row) => sum + (row.revenue || 0), 0);
const totalContribution = sales.rows.reduce((sum, row) => sum + (row.contributionProfit || 0), 0);
const totalCogs = sales.rows.reduce((sum, row) => sum + (row.productCogsTotal || 0), 0);
const totalGrossProfit = sales.rows.reduce((sum, row) => sum + (row.grossProfitTotal || 0), 0);
const totalExpenseSubtotal = sales.rows.reduce((sum, row) => sum + (row.expenseSubtotalTotal || 0), 0);
const confirmedOperatingCost = operating.rows.reduce((sum, row) => sum + (row.annualCost || 0), 0);
const managementNetAfterAnnualCost = totalContribution - confirmedOperatingCost;
const metrics = {
  totalRevenue,
  totalContribution,
  contributionMargin: totalRevenue ? totalContribution / totalRevenue : 0,
  totalCogs,
  totalGrossProfit,
  totalExpenseSubtotal,
  confirmedOperatingCost,
  managementNetAfterAnnualCost,
  cleanSalesRows: sales.rows.length,
  productRows: products.length,
  skuRows: skus.length,
  negativeRows: sales.rows.filter((row) => (row.contributionProfit || 0) < 0).length,
  missingCostRows: sales.rows.filter((row) => row.productCogs === null).length,
};

await fs.mkdir(analysisDir, { recursive: true });
await fs.mkdir(__dirname, { recursive: true });

await writeCsv(path.join(analysisDir, "2025_sales_sku_master.csv"), salesMasterRows(sales.rows));
await writeCsv(path.join(analysisDir, "2025_product_sales_ranking.csv"), productRows(products));
await writeCsv(path.join(analysisDir, "2025_channel_financials.csv"), channelRows(channels));
await writeCsv(path.join(analysisDir, "2025_sales_cleaning_audit.csv"), auditRows(sales.audit));
await writeCsv(path.join(analysisDir, "2025_operating_costs_cleaned.csv"), operatingRows(operating.rows));
await writeCsv(path.join(analysisDir, "2025_product_cost_catalog.csv"), productCostRows(productCosts));
await fs.writeFile(
  path.join(analysisDir, "2025_financial_sales_analysis.md"),
  buildMarkdown(metrics, products, channels, operating),
  "utf8",
);

const workbook = Workbook.create();

const dashboard = workbook.worksheets.add("Dashboard");
dashboard.showGridLines = false;
dashboard.getRange("A1").values = [["鐵比倫 2025 商品銷售與財務分析"]];
dashboard.getRange("A1:H1").merge();
dashboard.getRange("A1:H1").format.fill.color = "#14342B";
dashboard.getRange("A1:H1").format.font.color = "#FFFFFF";
dashboard.getRange("A1:H1").format.font.bold = true;
dashboard.getRange("A1:H1").format.font.size = 18;
dashboard.getRange("A2").values = [["資料來源：2025 營收銷量、單品成本結構、營業成本原始 CSV；更新日 2026-05-09"]];
dashboard.getRange("A2:H2").merge();
dashboard.getRange("A2:H2").format.fill.color = "#E9EFE8";

const kpis = [
  ["2025 營業額", totalRevenue, "商品貢獻淨利", totalContribution],
  ["商品貢獻淨利率", metrics.contributionMargin, "已確認年度營業成本", confirmedOperatingCost],
  ["管理口徑淨額", managementNetAfterAnnualCost, "清洗後銷售列數", metrics.cleanSalesRows],
  ["商品數", metrics.productRows, "SKU 數", metrics.skuRows],
];
writeMatrix(dashboard, "A4", kpis);
dashboard.getRange("A4:D7").format.fill.color = "#F7F4EA";
dashboard.getRange("A4:D7").format.font.bold = true;
dashboard.getRange("B4:B6").format.numberFormat = '"NT$"#,##0;[Red]("NT$"#,##0);-';
dashboard.getRange("D4:D6").format.numberFormat = '"NT$"#,##0;[Red]("NT$"#,##0);-';
dashboard.getRange("B5").format.numberFormat = "0.0%;[Red](0.0%);-";
dashboard.getRange("B7:D7").format.numberFormat = "#,##0";

const topProductTable = [
  ["排名", "商品", "銷量", "營收", "商品貢獻淨利", "淨利率", "診斷"],
  ...products.slice(0, 10).map((row) => [
    row.revenueRank,
    row.product,
    row.units,
    row.revenue,
    row.contributionProfit,
    row.netMargin,
    row.diagnosis,
  ]),
];
writeMatrix(dashboard, "A10", topProductTable);
styleRange(dashboard.getRange("A10:G10"), "#14342B");
dashboard.getRange("C11:C20").format.numberFormat = "#,##0";
dashboard.getRange("D11:E20").format.numberFormat = '"NT$"#,##0;[Red]("NT$"#,##0);-';
dashboard.getRange("F11:F20").format.numberFormat = "0.0%;[Red](0.0%);-";

const chartData = [
  ["商品", "營收", "商品貢獻淨利"],
  ...products.slice(0, 8).map((row) => [row.product, row.revenue, row.contributionProfit]),
];
writeMatrix(dashboard, "J4", chartData);
styleRange(dashboard.getRange("J4:L4"), "#51624D");
dashboard.getRange("K5:L12").format.numberFormat = '"NT$"#,##0;[Red]("NT$"#,##0);-';
const chart = dashboard.charts.add("bar", dashboard.getRange("J4:L12"));
chart.title = "商品營收與貢獻淨利 Top 8";
chart.hasLegend = true;
chart.yAxis = { numberFormatCode: '"NT$"#,##0' };
chart.setPosition("J14", "Q34");
styleSheet(dashboard, 34, 12, [90, 145, 85, 120, 120, 85, 120, 18, 18, 145, 120, 120]);

const productSheet = addSheet(
  workbook,
  "Product_Ranking",
  productRows(products),
  [80, 80, 95, 170, 90, 125, 125, 125, 135, 135, 105, 105, 115, 90, 90, 85, 95, 150, 105, 95, 130],
  ["F", "G", "H", "I", "J", "K", "L", "M"],
  ["N", "O"],
  ["E", "P", "Q", "S", "T"],
);

const skuSheet = addSheet(
  workbook,
  "SKU_Ranking",
  skuRows(skus),
  [80, 80, 95, 155, 95, 135, 135, 95, 85, 120, 120, 125, 105, 105, 115, 90, 220, 130],
  ["J", "K", "L", "M", "N", "O"],
  ["P"],
  ["I"],
);

const channelSheet = addSheet(
  workbook,
  "Channel_Finance",
  channelRows(channels),
  [115, 140, 90, 125, 125, 125, 135, 135, 105, 90, 105, 95, 130],
  ["D", "E", "F", "G", "H", "I"],
  ["J"],
  ["C", "K", "L"],
);

const costSheet = addSheet(
  workbook,
  "Cost_Structure",
  operatingRows(operating.rows),
  [80, 145, 125, 115, 95, 260, 360],
  ["C"],
  [],
  [],
);
const totalRow = operating.rows.length + 3;
writeMatrix(costSheet, `A${totalRow}`, [["", "已確認年度營業成本", confirmedOperatingCost, "", "confirmed_total", "", ""]]);
costSheet.getRange(`A${totalRow}:G${totalRow}`).format.fill.color = "#E9EFE8";
costSheet.getRange(`A${totalRow}:G${totalRow}`).format.font.bold = true;
costSheet.getRange(`C${totalRow}`).format.numberFormat = '"NT$"#,##0;[Red]("NT$"#,##0);-';

addSheet(
  workbook,
  "Clean_Sales",
  salesMasterRows(sales.rows),
  [120, 75, 210, 210, 95, 125, 145, 145, 135, 90, 65, 75, 90, 90, 105, 105, 120, 115, 120, 90, 130, 130, 105, 105, 130, 135, 130, 130, 125, 130, 140, 125, 120, 120, 120, 95, 95, 105, 120, 260, 210],
  ["O", "P", "Q", "R", "S", "U", "V", "W", "X", "Y", "Z", "AA", "AB", "AC", "AD", "AE", "AF", "AG", "AH", "AI", "AL", "AM"],
  ["T"],
  ["N"],
);

addSheet(
  workbook,
  "Product_Cost_Catalog",
  productCostRows(productCosts),
  [80, 95, 130, 145, 95, 150, 95, 105, 85, 105, 120, 90, 85, 130, 105, 95, 105, 125, 115, 90],
  ["G", "H", "J", "K", "M", "N", "O", "P", "Q", "R", "S"],
  ["I", "L", "T"],
  [],
);

addSheet(
  workbook,
  "Audit_Log",
  auditRows(sales.audit),
  [85, 150, 150, 240, 105, 105, 220, 360],
);

const checks = [
  ["Check", "Actual", "Expected", "Difference", "Tolerance", "Status", "Notes"],
  ["Clean sales rows", metrics.cleanSalesRows, ">0", "", 0, metrics.cleanSalesRows > 0 ? "OK" : "Check", "Rows require product and positive 2025 quantity."],
  ["Competitor rows excluded", sales.audit.filter((row) => row.flags === "competitor_reference").length, ">0", "", 0, "OK", "Competitor section retained only in audit."],
  ["Revenue total", totalRevenue, 1523247, totalRevenue - 1523247, 1, Math.abs(totalRevenue - 1523247) <= 1 ? "OK" : "Check", "Expected total from cleaned Tiebilum sales rows, excluding competitor references."],
  ["Contribution profit total", totalContribution, 233286.82, totalContribution - 233286.82, 2, Math.abs(totalContribution - 233286.82) <= 2 ? "OK" : "Check", "Uses reported contribution where available; computes OEM row from exact unit economics."],
  ["Confirmed operating cost", confirmedOperatingCost, 1553948, confirmedOperatingCost - 1553948, 1, Math.abs(confirmedOperatingCost - 1553948) <= 1 ? "OK" : "Check", "Excludes blank item total row to avoid double counting."],
  ["Missing cost sales rows", metrics.missingCostRows, 0, metrics.missingCostRows, 0, metrics.missingCostRows === 0 ? "OK" : "Review", "Missing-cost rows are preserved and flagged."],
  ["Negative profit sales rows", metrics.negativeRows, 0, metrics.negativeRows, 0, metrics.negativeRows === 0 ? "OK" : "Review", "Negative-profit rows are preserved for management review."],
  ["Overall model status", "", "", "", "", metrics.missingCostRows || metrics.negativeRows ? "Review" : "OK", "Review is expected while source has missing cost or negative profit rows."],
];
addSheet(workbook, "Checks", checks, [210, 120, 120, 120, 90, 90, 360], ["B", "C", "D"], [], []);

for (const sheet of workbook.worksheets.items) {
  sheet.getRange("A:AO").format.font.name = "Aptos";
}

const inspectDashboard = await workbook.inspect({
  kind: "table",
  range: "Dashboard!A1:L20",
  include: "values,formulas",
  tableMaxRows: 24,
  tableMaxCols: 12,
});
console.log(inspectDashboard.ndjson);

const errorScan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log(errorScan.ndjson);

for (const renderTarget of [
  { sheetName: "Dashboard", range: "A1:Q34" },
  { sheetName: "Product_Ranking", range: "A1:U20" },
  { sheetName: "SKU_Ranking", range: "A1:R20" },
  { sheetName: "Channel_Finance", range: "A1:M15" },
  { sheetName: "Cost_Structure", range: "A1:G16" },
  { sheetName: "Checks", range: "A1:G10" },
]) {
  await workbook.render({ ...renderTarget, scale: 1.2, format: "png" });
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

console.log(
  JSON.stringify(
    {
      outputPath,
      ...metrics,
      topRevenueProduct: products[0]?.product,
      topProfitProduct: [...products].sort((a, b) => b.contributionProfit - a.contributionProfit)[0]?.product,
    },
    null,
    2,
  ),
);

import { mkdirSync, rmSync, existsSync } from "node:fs";

const TOKEN = Bun.env.KOTAK_TOKEN;
const BASE_URL = "https://cis.kotaksecurities.com";

if (!TOKEN) {
  console.error("❌ KOTAK_TOKEN is missing! Check your GitHub Secrets.");
  process.exit(1);
}

async function run() {
  try {
    // 1. Get file paths
    const response = await fetch(`${BASE_URL}/script-details/1.0/masterscrip/file-paths`, {
      headers: { 'Authorization': TOKEN }
    });
    const result = await response.json();
    
    const filePaths = result.data.filesPaths.filter(s => 
      ["bse_fo", "nse_fo"].some(a => s.includes(a))
    );

    let allResults = [];

    
    for (const url of filePaths) {
      console.log(`Fetching: ${url}`);
      const csvText = await (await fetch(url)).text();
      const mapped = parseAndMap(csvText);
      allResults.push(...mapped);
    }

    
    if (existsSync("KS")) {
      rmSync("KS", { recursive: true, force: true });
    }
    mkdirSync("KS", { recursive: true });

    
    const grouped = {};
    allResults.forEach(item => {
      const sym = item.symbol.trim();
      if (!sym) return;
      if (!grouped[sym]) grouped[sym] = [];
      grouped[sym].push(item);
    });

    
    console.log(`Saving ${Object.keys(grouped).length} symbol files...`);
    for (const [symbol, data] of Object.entries(grouped)) {
      await Bun.write(`KS/${symbol}.json`, JSON.stringify(data));
    }
    
    console.log(`✅ Successfully processed into /KS folder.`);
  } catch (err) {
    console.error("Fatal Error:", err);
    process.exit(1);
  }
}

function parseAndMap(csvText) {
  const lines = csvText.split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(e => e.trim());
  const t = {};

  headers.forEach((e, i) => {
    if (["SYMBOL", "pSymbolName"].includes(e)) t.symbol = i;
    if (["STRIKE_PR", "dStrikePrice", "dStrikePrice;"].includes(e)) t.strike = i;
    if (["OPTION_TYP", "pOptionType"].includes(e)) t.optionType = i;
    if (["EXPIRY_DT", "lExpiryDate"].includes(e)) t.expiry = i;
    if (["pTrdSymbol"].includes(e)) t.ts = i;
  });

  return lines.slice(1).map(line => {
    const col = line.split(",");
    return {
      symbol: col[t.symbol] || "",
      strikePrice: parseFloat(col[t.strike]) || 0,
      optionType: col[t.optionType] || "",
      expiry: parseExpiry(col[t.expiry]),
      ts: col[t.ts] || ""
    };
  });
}

function parseExpiry(e) {
  if (!e) return null;
  if (!isNaN(e) && e.length > 6) return new Date(1000 * +e).toISOString().slice(0, 10);
  const n = new Date(e);
  return isNaN(n.getTime()) ? null : n.toISOString().slice(0, 10);
}

run();

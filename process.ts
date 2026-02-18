// process.js
const TOKEN = Bun.env.KOTAK_TOKEN;
const BASE_URL = "https://cis.kotaksecurities.com";

if (!TOKEN) {
  console.error("❌ KOTAK_TOKEN is missing! check your GitHub Secrets mapping.");
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

    // 2. Process each CSV URL
    for (const url of filePaths) {
      console.log(`Fetching: ${url}`);
      const csvText = await (await fetch(url)).text();
      const mapped = parseAndMap(csvText);
      allResults.push(...mapped);
    }

    // 3. Save as JSON (Easier for your frontend to fetch and put into IndexedDB)
    await Bun.write("processed_data.json", JSON.stringify(allResults));
    
    console.log(`✅ Successfully processed ${allResults.length} rows.`);
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

  // Your dynamic column detection logic
  headers.forEach((e, i) => {
    if (["SYMBOL", "pSymbolName"].includes(e)) t.symbol = i;
    if (["STRIKE_PR", "dStrikePrice", "dStrikePrice;"].includes(e)) t.strike = i;
    if (["OPTION_TYP", "pOptionType"].includes(e)) t.optionType = i;
    if (["EXPIRY_DT", "lExpiryDate"].includes(e)) t.expiry = i;
  });

  return lines.slice(1).map(line => {
    const col = line.split(",");
    return {
      symbol: col[t.symbol] || "",
      strikePrice: parseFloat(col[t.strike]) || 0,
      optionType: col[t.optionType] || "",
      expiry: parseExpiry(col[t.expiry]),
      // We exclude 'raw' here to keep the file size small for GitHub Pages
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

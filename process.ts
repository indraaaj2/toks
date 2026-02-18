// process.ts

const TOKEN = Bun.env.KOTAK_TOKEN;
const BASE_URL = "https://cis.kotaksecurities.com";

console.log(TOKEN)

if (!TOKEN) {
  console.error("❌ KOTAK_TOKEN is missing in environment variables");
  process.exit(1);
}

async function updateData() {
  try {
    // 1. Get the file paths from the Kotak API
    const response = await fetch(`${BASE_URL}/script-details/1.0/masterscrip/file-paths`, {
      headers: { 'Authorization': TOKEN }
    });

    const json = await response.json();
    
    // 2. Filter for bse_fo and nse_fo as per your logic
    const filePaths = json.data.filesPaths.filter((path: string) =>
      ["bse_fo", "nse_fo"].some((key) => path.includes(key))
    );

    console.log(`Found ${filePaths.length} files to process.`);

    // 3. Fetch and combine the CSV content
    let combinedCsv = "";
    for (const path of filePaths) {
      console.log(`Fetching: ${path}`);
      const csvRes = await fetch(path);
      const csvText = await csvRes.text();
      combinedCsv += csvText + "\n";
    }

    // 4. Save to the repository root
    await Bun.write("processed_data.csv", combinedCsv);
    console.log("✅ Successfully saved processed_data.csv");

  } catch (error) {
    console.error("Error processing data:", error);
    process.exit(1);
  }
}

updateData();

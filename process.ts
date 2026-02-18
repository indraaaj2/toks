// process.ts
const file = Bun.file("input_data.csv");
const text = await file.text();

// Simple CSV processing logic
const lines = text.split("\n");
const processedLines = lines.map(line => {
  const columns = line.split(",");
  if (columns[0]) columns[0] = columns[0].toUpperCase(); // Example: Uppercase first column
  return columns.join(",");
});

const output = processedLines.join("\n");
await Bun.write("processed_data.csv", output);

console.log("✅ CSV processed and saved as processed_data.csv");

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const results = {};

function peekExcel(dirName) {
  const dirPath = path.join(process.cwd(), "public", "assets", dirName);
  if (!fs.existsSync(dirPath)) {
    results[dirName] = "Directory not found";
    return;
  }
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.xlsx'));
  if (files.length === 0) {
    results[dirName] = "No excel files";
    return;
  }
  
  const filePath = path.join(dirPath, files[0]);
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  results[dirName] = {
    headers: data[0] || [],
    row1: data[1] || [],
    row2: data[2] || [],
  };
}

peekExcel("pelaporan_penyuapan");
peekExcel("pelaporan_ppg");
peekExcel("pelaporan_survey");

fs.writeFileSync("peek.json", JSON.stringify(results, null, 2), "utf-8");

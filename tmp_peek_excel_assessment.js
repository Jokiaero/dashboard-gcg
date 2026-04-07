const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

function peekExcel(dirName) {
  const dirPath = path.join(process.cwd(), "public", "assets", dirName);
  if (!fs.existsSync(dirPath)) {
    console.log(`[${dirName}] Directory not found`);
    return;
  }
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.xlsx'));
  if (files.length === 0) {
    console.log(`[${dirName}] No excel files`);
    return;
  }
  
  const filePath = path.join(dirPath, files[0]);
  const workbook = XLSX.readFile(filePath);
  const sheet0 = workbook.Sheets[workbook.SheetNames[0]];
  const sheet1 = workbook.SheetNames[1] ? workbook.Sheets[workbook.SheetNames[1]] : null;
  
  const data0 = XLSX.utils.sheet_to_json(sheet0, { header: 1 });
  console.log(`\n======== [${dirName}] Sheet 1 ========`);
  console.log(`Headers:`, data0[0] || []);
  console.log(`Row 1:`, data0[1] || []);
  
  if (sheet1) {
    const data1 = XLSX.utils.sheet_to_json(sheet1, { header: 1 });
    console.log(`\n======== [${dirName}] Sheet 2 ========`);
    console.log(`Headers:`, data1[0] || []);
    console.log(`Row 1:`, data1[1] || []);
  } else {
    console.log(`\n======== [${dirName}] Sheet 2 is missing! ========`);
  }
}

peekExcel("assessment");

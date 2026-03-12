const XLSX = require('xlsx');

const file = process.env.EXCEL_FILE;
if (!file) {
  throw new Error('Set EXCEL_FILE terlebih dahulu.');
}

const workbook = XLSX.readFile(file, { cellDates: false });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

console.log('SHEET:', sheetName);
console.log('TOTAL_ROWS:', rows.length);
if (rows.length > 0) {
  console.log('HEADERS:', Object.keys(rows[0]));
  console.log('ROW_1:', rows[0]);
  if (rows.length > 1) {
    console.log('ROW_2:', rows[1]);
  }
}

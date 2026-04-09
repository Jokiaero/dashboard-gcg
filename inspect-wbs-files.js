const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const wbsDir = 'D:\\Projects\\dashboard-gcg\\public\\assets\\pelaporan_wbs';
const files = fs.readdirSync(wbsDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

console.log('Files ditemukan:', files.length);

files.forEach(file => {
  const filePath = path.join(wbsDir, file);
  const stat = fs.statSync(filePath);
  const workbook = XLSX.readFile(filePath);
  console.log(`\n=== ${file} ===`);
  console.log('File size:', stat.size, 'bytes');
  console.log('Modified:', stat.mtime);
  console.log('Sheets:', workbook.SheetNames);
  
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
  
  console.log('Total rows:', rows.length);
  console.log('Header row:', rows[0]);
  if (rows.length > 1) {
    console.log('Second row:', rows[1]);
    console.log('Third row:', rows[2]);
  }
});

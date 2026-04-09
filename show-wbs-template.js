const XLSX = require('xlsx');

console.log('=== STRUKTUR TEMPLATE YANG TERBACA SISTEM ===\n');

const grafik = XLSX.readFile('public/assets/pelaporan_wbs/Grafik_Laporan_WBS.xlsx');
const grafik_sheet = grafik.Sheets[grafik.SheetNames[0]];
const grafik_rows = XLSX.utils.sheet_to_json(grafik_sheet, { header: 1, defval: '' });

console.log('1. FILE: Grafik_Laporan_WBS.xlsx (UNTUK CHART)');
console.log('   Kolom yang dibutuhkan:');
grafik_rows[0].forEach((col, i) => {
  console.log('   - Kolom ' + i + ': "' + col + '"');
});
console.log('\n   Data (5 tahun):');
for (let i = 1; i < grafik_rows.length; i++) {
  console.log('   - ' + grafik_rows[i].join(' | '));
}

console.log('\n\n=== FORMAT YANG DIHARAPKAN SISTEM ===\n');
console.log('Untuk chart tahunan (Grafik WBS), file harus memiliki:');
console.log('Kolom 1: Tahun (2021, 2022, dst)');
console.log('Kolom 2: Jumlah Laporan WBS');
console.log('Kolom 3: Status Laporan Ditindaklanjuti\n');

const template = XLSX.readFile('public/assets/pelaporan_wbs/Template_Laporan_WBS.xlsx');
const template_sheet = template.Sheets[template.SheetNames[0]];
const template_rows = XLSX.utils.sheet_to_json(template_sheet, { header: 1, defval: '' });

console.log('2. FILE: Template_Laporan_WBS.xlsx (UNTUK DETAIL LAPORAN)');
console.log('   Struktur (ini adalah template untuk detail individual):');
template_rows[0].forEach((col, i) => {
  console.log('   - Kolom ' + i + ': "' + col + '"');
});
console.log('\n   Ini adalah format DETAIL laporan per-item, bukan AGGREGAT tahunan.');

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Buat template untuk chart WBS tahunan
const wb = XLSX.utils.book_new();

// Data template dengan instruksi
const templateData = [
  ['Tahun', 'Laporan WBS', 'Status Laporan Ditindaklanjuti'],
  [2021, 5, 3],
  [2022, 8, 6],
  [2023, 12, 9],
  [2024, 15, 11],
  [2025, 20, 14],
];

const ws = XLSX.utils.aoa_to_sheet(templateData);

// Set column widths
ws['!cols'] = [
  { wch: 12 },  // Tahun
  { wch: 16 },  // Laporan WBS
  { wch: 28 },  // Status Laporan Ditindaklanjuti
];

// Style header
['A1', 'B1', 'C1'].forEach(cell => {
  if (!ws[cell]) ws[cell] = {};
  ws[cell].s = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '366092' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  };
});

XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
XLSX.writeFile(wb, 'Template_Laporan_WBS_Tahunan.xlsx');

console.log('Template created: Template_Laporan_WBS_Tahunan.xlsx');
console.log('\nStruktur:');
console.log('- Baris 1: Header (Tahun, Laporan WBS, Status Laporan Ditindaklanjuti)');
console.log('- Baris 2-6: Sample data untuk tahun 2021-2025');
console.log('\nCatatan:');
console.log('- Kolom "Tahun" harus berisi angka tahun (2021, 2022, dst)');
console.log('- Kolom "Laporan WBS" harus berisi jumlah laporan (angka)');
console.log('- Kolom "Status Laporan Ditindaklanjuti" harus berisi jumlah yang ditindaklanjuti (angka)');

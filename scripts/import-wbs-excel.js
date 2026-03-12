const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const os = require('os');
const XLSX = require('xlsx');

const prisma = new PrismaClient();
const DEFAULT_WBS_EXCEL_FILE = path.join(
  os.homedir(),
  'Downloads',
  'DASHBOARD GCG',
  'DASHBOARD GCG',
  '3. PELAPORAN',
  'LAPORAN WBS (AKSES TERBATAS)',
  'Grafik Laporan WBS.xlsx'
);

function getValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return row[key];
    }
  }
  return null;
}

function toNullableString(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function normalizeRow(row) {
  const tahun = toNullableString(getValue(row, ['Tahun', 'tahun', 'TAHUN']));
  const laporanWbs = toNullableString(getValue(row, ['Laporan WBS', 'laporan_wbs', 'JUMLAH_LAPORAN_WBS']));
  const ditindaklanjuti = toNullableString(
    getValue(row, ['Status Laporan Ditindaklanjuti', 'status_laporan_ditindaklanjuti', 'DITINDAKLANJUTI'])
  );

  if (!tahun) {
    return null;
  }

  return {
    tahun,
    pers_no: laporanWbs,
    status_approved: ditindaklanjuti,
    department: 'WBS',
    divisi: 'WBS',
  };
}

async function main() {
  const excelFile = process.env.WBS_EXCEL_FILE
    ? path.resolve(process.cwd(), process.env.WBS_EXCEL_FILE)
    : DEFAULT_WBS_EXCEL_FILE;

  if (!fs.existsSync(excelFile)) {
    throw new Error(`File Excel WBS tidak ditemukan: ${excelFile}`);
  }

  console.log(`Membaca file Excel WBS: ${excelFile}`);
  const workbook = XLSX.readFile(excelFile, { cellDates: false });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('File Excel WBS tidak memiliki sheet.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Data Excel WBS kosong. Pastikan baris header dan data tersedia.');
  }

  const records = rows.map(normalizeRow).filter(Boolean);

  if (records.length === 0) {
    throw new Error('Tidak ada baris valid untuk diimport. Pastikan kolom Tahun terisi.');
  }

  const deleted = await prisma.dataLaporan.deleteMany({
    where: {
      OR: [{ department: 'WBS' }, { divisi: 'WBS' }],
    },
  });

  await prisma.dataLaporan.createMany({ data: records });

  console.log(
    JSON.stringify(
      {
        sheet: sheetName,
        deletedWbsRows: deleted.count,
        importedWbsRows: records.length,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

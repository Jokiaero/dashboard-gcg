const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const prisma = new PrismaClient();
const DEFAULT_EXCEL_FILE = path.join(__dirname, '..', 'prisma', 'data-profil-risiko.xlsx');

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

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeTrend(value) {
  const text = String(value || '').trim().toLowerCase();
  if (['naik', 'up', 'meningkat'].includes(text)) return 'up';
  if (['turun', 'down', 'menurun'].includes(text)) return 'down';
  if (['tetap', 'same', 'stabil'].includes(text)) return 'same';
  return text ? text : 'same';
}

function normalizeLevel(value, impact, likelihood) {
  const text = String(value || '').trim();
  if (text) return text;

  if (impact === null || likelihood === null) return 'Medium';
  const score = impact * likelihood;
  if (score >= 20) return 'Extreme';
  if (score >= 12) return 'High';
  if (score >= 6) return 'Medium';
  return 'Low';
}

function normalizeRow(row, index) {
  const impact = toNumber(getValue(row, ['Impact', 'Dampak', 'impact', 'IMPACT']));
  const likelihood = toNumber(getValue(row, ['Likelihood', 'Kemungkinan', 'likelihood', 'LIKELIHOOD']));

  return {
    tahun: toNullableString(getValue(row, ['Tahun', 'tahun', 'Periode', 'periode'])),
    // Simpan nilai numerik pada kolom yang sudah ada di skema saat ini.
    pers_no: impact !== null ? String(impact) : null,
    nik: likelihood !== null ? String(likelihood) : null,
    // ID risiko
    kode_jabatan: toNullableString(getValue(row, ['ID', 'id', 'Risk ID', 'RiskId', 'Kode Risiko'])) || `R${String(index + 1).padStart(2, '0')}`,
    // Nama risiko
    jabatan_lengkap: toNullableString(getValue(row, ['Risk', 'Risiko', 'Risk Event', 'Nama Risiko'])) || 'Risiko Tanpa Nama',
    // Level risiko
    status_approved: normalizeLevel(getValue(row, ['Level', 'Risk Level', 'Tingkat Risiko']), impact, likelihood),
    // Owner risiko
    divisi: toNullableString(getValue(row, ['Owner', 'Pemilik Risiko', 'Risk Owner'])) || 'Unknown',
    // Tren risiko
    direktorat: normalizeTrend(getValue(row, ['Trend', 'Tren'])),
    // Penanda tipe data
    department: 'RISK_PROFILE',
  };
}

async function main() {
  const excelFile = process.env.RISK_EXCEL_FILE
    ? path.resolve(process.cwd(), process.env.RISK_EXCEL_FILE)
    : DEFAULT_EXCEL_FILE;

  if (!fs.existsSync(excelFile)) {
    throw new Error(`File Excel Profil Risiko tidak ditemukan: ${excelFile}`);
  }

  console.log(`Membaca file Excel Profil Risiko: ${excelFile}`);
  const workbook = XLSX.readFile(excelFile, { cellDates: false });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('File Excel tidak memiliki sheet.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Data Excel Profil Risiko kosong.');
  }

  const records = rows.map((row, index) => normalizeRow(row, index));

  // Hapus data profil risiko lama saja, jangan ganggu data lain (mis. WBS).
  await prisma.dataLaporan.deleteMany({ where: { department: 'RISK_PROFILE' } });

  const chunkSize = 500;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    await prisma.dataLaporan.createMany({ data: chunk });
  }

  console.log(`Berhasil import ${records.length} baris Profil Risiko dari sheet: ${sheetName}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const prisma = new PrismaClient();
const DEFAULT_EXCEL_FILE = path.join(__dirname, '..', 'prisma', 'data-laporan.xlsx');

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

function toNullableDate(value) {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, Math.floor(parsed.S || 0)));
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeRow(row) {
  const tahunValue = getValue(row, ['tahun', 'TAHUN', 'Tahun']);
  const laporanWbsValue = getValue(row, ['Laporan WBS', 'laporan_wbs', 'JUMLAH_LAPORAN_WBS']);
  const tindakLanjutValue = getValue(row, [
    'Status Laporan Ditindaklanjuti',
    'status_laporan_ditindaklanjuti',
    'DITINDAKLANJUTI',
  ]);

  return {
    tahun: toNullableString(tahunValue),
    // Dipakai untuk menyimpan nilai jumlah laporan WBS dari file rekap.
    pers_no: toNullableString(getValue(row, ['pers_no', 'PERS_NO', 'persNo', 'Laporan WBS', 'laporan_wbs'])),
    nik: toNullableString(getValue(row, ['nik', 'NIK'])),
    nama: toNullableString(getValue(row, ['nama', 'NAMA'])),
    jabatan: toNullableString(getValue(row, ['jabatan', 'JABATAN'])),
    ou: toNullableString(getValue(row, ['ou', 'OU'])),
    file: toNullableString(getValue(row, ['file', 'FILE'])),
    // Dipakai untuk menyimpan jumlah laporan yang sudah ditindaklanjuti.
    status_approved: toNullableString(
      getValue(row, [
        'status_approved',
        'STATUS_APPROVED',
        'status',
        'Status Laporan Ditindaklanjuti',
        'status_laporan_ditindaklanjuti',
      ])
    ),
    site: toNullableString(getValue(row, ['site', 'SITE'])),
    approved_by: toNullableString(getValue(row, ['approved_by', 'APPROVED_BY'])),
    approved_date: toNullableDate(getValue(row, ['approved_date', 'APPROVED_DATE'])),
    updated_by: toNullableString(getValue(row, ['updated_by', 'UPDATED_BY'])),
    updated_date: toNullableDate(getValue(row, ['updated_date', 'UPDATED_DATE'])),
    generated_by: toNullableString(getValue(row, ['generated_by', 'GENERATED_BY'])),
    generated_date: toNullableDate(getValue(row, ['generated_date', 'GENERATED_DATE'])),
    sign_loc: toNullableString(getValue(row, ['sign_loc', 'SIGN_LOC'])),
    kode_jabatan: toNullableString(getValue(row, ['kode_jabatan', 'KODE_JABATAN'])),
    jabatan_lengkap: toNullableString(getValue(row, ['jabatan_lengkap', 'JABATAN_LENGKAP'])),
    dept_id: toNullableString(getValue(row, ['dept_id', 'DEPT_ID'])),
    department: toNullableString(getValue(row, ['department', 'DEPARTMENT'])) || (laporanWbsValue !== null ? 'WBS' : null),
    div_id: toNullableString(getValue(row, ['div_id', 'DIV_ID'])),
    divisi: toNullableString(getValue(row, ['divisi', 'DIVISI'])) || (tindakLanjutValue !== null ? 'WBS' : null),
    direktorat_id: toNullableString(getValue(row, ['direktorat_id', 'DIREKTORAT_ID'])),
    direktorat: toNullableString(getValue(row, ['direktorat', 'DIREKTORAT'])),
    work_contract_id: toNullableString(getValue(row, ['work_contract_id', 'WORK_CONTRACT_ID'])),
    work_contract: toNullableString(getValue(row, ['work_contract', 'WORK_CONTRACT'])),
  };
}

async function main() {
  const excelFile = process.env.EXCEL_FILE
    ? path.resolve(process.cwd(), process.env.EXCEL_FILE)
    : DEFAULT_EXCEL_FILE;

  if (!fs.existsSync(excelFile)) {
    throw new Error(`File Excel tidak ditemukan: ${excelFile}`);
  }

  console.log(`Membaca file Excel: ${excelFile}`);
  const workbook = XLSX.readFile(excelFile, { cellDates: false });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('File Excel tidak memiliki sheet.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Data Excel kosong. Pastikan baris header dan data tersedia.');
  }

  const records = rows.map(normalizeRow);

  await prisma.dataLaporan.deleteMany();
  const chunkSize = 500;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    await prisma.dataLaporan.createMany({ data: chunk });
  }

  console.log(`Berhasil import ${records.length} baris dari sheet: ${sheetName}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

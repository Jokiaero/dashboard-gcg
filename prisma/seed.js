const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const DEFAULT_SEED_FILE = path.join(__dirname, 'data-laporan.json');

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
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeRow(row) {
    return {
        tahun: toNullableString(getValue(row, ['tahun', 'TAHUN'])),
        pers_no: toNullableString(getValue(row, ['pers_no', 'PERS_NO', 'persNo'])),
        nik: toNullableString(getValue(row, ['nik', 'NIK'])),
        nama: toNullableString(getValue(row, ['nama', 'NAMA'])),
        jabatan: toNullableString(getValue(row, ['jabatan', 'JABATAN'])),
        ou: toNullableString(getValue(row, ['ou', 'OU'])),
        file: toNullableString(getValue(row, ['file', 'FILE'])),
        status_approved: toNullableString(getValue(row, ['status_approved', 'STATUS_APPROVED', 'status'])),
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
        department: toNullableString(getValue(row, ['department', 'DEPARTMENT'])),
        div_id: toNullableString(getValue(row, ['div_id', 'DIV_ID'])),
        divisi: toNullableString(getValue(row, ['divisi', 'DIVISI'])),
        direktorat_id: toNullableString(getValue(row, ['direktorat_id', 'DIREKTORAT_ID'])),
        direktorat: toNullableString(getValue(row, ['direktorat', 'DIREKTORAT'])),
        work_contract_id: toNullableString(getValue(row, ['work_contract_id', 'WORK_CONTRACT_ID'])),
        work_contract: toNullableString(getValue(row, ['work_contract', 'WORK_CONTRACT'])),
    };
}

async function main() {
    const seedFile = process.env.SEED_FILE
        ? path.resolve(process.cwd(), process.env.SEED_FILE)
        : DEFAULT_SEED_FILE;

    if (!fs.existsSync(seedFile)) {
        throw new Error(`File data seed tidak ditemukan: ${seedFile}. Buat file JSON berisi array data laporan.`);
    }

    console.log(`Membaca data dari: ${seedFile}`);
    const raw = fs.readFileSync(seedFile, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
        throw new Error('Format seed harus berupa array JSON.');
    }

    const records = parsed.map(normalizeRow);

    console.log(`Jumlah data ditemukan: ${records.length}`);

    await prisma.dataLaporan.deleteMany();
    console.log('Data lama pada tabel data_laporan dihapus.');

    // Insert bertahap agar stabil untuk data besar.
    const chunkSize = 500;
    for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        await prisma.dataLaporan.createMany({ data: chunk });
    }

    console.log(`Berhasil import ${records.length} data laporan.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

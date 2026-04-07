const mysql = require("mysql2/promise");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SOURCE_CONFIG = {
  host: process.env.MYSQL_SOURCE_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_SOURCE_PORT || 3306),
  user: process.env.MYSQL_SOURCE_USER || "root",
  password: process.env.MYSQL_SOURCE_PASSWORD || "",
  database: process.env.MYSQL_SOURCE_DATABASE || "dashboard_gcg",
  supportBigNumbers: true,
  bigNumberStrings: true,
};

const DEFAULT_SETTINGS = {
  dashboardTitle: "DASHBOARD GCG",
  dashboardSubtitle: "Meningkatkan Efektivitas dan Efisiensi Pengawasan GCG",
  kajian2025: "100%",
  kajian2024: "98%",
  isoNote: "Sertifikasi SNI ISO 37001:2016 tersedia dan dapat diakses langsung.",
  penghargaanNote:
    "The Most Committed GRC Leader 2025 untuk Direktur Utama SMBR.\nTOP GRC Awards 2025 #4Stars untuk kategori Perusahaan.\nPenghargaan lainnya di tahun sebelumnya.",
  gcgScoresJson: JSON.stringify([
    { year: "2020", value: 92.47 },
    { year: "2021", value: 93.85 },
    { year: "2022", value: 94.9 },
    { year: "2023", value: 88.51 },
    { year: "2024", value: 92.84 },
  ]),
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBigInt(value, fallback = 0n) {
  if (typeof value === "bigint") return value;
  if (value === undefined || value === null || value === "") return fallback;
  try {
    return BigInt(value);
  } catch {
    return fallback;
  }
}

function toDate(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
}

function toNullableString(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function toRequiredString(value, fallback = "") {
  const text = toNullableString(value);
  return text === null ? fallback : text;
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "bigint") return value !== 0n;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (["1", "true", "t", "yes", "y"].includes(lowered)) return true;
    if (["0", "false", "f", "no", "n", ""].includes(lowered)) return false;
  }
  return false;
}

async function fetchRows(connection, tableName) {
  const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
  return rows;
}

async function sourceCounts(connection) {
  const tables = [
    "users",
    "audit_logs",
    "dashboard_settings",
    "data_laporan",
    "uploaded_documents",
    "uploaded_documents_recycle",
  ];

  const result = {};
  for (const table of tables) {
    const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
    result[table] = Number(rows[0].total || 0);
  }

  return result;
}

async function targetCounts() {
  const [
    users,
    auditLogs,
    dashboardSettings,
    dataLaporan,
    uploadedDocuments,
    uploadedDocumentsRecycle,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.auditLog.count(),
    prisma.dashboardSettings.count(),
    prisma.dataLaporan.count(),
    prisma.uploadedDocument.count(),
    prisma.uploadedDocumentRecycle.count(),
  ]);

  return {
    users,
    audit_logs: auditLogs,
    dashboard_settings: dashboardSettings,
    data_laporan: dataLaporan,
    uploaded_documents: uploadedDocuments,
    uploaded_documents_recycle: uploadedDocumentsRecycle,
  };
}

function mapUsers(rows) {
  return rows.map((row) => ({
    id: toNumber(row.id),
    username: toRequiredString(row.username),
    password: toRequiredString(row.password),
    role: toRequiredString(row.role, "USER"),
    profileImage: toNullableString(row.profile_image ?? row.profileImage),
    createdAt: toDate(row.createdAt ?? row.created_at, new Date()),
  }));
}

function mapAuditLogs(rows) {
  return rows.map((row) => ({
    id: toNumber(row.id),
    action: toRequiredString(row.action),
    username: toRequiredString(row.username),
    details: toNullableString(row.details),
    createdAt: toDate(row.createdAt ?? row.created_at, new Date()),
  }));
}

function mapDashboardSettings(rows) {
  return rows.map((row) => ({
    id: toNumber(row.id, 1),
    dashboardTitle: toRequiredString(
      row.dashboard_title ?? row.dashboardTitle,
      DEFAULT_SETTINGS.dashboardTitle
    ),
    dashboardSubtitle: toRequiredString(
      row.dashboard_subtitle ?? row.dashboardSubtitle,
      DEFAULT_SETTINGS.dashboardSubtitle
    ),
    kajian2025: toRequiredString(
      row.kajian_2025 ?? row.kajian2025,
      DEFAULT_SETTINGS.kajian2025
    ),
    kajian2024: toRequiredString(
      row.kajian_2024 ?? row.kajian2024,
      DEFAULT_SETTINGS.kajian2024
    ),
    isoNote: toRequiredString(row.iso_note ?? row.isoNote, DEFAULT_SETTINGS.isoNote),
    penghargaanNote: toRequiredString(
      row.penghargaan_note ?? row.penghargaanNote,
      DEFAULT_SETTINGS.penghargaanNote
    ),
    penghargaanUrl: toNullableString(row.penghargaan_url ?? row.penghargaanUrl),
    regulasiOrder: toNullableString(row.regulasi_order ?? row.regulasiOrder),
    softstructureOrder: toNullableString(
      row.softstructure_order ?? row.softstructureOrder
    ),
    kajianOrder: toNullableString(row.kajian_order ?? row.kajianOrder),
    gcgScoresJson: toRequiredString(
      row.gcg_scores_json ?? row.gcgScoresJson,
      DEFAULT_SETTINGS.gcgScoresJson
    ),
    updatedAt: toDate(row.updated_at ?? row.updatedAt, new Date()),
  }));
}

function mapDataLaporan(rows) {
  return rows.map((row) => ({
    id: toNumber(row.id),
    tahun: toNullableString(row.tahun),
    pers_no: toNullableString(row.pers_no),
    nik: toNullableString(row.nik),
    nama: toNullableString(row.nama),
    jabatan: toNullableString(row.jabatan),
    ou: toNullableString(row.ou),
    file: toNullableString(row.file),
    status_approved: toNullableString(row.status_approved),
    site: toNullableString(row.site),
    approved_by: toNullableString(row.approved_by),
    approved_date: toDate(row.approved_date),
    updated_by: toNullableString(row.updated_by),
    updated_date: toDate(row.updated_date),
    generated_by: toNullableString(row.generated_by),
    generated_date: toDate(row.generated_date),
    sign_loc: toNullableString(row.sign_loc),
    kode_jabatan: toNullableString(row.kode_jabatan),
    jabatan_lengkap: toNullableString(row.jabatan_lengkap),
    dept_id: toNullableString(row.dept_id),
    department: toNullableString(row.department),
    div_id: toNullableString(row.div_id),
    divisi: toNullableString(row.divisi),
    direktorat_id: toNullableString(row.direktorat_id),
    direktorat: toNullableString(row.direktorat),
    work_contract_id: toNullableString(row.work_contract_id),
    work_contract: toNullableString(row.work_contract),
    createdAt: toDate(row.createdAt ?? row.created_at, new Date()),
  }));
}

function mapUploadedDocuments(rows) {
  return rows.map((row) => ({
    id: toBigInt(row.id),
    category: toRequiredString(row.category),
    name: toRequiredString(row.name),
    originalName: toNullableString(row.original_name ?? row.originalName),
    url: toRequiredString(row.url),
    size: toBigInt(row.size, 0n),
    mimeType: toNullableString(row.mime_type ?? row.mimeType),
    uploadedBy: toNullableString(row.uploaded_by ?? row.uploadedBy),
    regulasiSlug: toNullableString(row.regulasi_slug ?? row.regulasiSlug),
    isDeleted: toBoolean(row.is_deleted ?? row.isDeleted),
    createdAt: toDate(row.created_at ?? row.createdAt, new Date()),
    updatedAt: toDate(row.updated_at ?? row.updatedAt, new Date()),
    deletedAt: toDate(row.deleted_at ?? row.deletedAt),
  }));
}

function mapUploadedDocumentsRecycle(rows) {
  return rows.map((row) => ({
    id: toBigInt(row.id),
    category: toRequiredString(row.category),
    name: toRequiredString(row.name),
    originalName: toNullableString(row.original_name ?? row.originalName),
    url: toRequiredString(row.url),
    size: toBigInt(row.size, 0n),
    mimeType: toNullableString(row.mime_type ?? row.mimeType),
    uploadedBy: toNullableString(row.uploaded_by ?? row.uploadedBy),
    regulasiSlug: toNullableString(row.regulasi_slug ?? row.regulasiSlug),
    deletedAt: toDate(row.deleted_at ?? row.deletedAt, new Date()),
    createdAt: toDate(row.created_at ?? row.createdAt, new Date()),
    updatedAt: toDate(row.updated_at ?? row.updatedAt, new Date()),
  }));
}

async function resetSequence(tableName) {
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"${tableName}"', 'id'),
      COALESCE((SELECT MAX(id) FROM "${tableName}"), 1),
      (SELECT COUNT(*) > 0 FROM "${tableName}")
    );
  `);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const mysqlConnection = await mysql.createConnection(SOURCE_CONFIG);

  try {
    console.log("[sync] Source MySQL config:", {
      host: SOURCE_CONFIG.host,
      port: SOURCE_CONFIG.port,
      user: SOURCE_CONFIG.user,
      database: SOURCE_CONFIG.database,
    });

    const source = {
      users: await fetchRows(mysqlConnection, "users"),
      auditLogs: await fetchRows(mysqlConnection, "audit_logs"),
      dashboardSettings: await fetchRows(mysqlConnection, "dashboard_settings"),
      dataLaporan: await fetchRows(mysqlConnection, "data_laporan"),
      uploadedDocuments: await fetchRows(mysqlConnection, "uploaded_documents"),
      uploadedDocumentsRecycle: await fetchRows(
        mysqlConnection,
        "uploaded_documents_recycle"
      ),
    };

    const sourceCount = await sourceCounts(mysqlConnection);
    const beforeTargetCount = await targetCounts();

    console.log("[sync] Source counts (MySQL):", sourceCount);
    console.log("[sync] Target counts BEFORE (PostgreSQL):", beforeTargetCount);

    if (dryRun) {
      console.log("[sync] Dry run mode: no data changes were applied.");
      return;
    }

    const mapped = {
      users: mapUsers(source.users),
      auditLogs: mapAuditLogs(source.auditLogs),
      dashboardSettings: mapDashboardSettings(source.dashboardSettings),
      dataLaporan: mapDataLaporan(source.dataLaporan),
      uploadedDocuments: mapUploadedDocuments(source.uploadedDocuments),
      uploadedDocumentsRecycle: mapUploadedDocumentsRecycle(
        source.uploadedDocumentsRecycle
      ),
    };

    await prisma.$transaction(async (tx) => {
      await tx.uploadedDocumentRecycle.deleteMany();
      await tx.uploadedDocument.deleteMany();
      await tx.dataLaporan.deleteMany();
      await tx.auditLog.deleteMany();
      await tx.dashboardSettings.deleteMany();
      await tx.user.deleteMany();

      if (mapped.users.length > 0) {
        await tx.user.createMany({ data: mapped.users });
      }
      if (mapped.auditLogs.length > 0) {
        await tx.auditLog.createMany({ data: mapped.auditLogs });
      }
      if (mapped.dashboardSettings.length > 0) {
        await tx.dashboardSettings.createMany({ data: mapped.dashboardSettings });
      }
      if (mapped.dataLaporan.length > 0) {
        await tx.dataLaporan.createMany({ data: mapped.dataLaporan });
      }
      if (mapped.uploadedDocuments.length > 0) {
        await tx.uploadedDocument.createMany({ data: mapped.uploadedDocuments });
      }
      if (mapped.uploadedDocumentsRecycle.length > 0) {
        await tx.uploadedDocumentRecycle.createMany({
          data: mapped.uploadedDocumentsRecycle,
        });
      }
    });

    await resetSequence("users");
    await resetSequence("audit_logs");
    await resetSequence("data_laporan");
    await resetSequence("uploaded_documents");
    await resetSequence("uploaded_documents_recycle");

    const afterTargetCount = await targetCounts();
    console.log("[sync] Target counts AFTER (PostgreSQL):", afterTargetCount);
    console.log("[sync] DONE: MySQL -> PostgreSQL sync completed.");
  } finally {
    await mysqlConnection.end();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[sync] FAILED:", error);
  process.exit(1);
});

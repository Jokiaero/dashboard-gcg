# Dokumentasi Teknis — Dashboard GCG PT Semen Baturaja

Sistem Informasi Terintegrasi untuk Pengelolaan Good Corporate Governance.

Dokumen struktur package dapat dilihat di `docs/struktur-package.md`.

---

## 1. Struktural & Spesifikasi Aplikasi

### 1.1 Deskripsi Sistem

**Dashboard GCG** adalah sistem informasi berbasis web yang dikembangkan untuk PT Semen Baturaja Tbk guna mendukung pengelolaan, pemantauan, dan pelaporan Good Corporate Governance (GCG) perusahaan secara data-driven dan interaktif.

### 1.2 Teknologi Stack

| Lapisan | Teknologi |
|---|---|
| Framework | **Next.js 15 (App Router)** |
| Bahasa | TypeScript |
| UI Framework | Custom Bootstrap 5 + Vanilla CSS |
| Database | **MySQL (via Laragon / Server Lokal)** |
| ORM | Prisma |
| Autentikasi | Iron-session (Secure Cookie-based) |
| Charting | Recharts |
| PDF Viewer | HTML `<iframe>` embed with PDF.js compatibility |

### 1.3 Struktur Proyek (Clean Architecture)

Proyek telah direstrukturisasi untuk meningkatkan modularitas dan skalabilitas:

- **`src/@types`**: Definisi tipe data global TypeScript.
- **`src/app/(groups)`**: Menggunakan *Route Groups* Next.js:
    - **`(dashboard)`**: Halaman utama, laporan, assessment, dan regulasi.
    - **`(admin)`**: Manajemen user, pengaturan, dan audit log.
    - **`(auth)`**: Login dan registrasi.
- **`src/components`**:
    - **`layout/`**: `Navbar`, `Sidebar`, dan `DashboardLayout`.
    - **`features/`**: Komponen spesifik per fitur (Laporan, Assessment, Admin).
    - **`shared/`**: Komponen UI dasar dan `Providers`.
- **`src/lib/`**: Utilitas database (Prisma), Session, Export PDF/Excel, dan Logger.

### 1.4 Aktor Sistem & Hak Akses (RBAC)

| Aktor | Identifier | Hak Akses |
|---|---|---|
| **SUPERADMIN** | `SUPERADMIN` | Kontrol penuh sistem, Manajemen User, & Audit Trail. |
| **VIP** | `USER_VIP` | Akses baca seluruh laporan, PDF, & grafik. Edit Dashboard. |
| **GUEST** | `GUEST` | View-only Dashboard & Regulasi. Dibatasi dari laporan detail. |

---

## 2. Diagram Sistem

### 2.1 Use Case Diagram

```mermaid
flowchart TD
    SUPERADMIN(["👤 SUPERADMIN"])
    VIP(["👤 USER_VIP"])
    GUEST(["👤 GUEST"])

    subgraph UC["Use Cases — Dashboard GCG"]
        UC1["Login / Logout"]
        UC2["Lihat Dashboard Utama"]
        UC3["Buka Regulasi (PDF Viewer)"]
        UC4["Buka Softstructure GCG (PDF Viewer)"]
        UC5["Lihat Laporan WBS"]
        UC6["Lihat Laporan Risiko Keuangan"]
        UC7["Lihat Laporan Monitoring Penyuapan"]
        UC8["Lihat Laporan PPG ke KPK"]
        UC9["Lihat Laporan Survey Awareness"]
        UC10["Lihat Kajian Internal"]
        UC11["Lihat Assessment GCG"]
        UC12["Lihat Sertifikasi ISO 37001 (PDF)"]
        UC13["Lihat Daftar Penghargaan"]
        UC14["Lihat & Pantau Audit Trail"]
        UC15["Kelola Pengguna (CRUD)"]
        UC16["Export Excel / PDF"]
    end

    GUEST --> UC1
    GUEST --> UC2
    GUEST --> UC3

    VIP --> UC1
    VIP --> UC2
    VIP --> UC3
    VIP --> UC4
    VIP --> UC5
    VIP --> UC6
    VIP --> UC7
    VIP --> UC8
    VIP --> UC9
    VIP --> UC10
    VIP --> UC11
    VIP --> UC12
    VIP --> UC13
    VIP --> UC16

    SUPERADMIN --> UC14
    SUPERADMIN --> UC15
    SUPERADMIN --> UC16
```

### 2.2 Alur Autentikasi (Sequence Diagram)

```mermaid
sequenceDiagram
    actor Pengguna
    participant Browser
    participant NextJS as "Next.js Server"
    participant DB as "MySQL (Prisma)"
    participant Session as "Iron Session"

    Pengguna->>Browser: Input username & password
    Browser->>NextJS: POST /api/auth/login
    NextJS->>DB: findUniqueUser(username)
    DB-->>NextJS: User (hashed_password, role)
    NextJS->>NextJS: bcrypt.compare(password, hash)
    alt Auth GAGAL
        NextJS-->>Browser: 401 Unauthorized
    else Auth BERHASIL
        NextJS->>Session: save({ id, username, role })
        NextJS->>DB: AuditLog.create("LOGIN")
        NextJS-->>Browser: 200 OK (Redirect)
    end
```

---

## 3. Panduan Operasional (Import Data)

Dashboard ini mendukung pembaruan data secara dinamis melalui file Excel.

### 3.1 Import Laporan Via CLI
Jika Anda ingin mengganti data secara massal melalui terminal:

*   **Laporan Umum**: `npm run import:excel` (Membaca file `prisma/data-laporan.xlsx`)
*   **Profil Risiko**: `npm run import:risk` (Membaca file `prisma/data-profil-risiko.xlsx`)
*   **WBS Proyek**: `npm run import:wbs` (Update data WBS spesifik)

### 3.2 Pembaruan Database
Jika melakukan perubahan pada `schema.prisma`:
```bash
npx prisma generate
npx prisma migrate dev --name nama_perubahan
```

---

## 4. Panduan Pengembangan

1.  **Instalasi**: `npm install`
2.  **Konfigurasi**: Sesuaikan `DATABASE_URL` di file `.env` (Format: `mysql://user:pass@localhost:3306/db_name`)
3.  **Run Development**: `npm run dev`
4.  **Build Production**: `npm run build && npm run start`

---

*Dokumentasi ini diperbarui secara berkala sesuai dengan perkembangan arsitektur sistem.*

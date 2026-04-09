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
| Framework | **Next.js 16 (App Router)** |
| Bahasa | TypeScript, Node.js |
| UI Framework | **Tailwind CSS v4**, Radix UI, Lucide React |
| Database | **PostgreSQL** |
| ORM | Prisma |
| Autentikasi | Iron-session (Secure Cookie-based), bcryptjs |
| Charting | Recharts |
| Integrasi File | xlsx (Excel), jsPDF (PDF), pdfjs-dist (Preview) |

### 1.3 Struktur Proyek

Proyek ini menggunakan arsitektur modular App Router:

- **`prisma/`**: Skema database (`schema.prisma`) dan script seed.
- **`public/`**: Aset statis dan direktori penyimpanan file mentah (`/documents`).
- **`scripts/`**: Script node untuk sinkronisasi database dan import Excel.
- **`src/app/`**: Root aplikasi Next.js:
    - **`(dashboard)`**: Halaman utama laporan dan assessment.
    - **`(admin)`**: Manajemen pengelolaan seluruh dokumen.
    - **`(auth)`**: Halaman login.
    - **`api/`**: Endpoint REST API internal.
- **`src/components/`**: Komponen React (`layout`, `features`, `shared`).
- **`src/lib/`**: Utilitas utama (Prisma Client, Iron-Session, export, logger, utils).

### 1.4 Aktor Sistem & Hak Akses (RBAC)

Sesuai dengan database model, sistem ini memiliki 3 level role:

| Aktor | Identifier | Hak Akses |
|---|---|---|
| **Administrator** | `ADMIN` | Akses penuh (CRUD pengguna, kelola/upload file dokumen, sinkronisasi DB, view logs). |
| **VIP** | `USER_VIP` | Akses baca laporan khusus / rahasia, export dokumen lengkap. |
| **User Biasa** | `USER` | Akses standar untuk melihat dashboard statistik umum dan dokumen publik. |

---

## 2. Diagram Sistem

### 2.1 Use Case Diagram

```mermaid
flowchart LR
    User(["User Biasa / VIP"])
    Admin(["Administrator"])

    subgraph System ["Dashboard GCG System"]
        UC1("Login ke Dashboard")
        UC2("Melihat Laporan GCG")
        UC3("Mengunduh Dokumen")
        UC4("Upload & Kelola Dokumen")
        UC5("Import Data Excel")
        UC6("Management Sinkronisasi DB")
        UC7("Lihat Audit Logs")
    end

    User --> UC1
    User --> UC2
    User --> UC3

    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    Admin --> UC5
    Admin --> UC6
    Admin --> UC7
```

### 2.2 Class Diagram (Database)

```mermaid
classDiagram
    direction TB
    class User {
        +Int id
        +String username
        +String password
        +String role
        +String profileImage
        +DateTime createdAt
    }
    class DataLaporan {
        +Int id
        +String file
        +String status_approved
        +DateTime createdAt
    }
    class AuditLog {
        +Int id
        +String action
        +String username
        +String details
        +DateTime createdAt
    }
    class UploadedDocument {
        +BigInt id
        +String category
        +String name
        +String url
        +DateTime createdAt
    }

    AuditLog "0..*" --> "1" User : tracks actions of
```

### 2.3 Flowchart Unggah Dokumen

```mermaid
flowchart TD
    A([Start]) --> B{User Login?}
    B -- Tidak --> C[Form Login] --> B
    B -- Ya --> D{Cek Tipe Role}
    D -- User / VIP --> E[Buka Halaman Dashboard]
    D -- Admin --> F[Buka Dashboard Admin]
    
    F --> G[Pilih Menu Kelola Dokumen]
    G --> H[Upload File PDF / Excel]
    H --> I{Validasi File}
    
    I -- Valid --> J[Simpan di DB & Storage]
    J --> K[Otomatis Generate Audit Log]
    K --> L[Tampilkan Pesan Sukses]
    
    I -- Tidak Valid --> M[Tampilkan Pesan Error]
    M --> H
    
    E --> N([Selesai])
    L --> N([Selesai])
```

### 2.4 Alur Autentikasi (Sequence Diagram)

```mermaid
sequenceDiagram
    actor Pengguna
    participant Browser
    participant NextJS as "Next.js Server"
    participant DB as "PostgreSQL (Prisma)"
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
2.  **Konfigurasi**: Sesuaikan `DATABASE_URL` di file `.env` (Format: `postgresql://user:pass@localhost:5432/db_name`)
3.  **Run Development**: `npm run dev`
4.  **Build Production**: `npm run build && npm run start`

---

*Dokumentasi ini diperbarui secara berkala sesuai dengan perkembangan arsitektur sistem.*

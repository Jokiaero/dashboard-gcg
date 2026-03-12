This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Replace Dummy Data With Real Data

The project now uses a seed importer from JSON (not random dummy generation).

1. Create `prisma/data-laporan.json` by copying `prisma/data-laporan.example.json`.
2. Fill it with your real data (array of objects).
3. Run migration if needed:

```bash
npx prisma migrate dev
```

4. Import your real data:

```bash
npm run seed
```

## Import Data Dari Excel (Replace Data Lama)

Jika Anda punya data laporan dalam file Excel (`.xlsx`), gunakan command ini untuk mengganti data lama:

```bash
npm run import:excel
```

Default file yang dibaca: `prisma/data-laporan.xlsx` (sheet pertama).

Jika file ada di lokasi lain (PowerShell):

```bash
$env:EXCEL_FILE="./path/to/file-anda.xlsx"; npm run import:excel
```

Catatan: command ini akan menghapus data lama di tabel `data_laporan` lalu mengisi data baru dari Excel.

## Import Laporan Profil Risiko Dari Excel

Untuk Profil Risiko, gunakan command berikut:

```bash
npm run import:risk
```

Default file yang dibaca: `prisma/data-profil-risiko.xlsx` (sheet pertama).

Jika file ada di lokasi lain (PowerShell):

```bash
$env:RISK_EXCEL_FILE="./path/to/file-profil-risiko.xlsx"; npm run import:risk
```

Catatan: command ini hanya mengganti data dengan `department = RISK_PROFILE` sehingga tidak menghapus data WBS.

Optional: use custom file path with `SEED_FILE`.

```bash
$env:SEED_FILE="./path/to/real-data.json"; npm run seed
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

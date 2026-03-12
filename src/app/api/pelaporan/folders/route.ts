import { NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function getPelaporanDirectoryPath() {
  const configuredPath = process.env.PELAPORAN_DIR?.trim();
  if (configuredPath) {
    return configuredPath;
  }

  return path.join(
    os.homedir(),
    "Downloads",
    "DASHBOARD GCG",
    "DASHBOARD GCG",
    "3. PELAPORAN"
  );
}

export async function GET() {
  const baseDir = getPelaporanDirectoryPath();

  try {
    const entries = await readdir(baseDir, { withFileTypes: true });
    const folders = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, "id"));

    return NextResponse.json({ folders });
  } catch (error) {
    console.error("Failed to read pelaporan folders", error);

    return NextResponse.json(
      {
        folders: [],
        error: "Folder pelaporan tidak ditemukan atau tidak dapat diakses.",
      },
      { status: 200 }
    );
  }
}

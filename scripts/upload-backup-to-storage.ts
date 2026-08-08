import { readFileSync } from "fs";
import { basename } from "path";
import { uploadObject } from "@/lib/storage";

// Companion to backup-db.sh: uploads a completed pg_dump file to the same
// S3-compatible bucket imaging already uses (STORAGE_* env vars), under a
// backups/ prefix so it doesn't collide with imaging object keys. Kept as
// a separate script rather than folded into backup-db.sh because the S3
// SDK call needs Node/TS, not bash.

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: tsx scripts/upload-backup-to-storage.ts <path-to-dump-file>");
    process.exitCode = 1;
    return;
  }

  const bytes = readFileSync(filePath);
  const key = `backups/${basename(filePath)}`;
  await uploadObject(key, bytes, "application/octet-stream");
  console.log(`Uploaded ${filePath} -> ${key}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

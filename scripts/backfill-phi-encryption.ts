import { PrismaClient } from "@prisma/client";
import { encryptPHI } from "@/lib/phiCrypto";

// One-time backfill for PHI columns written before that field's encryption
// coverage existed. `decryptPHI`/`decryptPHIMaybe` already tolerate
// unprefixed plaintext forever, so this is optional hardening, not a
// correctness fix — it closes the "still plaintext until next write" gap
// documented in COMPLIANCE.md rather than being required for the app to
// work. Idempotent: every field is only touched if it doesn't already start
// with the enc:v1: prefix, so re-running after partial completion is safe.

const db = new PrismaClient();
const PREFIX = "enc:v1:";
const isPlaintext = (v: string | null | undefined): v is string => !!v && !v.startsWith(PREFIX);

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  let scanned = 0;
  let encrypted = 0;

  const visitRecords = await db.visitRecord.findMany({
    select: { id: true, notes: true, diagnosis: true, prescription: true },
  });
  for (const row of visitRecords) {
    scanned++;
    const data: Record<string, string> = {};
    if (isPlaintext(row.notes)) data.notes = encryptPHI(row.notes);
    if (isPlaintext(row.diagnosis)) data.diagnosis = encryptPHI(row.diagnosis);
    if (isPlaintext(row.prescription)) data.prescription = encryptPHI(row.prescription);
    if (Object.keys(data).length > 0) {
      encrypted++;
      if (!dryRun) await db.visitRecord.update({ where: { id: row.id }, data });
    }
  }

  const followUps = await db.followUp.findMany({ select: { id: true, focusInstructions: true } });
  for (const row of followUps) {
    scanned++;
    if (isPlaintext(row.focusInstructions)) {
      encrypted++;
      if (!dryRun) {
        await db.followUp.update({
          where: { id: row.id },
          data: { focusInstructions: encryptPHI(row.focusInstructions) },
        });
      }
    }
  }

  const callLogs = await db.followUpCallLog.findMany({ select: { id: true, notes: true } });
  for (const row of callLogs) {
    scanned++;
    if (isPlaintext(row.notes)) {
      encrypted++;
      if (!dryRun) {
        await db.followUpCallLog.update({ where: { id: row.id }, data: { notes: encryptPHI(row.notes) } });
      }
    }
  }

  const labOrderItems = await db.labOrderItem.findMany({
    select: { id: true, resultValue: true, referenceRange: true },
  });
  for (const row of labOrderItems) {
    scanned++;
    const data: Record<string, string> = {};
    if (isPlaintext(row.resultValue)) data.resultValue = encryptPHI(row.resultValue);
    if (isPlaintext(row.referenceRange)) data.referenceRange = encryptPHI(row.referenceRange);
    if (Object.keys(data).length > 0) {
      encrypted++;
      if (!dryRun) await db.labOrderItem.update({ where: { id: row.id }, data });
    }
  }

  const imagingOrders = await db.imagingOrder.findMany({ select: { id: true, description: true } });
  for (const row of imagingOrders) {
    scanned++;
    if (isPlaintext(row.description)) {
      encrypted++;
      if (!dryRun) {
        await db.imagingOrder.update({ where: { id: row.id }, data: { description: encryptPHI(row.description) } });
      }
    }
  }

  const vitals = await db.vitals.findMany({ select: { id: true, bp: true } });
  for (const row of vitals) {
    scanned++;
    if (isPlaintext(row.bp)) {
      encrypted++;
      if (!dryRun) await db.vitals.update({ where: { id: row.id }, data: { bp: encryptPHI(row.bp) } });
    }
  }

  console.log(`${dryRun ? "[dry run] " : ""}scanned ${scanned} rows, ${encrypted} had plaintext PHI ${dryRun ? "that would be" : "and were"} encrypted.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });

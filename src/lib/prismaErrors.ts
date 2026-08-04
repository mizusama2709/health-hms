import { Prisma } from "@prisma/client";

// Detects a Prisma unique-constraint violation (P2002) on a specific field,
// so callers can turn it into a friendly message without a separate
// pre-check query. A pre-check like `db.user.findUnique({ where: { email } })`
// run before create() is itself an information leak when the column is
// globally unique but the check has no tenant scope: it reveals whether an
// email is registered anywhere in the system, not just within the caller's
// own tenant.
export function isUniqueConstraintViolation(error: unknown, field: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Boolean((error.meta?.target as string[] | undefined)?.includes(field))
  );
}

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateIndex
CREATE INDEX "Medicine_name_idx" ON "Medicine" USING GIN ("name" gin_trgm_ops);

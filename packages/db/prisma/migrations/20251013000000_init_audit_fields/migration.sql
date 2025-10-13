-- Drop existing foreign keys to update cascading behavior
ALTER TABLE "Credential" DROP CONSTRAINT IF EXISTS "Credential_userId_fkey";
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_userId_fkey";

-- User audit metadata
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "createdBy" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedBy" VARCHAR(255);

-- Credential audit metadata
ALTER TABLE "Credential"
  ADD COLUMN IF NOT EXISTS "createdBy" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedBy" VARCHAR(255);

-- Session business key + audit metadata
ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "createdBy" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "token" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedBy" VARCHAR(255);

UPDATE "Session" SET "token" = "refreshJti" WHERE "token" IS NULL;

ALTER TABLE "Session"
  ALTER COLUMN "token" SET NOT NULL;

DROP INDEX IF EXISTS "Session_refreshJti_key";
ALTER TABLE "Session" DROP COLUMN IF EXISTS "refreshJti";

-- MagicLink business key + audit metadata
ALTER TABLE "MagicLink"
  ADD COLUMN IF NOT EXISTS "createdBy" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "token" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedBy" VARCHAR(255);

UPDATE "MagicLink" SET "token" = "tokenHash" WHERE "token" IS NULL;

ALTER TABLE "MagicLink"
  ALTER COLUMN "token" SET NOT NULL;

DROP INDEX IF EXISTS "MagicLink_tokenHash_key";
ALTER TABLE "MagicLink" DROP COLUMN IF EXISTS "tokenHash";

-- Recreate foreign keys with cascading deletes
ALTER TABLE "Credential"
  ADD CONSTRAINT "Credential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- New business indexes
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
CREATE INDEX IF NOT EXISTS "Session_token_idx" ON "Session"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "MagicLink_token_key" ON "MagicLink"("token");
CREATE INDEX IF NOT EXISTS "MagicLink_email_idx" ON "MagicLink"("email");

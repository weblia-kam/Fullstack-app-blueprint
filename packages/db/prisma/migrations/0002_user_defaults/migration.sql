ALTER TABLE "User" ALTER COLUMN "firstName" SET DEFAULT '';
ALTER TABLE "User" ALTER COLUMN "lastName" SET DEFAULT '';

UPDATE "User" SET "firstName" = '' WHERE "firstName" IS NULL;
UPDATE "User" SET "lastName"  = '' WHERE "lastName"  IS NULL;

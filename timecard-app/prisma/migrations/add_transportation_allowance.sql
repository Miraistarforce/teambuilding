-- AlterTable
ALTER TABLE "Staff" ADD COLUMN "transportationAllowance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Staff" ADD COLUMN "hasTransportation" BOOLEAN NOT NULL DEFAULT false;
-- AlterTable
ALTER TABLE "DailyReport" ADD COLUMN "formData" TEXT;

-- CreateTable
CREATE TABLE "DailyReportFormat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" INTEGER NOT NULL,
    "fields" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyReportFormat_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyReportFormat_storeId_key" ON "DailyReportFormat"("storeId");

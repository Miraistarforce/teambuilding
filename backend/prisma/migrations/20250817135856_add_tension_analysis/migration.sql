-- CreateTable
CREATE TABLE "TensionAnalysis" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "staffId" INTEGER NOT NULL,
    "reportId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "tensionScore" REAL NOT NULL,
    "keywords" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TensionAnalysis_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TensionAnalysis_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DailyReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StaffTensionStats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "staffId" INTEGER NOT NULL,
    "avgScore" REAL NOT NULL,
    "stdDeviation" REAL NOT NULL,
    "dataCount" INTEGER NOT NULL,
    "lastUpdated" DATETIME NOT NULL,
    CONSTRAINT "StaffTensionStats_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TensionAlertSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" INTEGER NOT NULL,
    "alertThreshold" REAL NOT NULL DEFAULT 0.3,
    "consecutiveDays" INTEGER NOT NULL DEFAULT 3,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TensionAlertSettings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TensionAnalysis_reportId_key" ON "TensionAnalysis"("reportId");

-- CreateIndex
CREATE INDEX "TensionAnalysis_staffId_date_idx" ON "TensionAnalysis"("staffId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StaffTensionStats_staffId_key" ON "StaffTensionStats"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "TensionAlertSettings_storeId_key" ON "TensionAlertSettings"("storeId");

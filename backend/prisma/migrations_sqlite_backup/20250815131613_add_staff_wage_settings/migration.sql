-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Staff" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "hourlyWage" INTEGER NOT NULL,
    "holidayAllowance" INTEGER NOT NULL DEFAULT 0,
    "overtimeRate" REAL NOT NULL DEFAULT 1.25,
    "otherAllowance" INTEGER NOT NULL DEFAULT 0,
    "hireDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Staff_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Staff" ("createdAt", "hourlyWage", "id", "isActive", "name", "storeId", "updatedAt") SELECT "createdAt", "hourlyWage", "id", "isActive", "name", "storeId", "updatedAt" FROM "Staff";
DROP TABLE "Staff";
ALTER TABLE "new_Staff" RENAME TO "Staff";
CREATE UNIQUE INDEX "Staff_storeId_name_key" ON "Staff"("storeId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

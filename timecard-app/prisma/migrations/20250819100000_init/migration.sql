-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "managerPassword" TEXT NOT NULL,
    "ownerPassword" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "hourlyWage" INTEGER NOT NULL,
    "holidayAllowance" INTEGER NOT NULL DEFAULT 0,
    "overtimeRate" DOUBLE PRECISION NOT NULL DEFAULT 1.25,
    "otherAllowance" INTEGER NOT NULL DEFAULT 0,
    "hireDate" TIMESTAMP(3),
    "mbtiType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeRecord" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clockIn" TIMESTAMP(3),
    "clockOut" TIMESTAMP(3),
    "breakStart" TIMESTAMP(3),
    "breakEnd" TIMESTAMP(3),
    "totalBreak" INTEGER NOT NULL DEFAULT 0,
    "workMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakRecord" (
    "id" SERIAL NOT NULL,
    "timeRecordId" INTEGER NOT NULL,
    "breakStart" TIMESTAMP(3) NOT NULL,
    "breakEnd" TIMESTAMP(3),
    "minutes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BreakRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "audioUrl" TEXT,
    "textContent" TEXT,
    "summary" TEXT,
    "advice" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "formData" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReportComment" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "emoji" TEXT,
    "comment" TEXT,
    "hasBonus" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyReportComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentTemplate" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "template" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReportFormat" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "fields" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyReportFormat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TensionAnalysis" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "reportId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "tensionScore" DOUBLE PRECISION NOT NULL,
    "keywords" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TensionAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffTensionStats" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "avgScore" DOUBLE PRECISION NOT NULL,
    "stdDeviation" DOUBLE PRECISION NOT NULL,
    "dataCount" INTEGER NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffTensionStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TensionAlertSettings" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "alertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "consecutiveDays" INTEGER NOT NULL DEFAULT 3,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TensionAlertSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Store_companyId_name_key" ON "Store"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_storeId_name_key" ON "Staff"("storeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TimeRecord_staffId_date_key" ON "TimeRecord"("staffId", "date");

-- CreateIndex
CREATE INDEX "TimeRecord_date_idx" ON "TimeRecord"("date");

-- CreateIndex
CREATE INDEX "Interview_staffId_idx" ON "Interview"("staffId");

-- CreateIndex
CREATE INDEX "Interview_storeId_idx" ON "Interview"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_staffId_date_key" ON "DailyReport"("staffId", "date");

-- CreateIndex
CREATE INDEX "DailyReport_storeId_date_idx" ON "DailyReport"("storeId", "date");

-- CreateIndex
CREATE INDEX "DailyReportComment_reportId_idx" ON "DailyReportComment"("reportId");

-- CreateIndex
CREATE INDEX "CommentTemplate_storeId_idx" ON "CommentTemplate"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReportFormat_storeId_key" ON "DailyReportFormat"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "TensionAnalysis_reportId_key" ON "TensionAnalysis"("reportId");

-- CreateIndex
CREATE INDEX "TensionAnalysis_staffId_date_idx" ON "TensionAnalysis"("staffId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StaffTensionStats_staffId_key" ON "StaffTensionStats"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "TensionAlertSettings_storeId_key" ON "TensionAlertSettings"("storeId");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeRecord" ADD CONSTRAINT "TimeRecord_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakRecord" ADD CONSTRAINT "BreakRecord_timeRecordId_fkey" FOREIGN KEY ("timeRecordId") REFERENCES "TimeRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReportComment" ADD CONSTRAINT "DailyReportComment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DailyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentTemplate" ADD CONSTRAINT "CommentTemplate_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReportFormat" ADD CONSTRAINT "DailyReportFormat_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TensionAnalysis" ADD CONSTRAINT "TensionAnalysis_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TensionAnalysis" ADD CONSTRAINT "TensionAnalysis_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DailyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTensionStats" ADD CONSTRAINT "StaffTensionStats_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TensionAlertSettings" ADD CONSTRAINT "TensionAlertSettings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
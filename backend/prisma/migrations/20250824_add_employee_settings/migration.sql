-- CreateTable
CREATE TABLE "EmployeeSettings" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "employeeType" TEXT NOT NULL DEFAULT 'hourly',
    "monthlyBaseSalary" INTEGER NOT NULL DEFAULT 0,
    "scheduledStartTime" TEXT NOT NULL DEFAULT '09:00',
    "scheduledEndTime" TEXT NOT NULL DEFAULT '18:00',
    "includeEarlyArrivalAsOvertime" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSettings_staffId_key" ON "EmployeeSettings"("staffId");

-- AddForeignKey
ALTER TABLE "EmployeeSettings" ADD CONSTRAINT "EmployeeSettings_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
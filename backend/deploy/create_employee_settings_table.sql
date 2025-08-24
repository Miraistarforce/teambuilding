-- Migration Script for EmployeeSettings Table
-- Run this in Supabase SQL Editor to create the employee settings functionality

-- Create EmployeeSettings table
CREATE TABLE IF NOT EXISTS "EmployeeSettings" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "employeeType" TEXT NOT NULL DEFAULT 'hourly',
    "monthlyBaseSalary" INTEGER NOT NULL DEFAULT 0,
    "monthlyWorkDays" INTEGER NOT NULL DEFAULT 20,
    "scheduledStartTime" TEXT NOT NULL DEFAULT '09:00',
    "scheduledEndTime" TEXT NOT NULL DEFAULT '18:00',
    "includeEarlyArrivalAsOvertime" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeSettings_pkey" PRIMARY KEY ("id")
);

-- Create unique index on staffId
CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeSettings_staffId_key" ON "EmployeeSettings"("staffId");

-- Add foreign key constraint
ALTER TABLE "EmployeeSettings" 
ADD CONSTRAINT "EmployeeSettings_staffId_fkey" 
FOREIGN KEY ("staffId") REFERENCES "Staff"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Create trigger to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employee_settings_updated_at 
BEFORE UPDATE ON "EmployeeSettings"
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed for your Supabase setup)
GRANT ALL ON "EmployeeSettings" TO authenticated;
GRANT ALL ON "EmployeeSettings" TO service_role;

-- Add sample comment
COMMENT ON TABLE "EmployeeSettings" IS 'Stores full-time employee configuration including salary type, scheduled hours, and overtime settings';
# Employee Settings Deployment Guide

## Overview
This guide contains the steps to deploy the full-time employee settings feature to production.

## Database Migration

### Step 1: Run Migration in Supabase
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `create_employee_settings_table.sql`
4. Click "Run" to execute the migration

### Step 2: Verify Table Creation
Run this query to verify the table was created:
```sql
SELECT * FROM "EmployeeSettings" LIMIT 1;
```

## Backend Deployment

### Step 1: Deploy to Render
The backend code has already been updated with the new employee settings endpoints:
- `GET /api/staff/:id/employee-settings` - Get employee settings
- `PUT /api/staff/:id/employee-settings` - Update employee settings

The deployment will happen automatically when you push to the main branch.

### Step 2: Verify Backend Deployment
After deployment, test the endpoints:
```bash
curl https://your-backend-url.onrender.com/health
```

## Frontend Deployment

The frontend components are already implemented:
- `EmployeeSettingsModal.tsx` - UI for configuring employee settings
- `EditStaffModal.tsx` - Integration with staff edit modal
- `Staff.tsx` - Main staff management page

### Step 1: Deploy to Vercel
The frontend will deploy automatically when you push to the main branch.

### Step 2: Test the Feature
1. Login to チムビル店舗管理 (Store Admin)
2. Navigate to スタッフ管理 (Staff Management)
3. Click 編集 (Edit) on any staff member
4. Click 正社員設定 (Full-time Employee Settings)
5. Configure the settings:
   - Toggle between 時給制 (Hourly) and 月給制 (Monthly)
   - Set monthly salary
   - Configure scheduled work hours
   - Set overtime calculation preferences

## Features Implemented

### Employee Settings Configuration
- **Employment Type**: Switch between hourly and monthly salary
- **Monthly Salary**: Set base monthly salary for full-time employees
- **Scheduled Hours**: Define standard work hours (e.g., 9:00-18:00)
- **Overtime Calculation**: 
  - Option to count early arrival as overtime
  - Automatic overtime rate multiplier application
  - Calculation based on scheduled vs actual hours

### Salary Calculation Logic
- **Hourly Employees**: Continue using existing hourly wage calculation
- **Monthly Employees**: 
  - Base salary for scheduled hours
  - Overtime calculated for hours outside schedule
  - Hourly rate = Monthly salary ÷ (Monthly work days × Daily hours)
  - Example: ¥250,000 ÷ (20 days × 8 hours) = ¥1,562/hour

## API Endpoints

### GET /api/staff/:id/employee-settings
Returns current employee settings or defaults:
```json
{
  "employeeType": "hourly",
  "monthlyBaseSalary": 0,
  "monthlyWorkDays": 20,
  "scheduledStartTime": "09:00",
  "scheduledEndTime": "18:00",
  "includeEarlyArrivalAsOvertime": false,
  "currentHourlyWage": 1000,
  "overtimeRate": 1.25
}
```

### PUT /api/staff/:id/employee-settings
Updates employee settings:
```json
{
  "employeeType": "monthly",
  "monthlyBaseSalary": 250000,
  "monthlyWorkDays": 22,
  "scheduledStartTime": "09:00",
  "scheduledEndTime": "18:00",
  "includeEarlyArrivalAsOvertime": true
}
```

## Troubleshooting

### Database Connection Issues
If you encounter database connection errors:
1. Verify DATABASE_URL in Render environment variables
2. Check Supabase connection pooler settings
3. Ensure the EmployeeSettings table was created successfully

### Frontend Not Showing Settings
1. Clear browser cache
2. Verify backend is returning data correctly
3. Check browser console for errors

## Rollback Instructions

If needed, to rollback:

### Database Rollback
```sql
DROP TABLE IF EXISTS "EmployeeSettings" CASCADE;
```

### Code Rollback
1. Comment out employee settings endpoints in `staff.ts`
2. Remove EmployeeSettings model from Prisma schema
3. Redeploy backend and frontend

## Monitoring

Monitor the feature after deployment:
1. Check Render logs for backend errors
2. Monitor Supabase database performance
3. Verify Vercel deployment status
4. Test the feature with different staff members
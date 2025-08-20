#!/bin/bash

cd timecard-app

# Interview.tsx
sed -i '' "s|'http://localhost:3001/api/interviews/process'|\`\${API_BASE_URL}/api/interviews/process\`|g" src/pages/Interview.tsx
sed -i '' "s|'http://localhost:3001/api/interviews/advice'|\`\${API_BASE_URL}/api/interviews/advice\`|g" src/pages/Interview.tsx

# StaffManagement.tsx
sed -i '' "s|\`http://localhost:3001/api/tension/store/\${store.id}/alerts\`|\`\${API_BASE_URL}/api/tension/store/\${store.id}/alerts\`|g" src/pages/StaffManagement.tsx
sed -i '' "s|\`http://localhost:3001/api/staff/list/\${store.id}\`|\`\${API_BASE_URL}/api/staff/list/\${store.id}\`|g" src/pages/StaffManagement.tsx
sed -i '' "s|\`http://localhost:3001/api/staff/\${staffId}\`|\`\${API_BASE_URL}/api/staff/\${staffId}\`|g" src/pages/StaffManagement.tsx
sed -i '' "s|\`http://localhost:3001/api/staff/\${staffId}/stats\`|\`\${API_BASE_URL}/api/staff/\${staffId}/stats\`|g" src/pages/StaffManagement.tsx
sed -i '' "s|\`http://localhost:3001/api/interviews/staff/\${staffId}/latest\`|\`\${API_BASE_URL}/api/interviews/staff/\${staffId}/latest\`|g" src/pages/StaffManagement.tsx

# MyDailyReports.tsx
sed -i '' "s|\`http://localhost:3001/api/daily-reports/all-staff\`|\`\${API_BASE_URL}/api/daily-reports/all-staff\`|g" src/pages/MyDailyReports.tsx

# DailyReport.tsx
sed -i '' "s|'http://localhost:3001/api/daily-reports/format'|\`\${API_BASE_URL}/api/daily-reports/format\`|g" src/pages/DailyReport.tsx

echo "Fixed hardcoded URLs in timecard-app"
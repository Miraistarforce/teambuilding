import fs from 'fs';
import path from 'path';

export function ensureUploadsDirExists() {
  const uploadDir = path.join(__dirname, '../uploads');
  const dailyReportsDir = path.join(uploadDir, 'daily-reports');
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Created uploads directory');
  }
  
  if (!fs.existsSync(dailyReportsDir)) {
    fs.mkdirSync(dailyReportsDir, { recursive: true });
    console.log('Created daily-reports directory');
  }
  
  console.log('Upload directories verified/created at:', uploadDir);
}
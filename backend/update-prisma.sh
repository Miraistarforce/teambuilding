#!/bin/bash

# Update all files to use singleton Prisma instance
FILES=(
  "src/index.ts"
  "src/routes/health.ts"
  "src/routes/auth.ts"
  "src/utils/auditLogger.ts"
  "src/routes/stores.ts"
  "src/routes/staff.ts"
  "src/routes/interviews.ts"
  "src/routes/tension.ts"
  "src/routes/reports.ts"
  "src/routes/dailyReports.ts"
  "src/routes/reportFormat.ts"
  "src/routes/commentTemplates.ts"
  "src/routes/timeRecords.ts"
)

for file in "${FILES[@]}"; do
  # Replace PrismaClient import with prisma singleton import
  sed -i '' "s/import { PrismaClient } from '@prisma\/client';/import prisma from '..\/lib\/prisma';/g" "$file"
  sed -i '' "s/import { PrismaClient, /import { /g" "$file"
  sed -i '' "/import { .*} from '@prisma\/client';/a\\
import prisma from '../lib/prisma';" "$file"
  
  # Remove new PrismaClient() instantiation
  sed -i '' "/const prisma = new PrismaClient()/d" "$file"
done

echo "Updated all files to use Prisma singleton"
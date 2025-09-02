-- Add bonusEnabled column to Store table if it doesn't exist
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "bonusEnabled" BOOLEAN DEFAULT true;
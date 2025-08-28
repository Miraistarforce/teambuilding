// Local cache for temporary storage when Supabase is unavailable
import { PrismaClient } from '@prisma/client';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'cache', 'pending_records.json');
const CACHE_DIR = path.join(process.cwd(), 'cache');

interface CachedRecord {
  id: string;
  staffId: number;
  date: Date;
  clockIn?: Date;
  clockOut?: Date;
  status: string;
  totalBreak: number;
  workMinutes: number;
  previousWorkMinutes: number;
  syncStatus: 'pending' | 'syncing' | 'error';
  retryCount: number;
  lastAttempt: Date;
  originalData: any;
}

class LocalCache {
  private cache: Map<string, CachedRecord> = new Map();

  constructor() {
    this.loadCache();
  }

  private ensureCacheDir() {
    if (!existsSync(CACHE_DIR)) {
      const fs = require('fs');
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  }

  private loadCache() {
    this.ensureCacheDir();
    if (existsSync(CACHE_FILE)) {
      try {
        const data = readFileSync(CACHE_FILE, 'utf-8');
        const records = JSON.parse(data);
        records.forEach((record: CachedRecord) => {
          this.cache.set(record.id, record);
        });
        console.log(`Loaded ${this.cache.size} cached records`);
      } catch (error) {
        console.error('Failed to load cache:', error);
      }
    }
  }

  private saveCache() {
    this.ensureCacheDir();
    try {
      const records = Array.from(this.cache.values());
      writeFileSync(CACHE_FILE, JSON.stringify(records, null, 2));
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  async addRecord(record: any): Promise<CachedRecord> {
    const cachedRecord: CachedRecord = {
      id: `${record.staffId}_${Date.now()}`,
      staffId: record.staffId,
      date: new Date(record.date),
      clockIn: record.clockIn ? new Date(record.clockIn) : undefined,
      clockOut: record.clockOut ? new Date(record.clockOut) : undefined,
      status: record.status,
      totalBreak: record.totalBreak || 0,
      workMinutes: record.workMinutes || 0,
      previousWorkMinutes: record.previousWorkMinutes || 0,
      syncStatus: 'pending',
      retryCount: 0,
      lastAttempt: new Date(),
      originalData: record
    };

    this.cache.set(cachedRecord.id, cachedRecord);
    this.saveCache();
    
    console.log(`Added record to cache: ${cachedRecord.id}`);
    return cachedRecord;
  }

  getPendingRecords(): CachedRecord[] {
    return Array.from(this.cache.values()).filter(
      record => record.syncStatus === 'pending'
    );
  }

  updateRecordStatus(id: string, status: 'pending' | 'syncing' | 'error') {
    const record = this.cache.get(id);
    if (record) {
      record.syncStatus = status;
      record.lastAttempt = new Date();
      record.retryCount++;
      this.saveCache();
    }
  }

  removeRecord(id: string) {
    const deleted = this.cache.delete(id);
    if (deleted) {
      this.saveCache();
      console.log(`Removed record from cache: ${id}`);
    }
    return deleted;
  }

  async syncWithDatabase(prisma: PrismaClient): Promise<{ success: number; failed: number }> {
    const pendingRecords = this.getPendingRecords();
    let success = 0;
    let failed = 0;

    for (const record of pendingRecords) {
      this.updateRecordStatus(record.id, 'syncing');
      
      try {
        // Attempt to sync with database
        const existingRecord = await prisma.timeRecord.findUnique({
          where: {
            staffId_date: {
              staffId: record.staffId,
              date: record.date
            }
          }
        });

        if (existingRecord) {
          // Update existing record
          await prisma.timeRecord.update({
            where: { id: existingRecord.id },
            data: {
              clockIn: record.clockIn,
              clockOut: record.clockOut,
              status: record.status,
              totalBreak: record.totalBreak,
              workMinutes: record.workMinutes,
              previousWorkMinutes: record.previousWorkMinutes
            }
          });
        } else {
          // Create new record
          await prisma.timeRecord.create({
            data: {
              staffId: record.staffId,
              date: record.date,
              clockIn: record.clockIn,
              clockOut: record.clockOut,
              status: record.status,
              totalBreak: record.totalBreak,
              workMinutes: record.workMinutes,
              previousWorkMinutes: record.previousWorkMinutes
            }
          });
        }

        this.removeRecord(record.id);
        success++;
        console.log(`Successfully synced record: ${record.id}`);
      } catch (error) {
        console.error(`Failed to sync record ${record.id}:`, error);
        this.updateRecordStatus(record.id, 'error');
        failed++;
        
        // Remove record if too many retries
        if (record.retryCount > 10) {
          console.log(`Removing record after 10 failed attempts: ${record.id}`);
          this.removeRecord(record.id);
        }
      }
    }

    return { success, failed };
  }

  getStats() {
    const records = Array.from(this.cache.values());
    return {
      total: records.length,
      pending: records.filter(r => r.syncStatus === 'pending').length,
      syncing: records.filter(r => r.syncStatus === 'syncing').length,
      error: records.filter(r => r.syncStatus === 'error').length
    };
  }
}

// Singleton instance
const localCache = new LocalCache();

// Automatic sync interval (every 5 minutes)
setInterval(async () => {
  const stats = localCache.getStats();
  if (stats.pending > 0) {
    console.log(`Starting automatic sync for ${stats.pending} pending records`);
    
    try {
      // Try to connect to database
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const result = await localCache.syncWithDatabase(prisma);
      console.log(`Sync complete: ${result.success} success, ${result.failed} failed`);
      
      await prisma.$disconnect();
    } catch (error) {
      console.error('Automatic sync failed:', error);
    }
  }
}, 5 * 60 * 1000); // 5 minutes

export default localCache;
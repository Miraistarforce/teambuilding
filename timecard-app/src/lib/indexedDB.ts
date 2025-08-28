// IndexedDB helper functions for offline support

export interface TimeRecordCache {
  id?: number;
  staffId: number;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
  totalBreak: number;
  workMinutes: number;
  previousWorkMinutes: number;
  date: string;
  syncStatus: 'synced' | 'pending' | 'error';
  lastUpdated: string;
}

class IndexedDBHelper {
  private dbName = 'TimecardDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create timeRecords store
        if (!db.objectStoreNames.contains('timeRecords')) {
          const store = db.createObjectStore('timeRecords', {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('staffId', 'staffId');
          store.createIndex('date', 'date');
          store.createIndex('syncStatus', 'syncStatus');
        }

        // Create syncQueue store (for Service Worker)
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  async saveTimeRecord(record: TimeRecordCache): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['timeRecords'], 'readwrite');
      const store = transaction.objectStore('timeRecords');
      
      // Update lastUpdated timestamp
      record.lastUpdated = new Date().toISOString();
      
      const request = record.id 
        ? store.put(record)
        : store.add(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getTimeRecord(staffId: number, date: string): Promise<TimeRecordCache | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['timeRecords'], 'readonly');
      const store = transaction.objectStore('timeRecords');
      const index = store.index('staffId');
      const request = index.getAll(staffId);

      request.onsuccess = () => {
        const records = request.result;
        const todayRecord = records.find(r => r.date === date);
        resolve(todayRecord || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingRecords(): Promise<TimeRecordCache[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['timeRecords'], 'readonly');
      const store = transaction.objectStore('timeRecords');
      const index = store.index('syncStatus');
      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncStatus(id: number, status: 'synced' | 'pending' | 'error'): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['timeRecords'], 'readwrite');
      const store = transaction.objectStore('timeRecords');
      const request = store.get(id);

      request.onsuccess = () => {
        const record = request.result;
        if (record) {
          record.syncStatus = status;
          record.lastUpdated = new Date().toISOString();
          const updateRequest = store.put(record);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearOldRecords(daysToKeep: number = 30): Promise<void> {
    if (!this.db) await this.init();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['timeRecords'], 'readwrite');
      const store = transaction.objectStore('timeRecords');
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result;
        records.forEach(record => {
          if (record.date < cutoffDateStr && record.syncStatus === 'synced') {
            store.delete(record.id);
          }
        });
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
const indexedDBHelper = new IndexedDBHelper();

// Helper functions for easy use
export const saveTimeRecordOffline = async (record: Partial<TimeRecordCache>) => {
  const fullRecord: TimeRecordCache = {
    staffId: record.staffId!,
    clockIn: record.clockIn || null,
    clockOut: record.clockOut || null,
    status: record.status || 'NOT_STARTED',
    totalBreak: record.totalBreak || 0,
    workMinutes: record.workMinutes || 0,
    previousWorkMinutes: record.previousWorkMinutes || 0,
    date: record.date || new Date().toISOString().split('T')[0],
    syncStatus: 'pending',
    lastUpdated: new Date().toISOString(),
    ...record
  };
  
  await indexedDBHelper.saveTimeRecord(fullRecord);
  
  // Trigger background sync if available
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-timerecords');
  }
  
  return fullRecord;
};

export const getTimeRecordOffline = async (staffId: number, date?: string) => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  return await indexedDBHelper.getTimeRecord(staffId, targetDate);
};

export const syncPendingRecords = async () => {
  const pendingRecords = await indexedDBHelper.getPendingRecords();
  const results = [];
  
  for (const record of pendingRecords) {
    try {
      // Attempt to sync with server
      const response = await fetch('/api/time-records/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`
        },
        body: JSON.stringify(record)
      });
      
      if (response.ok) {
        await indexedDBHelper.updateSyncStatus(record.id!, 'synced');
        results.push({ id: record.id, status: 'success' });
      } else {
        await indexedDBHelper.updateSyncStatus(record.id!, 'error');
        results.push({ id: record.id, status: 'error' });
      }
    } catch (error) {
      await indexedDBHelper.updateSyncStatus(record.id!, 'error');
      results.push({ id: record.id, status: 'error', error });
    }
  }
  
  return results;
};

export default indexedDBHelper;
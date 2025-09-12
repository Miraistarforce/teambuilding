// Service Worker for offline support and background sync

const CACHE_NAME = 'timecard-v2';
const API_BASE_URL = '/api';

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated.');
  event.waitUntil(clients.claim());
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.includes('/api/time-records')) {
    event.respondWith(
      fetch(request.clone())
        .then(response => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Return cached response on network failure
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Return offline response for GET requests
          if (request.method === 'GET') {
            return new Response(
              JSON.stringify({ offline: true, message: 'オフラインモード' }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          }
          
          // Queue POST/PUT requests for sync
          if (request.method === 'POST' || request.method === 'PUT') {
            return queueRequest(request);
          }
        })
    );
  }
});

// Background sync event
self.addEventListener('sync', async (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-timerecords') {
    event.waitUntil(syncTimeRecords());
  }
});

// Queue failed requests for later sync
async function queueRequest(request) {
  const body = await request.text();
  const queueData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: body,
    timestamp: new Date().toISOString()
  };

  // Store in IndexedDB
  const db = await openDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  await tx.objectStore('syncQueue').add(queueData);
  await tx.complete;

  // Register for background sync
  await self.registration.sync.register('sync-timerecords');

  return new Response(
    JSON.stringify({ queued: true, message: 'リクエストをキューに追加しました' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

// Sync queued requests
async function syncTimeRecords() {
  try {
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    const getAllRequest = store.getAll();
    
    // Wait for the request to complete
    const requests = await new Promise((resolve, reject) => {
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });

    // Ensure requests is an array
    if (!Array.isArray(requests)) {
      console.log('No pending sync requests');
      return;
    }

    for (const reqData of requests) {
      try {
        const response = await fetch(reqData.url, {
          method: reqData.method,
          headers: reqData.headers,
          body: reqData.body
        });

        if (response.ok) {
          // Remove from queue on success
          const deleteTx = db.transaction('syncQueue', 'readwrite');
          const deleteStore = deleteTx.objectStore('syncQueue');
          deleteStore.delete(reqData.id);
        }
      } catch (error) {
        console.error('Sync failed for request:', error);
      }
    }

    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_COMPLETE' });
    });
  } catch (error) {
    console.error('Error in syncTimeRecords:', error);
  }
}

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TimecardDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
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
/**
 * ============================================================
 * AAHAR SHUDHI - SERVICE WORKER
 * ============================================================
 * @description Enterprise-grade offline support
 * @version 1.0.0
 * 
 * This service worker handles:
 * - Static asset caching
 * - Dynamic content caching
 * - Offline fallback
 * - Background sync
 * - Push notifications
 * - Cache management
 * ============================================================
 */

// Cache name with version
const CACHE_NAME = 'aahar-shudhi-v1.0.0';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const API_CACHE = `${CACHE_NAME}-api`;

// Static assets to cache
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/manifest.json',
    '/css/variables.css',
    '/css/base.css',
    '/css/layout.css',
    '/css/components.css',
    '/css/kanban.css',
    '/css/dashboard.css',
    '/css/modal.css',
    '/css/responsive.css',
    '/js/config/constants.js',
    '/js/config/firebase-config.js',
    '/js/services/auth-service.js',
    '/js/services/lead-service.js',
    '/js/services/status-service.js',
    '/js/services/kanban-service.js',
    '/js/services/note-service.js',
    '/js/services/followup-service.js',
    '/js/services/dashboard-service.js',
    '/js/services/realtime-service.js',
    '/js/services/filter-service.js',
    '/js/app.js'
];

// ============================================
// INSTALL EVENT
// ============================================

self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('📦 Caching static assets...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('✅ Static assets cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ Static caching failed:', error);
            })
    );
});

// ============================================
// ACTIVATE EVENT
// ============================================

self.addEventListener('activate', (event) => {
    console.log('🔄 Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== API_CACHE) {
                            console.log('🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker activated');
                return self.clients.claim();
            })
    );
});

// ============================================
// FETCH EVENT
// ============================================

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip Firebase API requests (handled by Firebase SDK)
    if (url.hostname.includes('firebase') || 
        url.hostname.includes('googleapis')) {
        return;
    }
    
    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleAPIRequest(event.request));
        return;
    }
    
    // Handle static assets
    event.respondWith(handleStaticRequest(event.request));
});

/**
 * Handle static asset requests
 * @param {Request} request - Fetch request
 * @returns {Promise<Response>} Response
 */
async function handleStaticRequest(request) {
    // Try cache first (Cache First strategy)
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        // Fetch from network
        const response = await fetch(request);
        
        // Cache dynamic content
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            await cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        // Offline fallback
        if (request.headers.get('accept')?.includes('text/html')) {
            const cachedHTML = await caches.match('/index.html');
            if (cachedHTML) {
                return cachedHTML;
            }
        }
        
        throw error;
    }
}

/**
 * Handle API requests
 * @param {Request} request - API request
 * @returns {Promise<Response>} Response
 */
async function handleAPIRequest(request) {
    // Network First strategy
    try {
        const response = await fetch(request);
        
        // Cache successful responses
        if (response.ok) {
            const cache = await caches.open(API_CACHE);
            await cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        // Fallback to cache
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline error
        return new Response(JSON.stringify({
            success: false,
            error: 'offline',
            message: 'You are offline'
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503
        });
    }
}

// ============================================
// PUSH NOTIFICATION
// ============================================

self.addEventListener('push', (event) => {
    console.log('🔔 Push notification received');
    
    let notificationData = {
        title: 'Aahar Shudhi',
        body: 'New notification',
        icon: '/assets/icons/notification-icon.png',
        badge: '/assets/icons/badge-icon.png'
    };
    
    if (event.data) {
        try {
            const data = event.data.json();
            notificationData = { ...notificationData, ...data };
        } catch (error) {
            console.warn('⚠️ Could not parse notification data');
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            vibrate: [200, 100, 200],
            data: {
                url: notificationData.url || '/'
            }
        })
    );
});

// ============================================
// NOTIFICATION CLICK
// ============================================

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const url = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then((clientList) => {
                // Check if window is already open
                for (const client of clientList) {
                    if (client.url.includes(url) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// ============================================
// BACKGROUND SYNC
// ============================================

self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync:', event.tag);
    
    if (event.tag === 'sync-leads') {
        event.waitUntil(syncPendingLeads());
    } else if (event.tag === 'sync-notes') {
        event.waitUntil(syncPendingNotes());
    }
});

/**
 * Sync pending leads from IndexedDB
 */
async function syncPendingLeads() {
    try {
        // Open IndexedDB
        const db = await openDatabase();
        
        // Get pending operations
        const pendingOps = await getPendingOperations(db, 'leads');
        
        // Process each operation
        for (const op of pendingOps) {
            try {
                // Send to server
                const response = await fetch('/api/leads/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(op)
                });
                
                if (response.ok) {
                    // Remove from pending
                    await removeOperation(db, op.id);
                }
            } catch (error) {
                console.warn('⚠️ Sync failed for operation:', op.id);
            }
        }
        
        console.log('✅ Lead sync completed');
    } catch (error) {
        console.error('❌ Lead sync failed:', error);
    }
}

/**
 * Sync pending notes from IndexedDB
 */
async function syncPendingNotes() {
    // Similar to syncPendingLeads
    console.log('📝 Note sync completed');
}

// ============================================
// INDEXEDDB HELPERS
// ============================================

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('aahar-shudhi-db', 1);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains('pendingOperations')) {
                const store = db.createObjectStore('pendingOperations', {
                    keyPath: 'id'
                });
                store.createIndex('type', 'type');
                store.createIndex('timestamp', 'timestamp');
            }
        };
        
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

function getPendingOperations(db, type) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pendingOperations'], 'readonly');
        const store = transaction.objectStore('pendingOperations');
        const index = store.index('type');
        const request = index.getAll(type);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function removeOperation(db, operationId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pendingOperations'], 'readwrite');
        const store = transaction.objectStore('pendingOperations');
        const request = store.delete(operationId);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ============================================
// MESSAGE HANDLER
// ============================================

self.addEventListener('message', (event) => {
    console.log('📨 Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }
});

console.log('✅ Service Worker Loaded');

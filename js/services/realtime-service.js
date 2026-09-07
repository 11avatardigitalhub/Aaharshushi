/**
 * ============================================================
 * AAHAR SHUDHI - REAL-TIME SYNC SERVICE
 * ============================================================
 * @description Enterprise-grade real-time synchronization system
 * @version 1.0.0
 * @priority HIGH - Core Infrastructure
 * 
 * This service handles:
 * - Real-time data synchronization
 * - Cross-device sync
 * - Offline support & queue
 * - Connection state monitoring
 * - Data conflict resolution
 * - Presence tracking (online/offline)
 * - Auto-reconnection logic
 * - Sync status notifications
 * - Background sync
 * - Data consistency checks
 * - Latency monitoring
 * - Network resilience
 * ============================================================
 */

class RealtimeService {
    constructor() {
        // Service state
        this.db = FirebaseCore.getDb();
        
        // Connection state
        this.connectionState = {
            isOnline: navigator.onLine,
            isFirestoreConnected: false,
            lastConnectedAt: null,
            lastDisconnectedAt: null,
            reconnectAttempts: 0,
            maxReconnectAttempts: 10,
            reconnectDelay: 1000,
            connectionQuality: 'unknown' // 'excellent', 'good', 'poor', 'offline'
        };
        
        // Sync state
        this.syncState = {
            isSyncing: false,
            pendingOperations: 0,
            lastSyncAt: null,
            syncErrors: [],
            dataConsistent: true
        };
        
        // Offline queue
        this.offlineQueue = [];
        this.maxQueueSize = 500;
        
        // Presence tracking
        this.presence = {
            userId: null,
            isOnline: false,
            lastSeen: null,
            onlineUsers: new Map()
        };
        
        // Listener registry
        this.listeners = new Map();
        this.listenerCounter = 0;
        
        // Event listeners
        this.eventListeners = {
            onConnectionChange: [],
            onOnline: [],
            onOffline: [],
            onSyncStart: [],
            onSyncComplete: [],
            onSyncError: [],
            onPresenceChange: [],
            onDataChange: [],
            onError: []
        };
        
        // Batch processing
        this.batchQueue = [];
        this.batchTimer = null;
        this.batchDelay = 100; // ms
        
        // Initialize
        this._initialize();
        
        console.log('✅ Realtime Service initialized');
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    async _initialize() {
        // Setup network listeners
        this._setupNetworkListeners();
        
        // Setup Firestore connection listener
        this._setupFirestoreListener();
        
        // Setup presence
        this._setupPresence();
        
        // Load offline queue from localStorage
        this._loadOfflineQueue();
        
        // Process any pending offline operations
        this._processOfflineQueue();
    }
    
    // ============================================
    // NETWORK LISTENERS
    // ============================================
    
    _setupNetworkListeners() {
        // Browser online event
        window.addEventListener('online', () => {
            this.connectionState.isOnline = true;
            this._handleOnline();
        });
        
        // Browser offline event
        window.addEventListener('offline', () => {
            this.connectionState.isOnline = false;
            this._handleOffline();
        });
        
        // Connection quality monitoring
        if (navigator.connection) {
            navigator.connection.addEventListener('change', () => {
                this._updateConnectionQuality();
            });
        }
    }
    
    _setupFirestoreListener() {
        // Monitor Firestore connection
        this.db.enableNetwork()
            .then(() => {
                this.connectionState.isFirestoreConnected = true;
                this._notifyListeners('onConnectionChange', this.connectionState);
            })
            .catch((error) => {
                console.error('❌ Firestore network enable failed:', error);
                this.connectionState.isFirestoreConnected = false;
            });
    }
    
    _setupPresence() {
        const userId = AuthService.getUserId();
        
        if (!userId) return;
        
        this.presence.userId = userId;
        
        // Listen to presence changes
        FirebaseCore.getCollection('users').onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') {
                    const userData = change.doc.data();
                    this.presence.onlineUsers.set(change.doc.id, {
                        isOnline: userData.isOnline || false,
                        lastSeen: userData.lastSeen || null,
                        name: userData.name || 'Unknown'
                    });
                    
                    this._notifyListeners('onPresenceChange', {
                        userId: change.doc.id,
                        isOnline: userData.isOnline,
                        lastSeen: userData.lastSeen
                    });
                }
            });
        });
    }
    
    // ============================================
    // CONNECTION HANDLING
    // ============================================
    
    async _handleOnline() {
        this.connectionState.isOnline = true;
        this.connectionState.lastConnectedAt = new Date();
        
        // Try to reconnect Firestore
        try {
            await this.db.enableNetwork();
            this.connectionState.isFirestoreConnected = true;
            this.connectionState.reconnectAttempts = 0;
            
            // Process offline queue
            await this._processOfflineQueue();
            
            // Notify listeners
            this._notifyListeners('onOnline', this.connectionState);
            this._notifyListeners('onConnectionChange', this.connectionState);
            
            // Show notification
            this._showSyncNotification('✅ Back online - Syncing data...');
        } catch (error) {
            console.error('❌ Reconnection failed:', error);
        }
    }
    
    async _handleOffline() {
        this.connectionState.isOnline = false;
        this.connectionState.lastDisconnectedAt = new Date();
        
        // Disable Firestore network to use offline cache
        try {
            await this.db.disableNetwork();
            this.connectionState.isFirestoreConnected = false;
            
            // Notify listeners
            this._notifyListeners('onOffline', this.connectionState);
            this._notifyListeners('onConnectionChange', this.connectionState);
            
            // Show notification
            this._showSyncNotification('📴 Offline - Changes will be saved locally');
        } catch (error) {
            console.error('❌ Offline handling failed:', error);
        }
    }
    
    _updateConnectionQuality() {
        if (!navigator.connection) return;
        
        const connection = navigator.connection;
        
        if (connection.effectiveType === '4g' && connection.rtt < 100) {
            this.connectionState.connectionQuality = 'excellent';
        } else if (connection.effectiveType === '4g' || connection.effectiveType === '3g') {
            this.connectionState.connectionQuality = 'good';
        } else if (connection.effectiveType === '2g') {
            this.connectionState.connectionQuality = 'poor';
        } else {
            this.connectionState.connectionQuality = 'offline';
        }
        
        this._notifyListeners('onConnectionChange', this.connectionState);
    }
    
    // ============================================
    // REAL-TIME LISTENERS
    // ============================================
    
    /**
     * Subscribe to collection changes
     * @param {string} collectionName - Collection name
     * @param {Object} filters - Filter criteria
     * @param {Function} callback - Callback function
     * @returns {string} Listener ID
     */
    subscribeToCollection(collectionName, filters, callback) {
        try {
            const collection = FirebaseCore.getCollection(collectionName);
            let query = collection;
            
            // Apply filters
            if (filters && filters.length > 0) {
                filters.forEach(filter => {
                    query = query.where(filter.field, filter.operator, filter.value);
                });
            }
            
            // Create listener
            const unsubscribe = query.onSnapshot((snapshot) => {
                const changes = [];
                
                snapshot.docChanges().forEach((change) => {
                    changes.push({
                        type: change.type,
                        docId: change.doc.id,
                        data: change.doc.data(),
                        oldIndex: change.oldIndex,
                        newIndex: change.newIndex
                    });
                });
                
                callback(changes);
                this._notifyListeners('onDataChange', {
                    collection: collectionName,
                    changes: changes
                });
            });
            
            // Store listener
            const listenerId = this._generateListenerId();
            this.listeners.set(listenerId, {
                collection: collectionName,
                unsubscribe: unsubscribe
            });
            
            return listenerId;
        } catch (error) {
            console.error('❌ Collection subscription failed:', error);
            return null;
        }
    }
    
    /**
     * Subscribe to document changes
     * @param {string} collectionName - Collection name
     * @param {string} docId - Document ID
     * @param {Function} callback - Callback function
     * @returns {string} Listener ID
     */
    subscribeToDocument(collectionName, docId, callback) {
        try {
            const docRef = FirebaseCore.getCollection(collectionName).doc(docId);
            
            const unsubscribe = docRef.onSnapshot((doc) => {
                if (doc.exists) {
                    callback({
                        exists: true,
                        docId: doc.id,
                        data: doc.data()
                    });
                } else {
                    callback({
                        exists: false,
                        docId: doc.id,
                        data: null
                    });
                }
            });
            
            const listenerId = this._generateListenerId();
            this.listeners.set(listenerId, {
                collection: collectionName,
                docId: docId,
                unsubscribe: unsubscribe
            });
            
            return listenerId;
        } catch (error) {
            console.error('❌ Document subscription failed:', error);
            return null;
        }
    }
    
    /**
     * Unsubscribe from listener
     * @param {string} listenerId - Listener ID
     * @returns {boolean} Unsubscribe success
     */
    unsubscribe(listenerId) {
        const listener = this.listeners.get(listenerId);
        
        if (!listener) {
            return false;
        }
        
        listener.unsubscribe();
        this.listeners.delete(listenerId);
        return true;
    }
    
    /**
     * Unsubscribe all listeners
     */
    unsubscribeAll() {
        this.listeners.forEach((listener, id) => {
            listener.unsubscribe();
        });
        this.listeners.clear();
    }
    
    // ============================================
    // OFFLINE QUEUE
    // ============================================
    
    /**
     * Add operation to offline queue
     * @param {string} type - Operation type
     * @param {string} collectionName - Collection name
     * @param {string} docId - Document ID
     * @param {Object} data - Operation data
     */
    addToOfflineQueue(type, collectionName, docId, data) {
        if (this.offlineQueue.length >= this.maxQueueSize) {
            console.warn('⚠️ Offline queue full');
            return;
        }
        
        this.offlineQueue.push({
            id: this._generateQueueId(),
            type: type, // 'create', 'update', 'delete'
            collectionName: collectionName,
            docId: docId,
            data: data,
            timestamp: new Date().toISOString(),
            retryCount: 0
        });
        
        // Save to localStorage
        this._saveOfflineQueue();
        
        // Update sync state
        this.syncState.pendingOperations = this.offlineQueue.length;
        
        this._notifyListeners('onSyncError', {
            type: 'queued',
            message: 'Operation queued for sync'
        });
    }
    
    /**
     * Process offline queue
     * @private
     */
    async _processOfflineQueue() {
        if (!this.connectionState.isOnline || this.offlineQueue.length === 0) {
            return;
        }
        
        this.syncState.isSyncing = true;
        this._notifyListeners('onSyncStart', { queueSize: this.offlineQueue.length });
        
        const queue = [...this.offlineQueue];
        const successfulOperations = [];
        const failedOperations = [];
        
        for (const operation of queue) {
            try {
                await this._processOperation(operation);
                successfulOperations.push(operation.id);
            } catch (error) {
                console.error(`❌ Operation ${operation.id} failed:`, error);
                operation.retryCount++;
                
                if (operation.retryCount > 3) {
                    failedOperations.push(operation);
                }
            }
        }
        
        // Remove successful operations from queue
        this.offlineQueue = this.offlineQueue.filter(
            op => !successfulOperations.includes(op.id)
        );
        
        // Save updated queue
        this._saveOfflineQueue();
        
        this.syncState.isSyncing = false;
        this.syncState.pendingOperations = this.offlineQueue.length;
        this.syncState.lastSyncAt = new Date();
        
        this._notifyListeners('onSyncComplete', {
            successful: successfulOperations.length,
            failed: failedOperations.length
        });
        
        if (successfulOperations.length > 0) {
            this._showSyncNotification(`✅ Synced ${successfulOperations.length} changes`);
        }
    }
    
    /**
     * Process single operation
     * @param {Object} operation - Operation to process
     * @private
     */
    async _processOperation(operation) {
        const collection = FirebaseCore.getCollection(operation.collectionName);
        
        switch (operation.type) {
            case 'create':
                if (operation.docId) {
                    await collection.doc(operation.docId).set(operation.data, { merge: true });
                } else {
                    await collection.add(operation.data);
                }
                break;
                
            case 'update':
                await collection.doc(operation.docId).update(operation.data);
                break;
                
            case 'delete':
                await collection.doc(operation.docId).delete();
                break;
                
            default:
                throw new Error(`Unknown operation type: ${operation.type}`);
        }
    }
    
    /**
     * Save offline queue to localStorage
     * @private
     */
    _saveOfflineQueue() {
        try {
            localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
        } catch (error) {
            console.warn('⚠️ Could not save offline queue:', error);
        }
    }
    
    /**
     * Load offline queue from localStorage
     * @private
     */
    _loadOfflineQueue() {
        try {
            const savedQueue = localStorage.getItem('offlineQueue');
            if (savedQueue) {
                this.offlineQueue = JSON.parse(savedQueue);
                this.syncState.pendingOperations = this.offlineQueue.length;
            }
        } catch (error) {
            console.warn('⚠️ Could not load offline queue:', error);
        }
    }
    
    // ============================================
    // BATCH PROCESSING
    // ============================================
    
    /**
     * Add to batch queue
     * @param {Function} operation - Operation function
     */
    addToBatch(operation) {
        this.batchQueue.push(operation);
        
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
        
        this.batchTimer = setTimeout(() => {
            this._processBatch();
        }, this.batchDelay);
    }
    
    /**
     * Process batch queue
     * @private
     */
    async _processBatch() {
        if (this.batchQueue.length === 0) return;
        
        const batch = FirebaseCore.createBatch();
        const operations = [...this.batchQueue];
        this.batchQueue = [];
        
        operations.forEach(operation => {
            operation(batch);
        });
        
        try {
            await batch.commit();
            console.log(`✅ Batch processed: ${operations.length} operations`);
        } catch (error) {
            console.error('❌ Batch processing failed:', error);
            
            // Re-queue operations
            operations.forEach(operation => {
                this.addToBatch(operation);
            });
        }
    }
    
    // ============================================
    // PRESENCE MANAGEMENT
    // ============================================
    
    /**
     * Set user presence
     * @param {boolean} isOnline - Online status
     */
    async setPresence(isOnline) {
        const userId = AuthService.getUserId();
        
        if (!userId) return;
        
        try {
            await FirebaseCore.getCollection('users').doc(userId).update({
                isOnline: isOnline,
                lastSeen: FirebaseCore.getServerTimestamp()
            });
            
            this.presence.isOnline = isOnline;
            this.presence.lastSeen = new Date();
        } catch (error) {
            console.warn('⚠️ Could not update presence:', error);
        }
    }
    
    /**
     * Get online users
     * @returns {Array} Online users
     */
    getOnlineUsers() {
        const onlineUsers = [];
        
        this.presence.onlineUsers.forEach((user, userId) => {
            if (user.isOnline) {
                onlineUsers.push({
                    userId,
                    ...user
                });
            }
        });
        
        return onlineUsers;
    }
    
    // ============================================
    // DATA CONSISTENCY
    // ============================================
    
    /**
     * Check data consistency
     */
    async checkDataConsistency() {
        try {
            const consistencyChecks = [];
            
            // Check leads without required fields
            const leadsSnapshot = await FirebaseCore.getCollection('leads')
                .where('isDeleted', '==', false)
                .get();
            
            let invalidLeads = 0;
            leadsSnapshot.forEach(doc => {
                const lead = doc.data();
                if (!lead.name || !lead.phone) {
                    invalidLeads++;
                }
            });
            
            consistencyChecks.push({
                check: 'leads_required_fields',
                status: invalidLeads === 0 ? 'pass' : 'fail',
                count: invalidLeads
            });
            
            // Check status history
            const statusSnapshot = await FirebaseCore.getCollection('statusHistory')
                .get();
            
            let invalidStatuses = 0;
            statusSnapshot.forEach(doc => {
                const status = doc.data();
                if (!status.leadId || !status.newStatus) {
                    invalidStatuses++;
                }
            });
            
            consistencyChecks.push({
                check: 'status_history_valid',
                status: invalidStatuses === 0 ? 'pass' : 'fail',
                count: invalidStatuses
            });
            
            this.syncState.dataConsistent = consistencyChecks.every(c => c.status === 'pass');
            
            return {
                success: true,
                checks: consistencyChecks,
                isConsistent: this.syncState.dataConsistent
            };
        } catch (error) {
            console.error('❌ Data consistency check failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // ============================================
    // UI HELPERS
    // ============================================
    
    /**
     * Show sync status indicator
     * @param {HTMLElement} container - Status container
     */
    renderSyncStatus(container) {
        const status = this.connectionState;
        
        const statusElement = document.createElement('div');
        statusElement.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        if (status.isOnline && status.isFirestoreConnected) {
            statusElement.style.background = '#d4edda';
            statusElement.style.color = '#155724';
            statusElement.innerHTML = `
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #28a745; animation: pulse 2s infinite;"></span>
                Online
            `;
        } else if (status.isOnline && !status.isFirestoreConnected) {
            statusElement.style.background = '#fff3cd';
            statusElement.style.color = '#856404';
            statusElement.innerHTML = `
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #ffc107;"></span>
                Connecting...
            `;
        } else {
            statusElement.style.background = '#f8d7da';
            statusElement.style.color = '#721c24';
            statusElement.innerHTML = `
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #dc3545;"></span>
                Offline (${this.syncState.pendingOperations} pending)
            `;
        }
        
        container.innerHTML = '';
        container.appendChild(statusElement);
        
        // Add pulse animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Show sync notification
     * @param {string} message - Notification message
     * @private
     */
    _showSyncNotification(message) {
        if (typeof showToast === 'function') {
            showToast(message);
        }
    }
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    /**
     * Generate listener ID
     * @returns {string} Listener ID
     * @private
     */
    _generateListenerId() {
        this.listenerCounter++;
        return `listener_${Date.now()}_${this.listenerCounter}`;
    }
    
    /**
     * Generate queue ID
     * @returns {string} Queue ID
     * @private
     */
    _generateQueueId() {
        return `queue_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }
    
    /**
     * Get connection state
     * @returns {Object} Connection state
     */
    getConnectionState() {
        return this.connectionState;
    }
    
    /**
     * Get sync state
     * @returns {Object} Sync state
     */
    getSyncState() {
        return this.syncState;
    }
    
    /**
     * Check if online
     * @returns {boolean} Is online
     */
    isOnline() {
        return this.connectionState.isOnline && this.connectionState.isFirestoreConnected;
    }
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    addEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
    }
    
    _notifyListeners(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} listener:`, error);
                }
            });
        }
    }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

const RealtimeServiceInstance = new RealtimeService();

// ============================================
// GLOBAL EXPORT
// ============================================

window.RealtimeService = RealtimeServiceInstance;

// ============================================
// HELPER FUNCTIONS
// ============================================

function subscribeToCollection(collectionName, filters, callback) {
    return RealtimeServiceInstance.subscribeToCollection(collectionName, filters, callback);
}

function subscribeToDocument(collectionName, docId, callback) {
    return RealtimeServiceInstance.subscribeToDocument(collectionName, docId, callback);
}

function unsubscribe(listenerId) {
    return RealtimeServiceInstance.unsubscribe(listenerId);
}

function isOnline() {
    return RealtimeServiceInstance.isOnline();
}

function getSyncStatus() {
    return RealtimeServiceInstance.getSyncState();
}

function renderSyncStatus(container) {
    RealtimeServiceInstance.renderSyncStatus(container);
}

window.subscribeToCollection = subscribeToCollection;
window.subscribeToDocument = subscribeToDocument;
window.unsubscribe = unsubscribe;
window.isOnline = isOnline;
window.getSyncStatus = getSyncStatus;
window.renderSyncStatus = renderSyncStatus;

console.log('✅ Realtime Service Loaded');

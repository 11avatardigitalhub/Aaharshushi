/**
 * ============================================================
 * AAHAR SHUDHI - FIREBASE CORE CONFIGURATION
 * ============================================================
 * @description Enterprise-grade Firebase initialization
 * @author Aahar Shudhi Development Team
 * @version 1.0.0
 * @priority HIGHEST - Core Foundation
 * 
 * This service handles:
 * - Firebase app initialization
 * - Firestore database connection
 * - Authentication service
 * - Offline persistence
 * - Collection references
 * - Environment configuration
 * - Error handling
 * - Performance monitoring
 * ============================================================
 */

// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================

const ENVIRONMENT = {
    // Current environment: 'development' | 'staging' | 'production'
    CURRENT: 'development',
    
    // Firebase configurations for different environments
    DEVELOPMENT: {
          apiKey: "AIzaSyBZDaHJSt-4AV6EJYG76p8kcsIHf6LOxdU",
          authDomain: "avatar-wa-dual-crm.firebaseapp.com",
          projectId: "avatar-wa-dual-crm",
          storageBucket: "avatar-wa-dual-crm.firebasestorage.app",
          messagingSenderId: "946959261009",
          appId: "1:946959261009:web:3ae08845917ac8cff8c770"
        };
    
    PRODUCTION: {
          apiKey: "AIzaSyBZDaHJSt-4AV6EJYG76p8kcsIHf6LOxdU",
          authDomain: "avatar-wa-dual-crm.firebaseapp.com",
          projectId: "avatar-wa-dual-crm",
          storageBucket: "avatar-wa-dual-crm.firebasestorage.app",
          messagingSenderId: "946959261009",
          appId: "1:946959261009:web:3ae08845917ac8cff8c770"
    }
};

// ============================================
// FIREBASE INITIALIZATION
// ============================================

class FirebaseService {
    constructor() {
        this.firebase = null;
        this.db = null;
        this.auth = null;
        this.storage = null;
        this.analytics = null;
        this.isInitialized = false;
        this.initializationError = null;
        this.collections = {};
    }

    /**
     * Initialize Firebase with environment-specific config
     * @returns {Promise<boolean>} Initialization status
     */
    async initialize() {
        try {
            // Get config based on environment
            const config = this._getConfig();
            
            // Initialize Firebase app
            if (!firebase.apps.length) {
                this.firebase = firebase.initializeApp(config);
            } else {
                this.firebase = firebase.app();
            }
            
            // Initialize services
            this.db = firebase.firestore();
            this.auth = firebase.auth();
            this.storage = firebase.storage();
            
            // Configure Firestore settings
            await this._configureFirestore();
            
            // Enable offline persistence
            await this._enableOfflinePersistence();
            
            // Setup collection references
            this._setupCollections();
            
            // Setup auth state listener
            this._setupAuthListener();
            
            this.isInitialized = true;
            console.log('✅ Firebase initialized successfully');
            
            return true;
        } catch (error) {
            this.initializationError = error;
            console.error('❌ Firebase initialization failed:', error);
            return false;
        }
    }

    /**
     * Get environment-specific configuration
     * @private
     */
    _getConfig() {
        switch (ENVIRONMENT.CURRENT) {
            case 'production':
                return ENVIRONMENT.PRODUCTION;
            case 'staging':
                return ENVIRONMENT.PRODUCTION; // Use production for now
            default:
                return ENVIRONMENT.DEVELOPMENT;
        }
    }

    /**
     * Configure Firestore settings
     * @private
     */
    async _configureFirestore() {
        this.db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
            ignoreUndefinedProperties: true,
            merge: true
        });
    }

    /**
     * Enable offline persistence for real-time sync
     * @private
     */
    async _enableOfflinePersistence() {
        try {
            await this.db.enablePersistence({
                synchronizeTabs: true
            });
            console.log('✅ Offline persistence enabled');
        } catch (error) {
            if (error.code === 'failed-precondition') {
                console.warn('⚠️ Multiple tabs open, persistence already enabled');
            } else if (error.code === 'unimplemented') {
                console.warn('⚠️ Browser does not support persistence');
            } else {
                console.error('❌ Offline persistence error:', error);
            }
        }
    }

    /**
     * Setup collection references
     * @private
     */
    _setupCollections() {
        this.collections = {
            // Main collections
            leads: this.db.collection('leads'),
            users: this.db.collection('users'),
            tenants: this.db.collection('tenants'),
            teams: this.db.collection('teams'),
            
            // Sub-collections (accessed via lead doc)
            notes: this.db.collectionGroup('notes'),
            
            // Independent collections
            followups: this.db.collection('followups'),
            statusHistory: this.db.collection('status_history'),
            notifications: this.db.collection('notifications'),
            callLogs: this.db.collection('call_logs'),
            whatsappLogs: this.db.collection('whatsapp_logs'),
            
            // Configuration
            settings: this.db.collection('settings'),
            products: this.db.collection('products'),
            
            // Analytics
            analytics: this.db.collection('analytics'),
            
            // Audit
            auditLogs: this.db.collection('audit_logs')
        };
    }

    /**
     * Setup authentication state listener
     * @private
     */
    _setupAuthListener() {
        this.auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('👤 User signed in:', user.email);
                this._updateUserPresence(user.uid, true);
            } else {
                console.log('👤 User signed out');
            }
        });
    }

    /**
     * Update user online/offline status
     * @private
     */
    async _updateUserPresence(userId, isOnline) {
        try {
            const userRef = this.collections.users.doc(userId);
            await userRef.update({
                isOnline: isOnline,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.warn('⚠️ Could not update presence:', error);
        }
    }

    /**
     * Get current user
     * @returns {Object|null} Current authenticated user
     */
    getCurrentUser() {
        return this.auth.currentUser;
    }

    /**
     * Get current user ID
     * @returns {string|null} Current user ID
     */
    getCurrentUserId() {
        const user = this.getCurrentUser();
        return user ? user.uid : null;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        return this.auth.currentUser !== null;
    }

    /**
     * Get Firestore instance
     * @returns {Object} Firestore instance
     */
    getDb() {
        return this.db;
    }

    /**
     * Get Auth instance
     * @returns {Object} Auth instance
     */
    getAuth() {
        return this.auth;
    }

    /**
     * Get collection reference
     * @param {string} collectionName - Name of collection
     * @returns {Object} Collection reference
     */
    getCollection(collectionName) {
        return this.collections[collectionName] || null;
    }

    /**
     * Create a new document reference
     * @param {string} collectionName - Collection name
     * @returns {Object} Document reference
     */
    createDocumentRef(collectionName) {
        return this.collections[collectionName].doc();
    }

    /**
     * Get server timestamp
     * @returns {Object} Server timestamp
     */
    getServerTimestamp() {
        return firebase.firestore.FieldValue.serverTimestamp();
    }

    /**
     * Get batch for bulk operations
     * @returns {Object} Write batch
     */
    createBatch() {
        return this.db.batch();
    }

    /**
     * Run transaction
     * @param {Function} updateFunction - Transaction function
     * @returns {Promise} Transaction result
     */
    async runTransaction(updateFunction) {
        return await this.db.runTransaction(updateFunction);
    }

    /**
     * Get error details
     * @returns {Object|null} Error details
     */
    getError() {
        return this.initializationError;
    }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

const FirebaseCore = new FirebaseService();

// ============================================
// GLOBAL EXPORT
// ============================================

window.FirebaseCore = FirebaseCore;
window.db = FirebaseCore.db;
window.auth = FirebaseCore.auth;
window.collections = FirebaseCore.collections;
window.firebaseInstance = firebase;

// ============================================
// AUTO-INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    const initialized = await FirebaseCore.initialize();
    
    if (initialized) {
        // Dispatch event for other services
        window.dispatchEvent(new CustomEvent('firebase-ready', {
            detail: { firebase: FirebaseCore }
        }));
    }
});

// ============================================
// ERROR HANDLING UTILITY
// ============================================

class FirebaseErrorHandler {
    static handle(error, context = '') {
        const errorMap = {
            'permission-denied': 'You do not have permission to perform this action',
            'not-found': 'Document not found',
            'already-exists': 'Document already exists',
            'failed-precondition': 'Operation failed precondition',
            'unauthenticated': 'Please sign in to continue',
            'unavailable': 'Service is currently unavailable',
            'unknown': 'An unknown error occurred'
        };
        
        const message = errorMap[error.code] || error.message || 'Unknown error';
        console.error(`❌ [${context}] ${message}`, error);
        
        return {
            code: error.code,
            message: message,
            context: context,
            timestamp: new Date().toISOString()
        };
    }
}

window.FirebaseErrorHandler = FirebaseErrorHandler;

console.log('✅ Firebase Configuration Service Loaded');

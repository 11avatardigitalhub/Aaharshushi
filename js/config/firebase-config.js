/**
 * ============================================================
 * AAHAR SHUDHI - FIREBASE CONFIGURATION (COMPLETE WORKING)
 * ============================================================
 * @description Firebase initialization with error handling
 * @version 4.0.0 - Final Working Version
 * 
 * This file handles:
 * - Firebase app initialization
 * - Firestore database connection
 * - Authentication service
 * - Collection references
 * - Global error handler
 * - Server timestamp utility
 * - Batch operations
 * - Transaction support
 * ============================================================
 */

// ============================================
// FIREBASE CONFIGURATION
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyBZDaHJSt-4AV6EJYG76p8kcsIHf6LOxdU",
    authDomain: "avatar-wa-dual-crm.firebaseapp.com",
    projectId: "avatar-wa-dual-crm",
    storageBucket: "avatar-wa-dual-crm.firebasestorage.app",
    messagingSenderId: "946959261009",
    appId: "1:946959261009:web:3ae08845917ac8cff8c770"
};

// ============================================
// FIREBASE ERROR HANDLER
// ============================================

const FirebaseErrorHandler = {
    /**
     * Handle Firebase errors with friendly messages
     * @param {Object} error - Firebase error object
     * @param {string} context - Error context
     * @returns {Object} Error details
     */
    handle(error, context = '') {
        const errorMap = {
            'permission-denied': 'You do not have permission. Check Firestore security rules.',
            'not-found': 'Document not found',
            'already-exists': 'Document already exists',
            'failed-precondition': 'Operation failed precondition',
            'unauthenticated': 'Please sign in to continue',
            'unavailable': 'Service is currently unavailable. Check internet connection.',
            'unknown': 'An unknown error occurred',
            'cancelled': 'Operation was cancelled',
            'invalid-argument': 'Invalid argument provided',
            'deadline-exceeded': 'Operation timed out',
            'resource-exhausted': 'Resource quota exceeded',
            'aborted': 'Operation was aborted',
            'out-of-range': 'Operation was out of range',
            'unimplemented': 'Operation is not implemented',
            'internal': 'Internal server error',
            'data-loss': 'Data loss occurred'
        };
        
        const code = error?.code || 'unknown';
        const message = errorMap[code] || error?.message || 'Unknown error';
        
        // Log error with context
        console.error(`❌ [${context}] ${message}`, error);
        
        // Return structured error
        return {
            success: false,
            code: code,
            message: message,
            context: context,
            timestamp: new Date().toISOString(),
            originalError: error
        };
    },
    
    /**
     * Get friendly message for auth errors
     * @param {string} code - Firebase auth error code
     * @returns {string} Friendly message
     */
    authMessage(code) {
        const authErrors = {
            'auth/invalid-email': 'Invalid email address',
            'auth/user-disabled': 'This account has been disabled',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'Email already registered',
            'auth/weak-password': 'Password is too weak',
            'auth/too-many-requests': 'Too many attempts. Please try later',
            'auth/network-request-failed': 'Network error. Check your connection',
            'auth/invalid-credential': 'Invalid email or password',
            'auth/operation-not-allowed': 'This login method is not enabled',
            'auth/account-exists-with-different-credential': 'Account exists with different credential',
            'auth/requires-recent-login': 'Please login again to continue',
            'auth/invalid-verification-code': 'Invalid verification code',
            'auth/expired-action-code': 'Link has expired',
            'auth/invalid-action-code': 'Invalid link',
            'auth/popup-closed-by-user': 'Login popup was closed'
        };
        
        return authErrors[code] || 'Authentication error. Please try again.';
    },
    
    /**
     * Get friendly message for Firestore errors
     * @param {string} code - Firestore error code
     * @returns {string} Friendly message
     */
    firestoreMessage(code) {
        const firestoreErrors = {
            'permission-denied': 'You do not have permission to access this data',
            'not-found': 'Requested document not found',
            'already-exists': 'Document already exists',
            'failed-precondition': 'Operation failed. Check your data.',
            'unavailable': 'Service unavailable. Check internet.',
            'resource-exhausted': 'Free tier limit reached'
        };
        
        return firestoreErrors[code] || 'Database error. Please try again.';
    }
};

// ============================================
// FIREBASE INITIALIZATION
// ============================================

let db = null;
let auth = null;
let collections = {};

try {
    // Initialize Firebase App
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase App initialized successfully');
        } else {
            console.log('ℹ️ Firebase App already initialized');
        }
        
        // Get Firestore
        db = firebase.firestore();
        
        // Get Auth
        auth = firebase.auth();
        
        // Configure Firestore settings
        db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
            ignoreUndefinedProperties: true,
            merge: true
        });
        
        // Enable offline persistence with error handling
        db.enablePersistence()
            .then(() => {
                console.log('✅ Offline persistence enabled');
            })
            .catch((error) => {
                if (error.code === 'failed-precondition') {
                    console.warn('⚠️ Multiple tabs open, persistence already enabled');
                } else if (error.code === 'unimplemented') {
                    console.warn('⚠️ Browser does not support persistence');
                } else {
                    console.warn('⚠️ Offline persistence:', error.message);
                }
            });
        
        // Define collections
        collections = {
            leads: db.collection('leads'),
            users: db.collection('users'),
            notes: db.collection('notes'),
            followups: db.collection('followups'),
            statusHistory: db.collection('status_history'),
            notifications: db.collection('notifications'),
            tenants: db.collection('tenants'),
            teams: db.collection('teams'),
            settings: db.collection('settings'),
            auditLogs: db.collection('audit_logs'),
            callLogs: db.collection('call_logs'),
            whatsappLogs: db.collection('whatsapp_logs'),
            analytics: db.collection('analytics'),
            products: db.collection('products')
        };
        
        console.log('✅ Firebase services initialized');
        console.log('📋 Available collections:', Object.keys(collections).length);
    } else {
        console.error('❌ Firebase SDK not loaded. Check script order in HTML.');
    }
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
}

// ============================================
// FIREBASE CORE OBJECT
// ============================================

const FirebaseCore = {
    // Services
    db: db,
    auth: auth,
    collections: collections,
    firebase: firebase,
    config: firebaseConfig,
    
    /**
     * Get Firestore database instance
     * @returns {Object} Firestore instance
     */
    getDb() {
        if (!db) {
            console.error('❌ Firestore not initialized');
        }
        return db;
    },
    
    /**
     * Get Auth instance
     * @returns {Object} Auth instance
     */
    getAuth() {
        if (!auth) {
            console.error('❌ Auth not initialized');
        }
        return auth;
    },
    
    /**
     * Get collection reference
     * @param {string} name - Collection name
     * @returns {Object} Collection reference
     */
    getCollection(name) {
        return collections[name] || db.collection(name);
    },
    
    /**
     * Get server timestamp
     * @returns {Object} Server timestamp
     */
    getServerTimestamp() {
        return firebase.firestore.FieldValue.serverTimestamp();
    },
    
    /**
     * Create write batch
     * @returns {Object} Write batch
     */
    createBatch() {
        return db.batch();
    },
    
    /**
     * Run transaction
     * @param {Function} updateFunction - Transaction function
     * @returns {Promise} Transaction result
     */
    async runTransaction(updateFunction) {
        return await db.runTransaction(updateFunction);
    },
    
    /**
     * Get current user
     * @returns {Object|null} Current user
     */
    getCurrentUser() {
        return auth ? auth.currentUser : null;
    },
    
    /**
     * Get current user ID
     * @returns {string|null} User ID
     */
    getCurrentUserId() {
        return auth && auth.currentUser ? auth.currentUser.uid : null;
    },
    
    /**
     * Check if authenticated
     * @returns {boolean} Is authenticated
     */
    isAuthenticated() {
        return auth && auth.currentUser !== null;
    },
    
    /**
     * Initialize Firebase (for consistency)
     * @returns {Promise<boolean>} Initialization result
     */
    async initialize() {
        try {
            if (typeof firebase !== 'undefined' && !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
                db = firebase.firestore();
                auth = firebase.auth();
                console.log('✅ Firebase re-initialized');
            }
            return true;
        } catch (error) {
            console.error('❌ Firebase re-initialization failed:', error);
            return false;
        }
    },
    
    /**
     * Get server timestamp as Date
     * @returns {Object} Date object for queries
     */
    getServerDate() {
        return new Date();
    },
    
    /**
     * Create document reference
     * @param {string} collectionName - Collection name
     * @returns {Object} Document reference
     */
    createDocRef(collectionName) {
        return collections[collectionName].doc();
    },
    
    /**
     * Increment field value
     * @param {number} value - Increment value
     * @returns {Object} Increment operation
     */
    increment(value = 1) {
        return firebase.firestore.FieldValue.increment(value);
    },
    
    /**
     * Delete field
     * @returns {Object} Delete operation
     */
    deleteField() {
        return firebase.firestore.FieldValue.delete();
    },
    
    /**
     * Array union
     * @param {Array} values - Values to add
     * @returns {Object} Array union operation
     */
    arrayUnion(...values) {
        return firebase.firestore.FieldValue.arrayUnion(...values);
    },
    
    /**
     * Array remove
     * @param {Array} values - Values to remove
     * @returns {Object} Array remove operation
     */
    arrayRemove(...values) {
        return firebase.firestore.FieldValue.arrayRemove(...values);
    }
};

// ============================================
// GLOBAL EXPORT
// ============================================

window.FirebaseCore = FirebaseCore;
window.FirebaseErrorHandler = FirebaseErrorHandler;
window.db = db;
window.auth = auth;
window.collections = collections;
window.firebaseInstance = firebase;

console.log('✅ Firebase Configuration Loaded');
console.log('📋 Project:', firebaseConfig.projectId);
console.log('📋 Collections:', Object.keys(collections).length);
console.log('📋 Error Handler: Ready');

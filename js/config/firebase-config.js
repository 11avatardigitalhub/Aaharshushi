/**
 * ============================================================
 * AAHAR SHUDHI - FIREBASE CONFIGURATION (COMPLETE FULL CODE)
 * ============================================================
 * @description Firebase initialization with complete error handling
 * @version 5.0.0 - Final Complete Working Version
 * ============================================================
 */

// ============================================
// FIREBASE CONFIGURATION OBJECT
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
// FIREBASE ERROR HANDLER CLASS
// ============================================

const FirebaseErrorHandler = {
    /**
     * Handle Firebase errors
     */
    handle(error, context = '') {
        const errorMap = {
            'permission-denied': 'Permission denied. Check Firestore rules in Firebase Console.',
            'not-found': 'Document not found',
            'already-exists': 'Document already exists',
            'failed-precondition': 'Operation failed precondition',
            'unauthenticated': 'Please sign in to continue',
            'unavailable': 'Service unavailable. Check internet connection.',
            'unknown': 'Unknown error occurred',
            'cancelled': 'Operation cancelled',
            'invalid-argument': 'Invalid argument provided',
            'deadline-exceeded': 'Operation timed out',
            'resource-exhausted': 'Resource quota exceeded',
            'aborted': 'Operation aborted',
            'out-of-range': 'Operation out of range',
            'unimplemented': 'Operation not implemented',
            'internal': 'Internal server error',
            'data-loss': 'Data loss occurred'
        };
        
        const code = error?.code || 'unknown';
        const message = errorMap[code] || error?.message || 'Unknown error';
        
        console.error(`❌ [${context}] ${message}`, error);
        
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
     * Auth error messages
     */
    authMessage(code) {
        const authErrors = {
            'auth/invalid-email': 'Invalid email address',
            'auth/user-disabled': 'Account disabled',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'Email already registered',
            'auth/weak-password': 'Password is too weak',
            'auth/too-many-requests': 'Too many attempts. Try later.',
            'auth/network-request-failed': 'Network error',
            'auth/invalid-credential': 'Invalid email or password',
            'auth/operation-not-allowed': 'Login method not enabled',
            'auth/requires-recent-login': 'Please login again',
            'auth/popup-closed-by-user': 'Login popup closed'
        };
        
        return authErrors[code] || 'Authentication error';
    },
    
    /**
     * Firestore error messages
     */
    firestoreMessage(code) {
        const firestoreErrors = {
            'permission-denied': 'Permission denied. Update Firestore rules.',
            'not-found': 'Document not found',
            'already-exists': 'Document exists',
            'failed-precondition': 'Operation failed',
            'unavailable': 'Service unavailable',
            'resource-exhausted': 'Free tier limit reached'
        };
        
        return firestoreErrors[code] || 'Database error';
    }
};

// ============================================
// FIREBASE INITIALIZATION
// ============================================

let db = null;
let auth = null;
let collections = {};

try {
    if (typeof firebase !== 'undefined') {
        // Initialize Firebase App
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase App initialized');
        }
        
        // Get Firestore
        db = firebase.firestore();
        
        // Get Auth
        auth = firebase.auth();
        
        // Configure Firestore
        db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
            ignoreUndefinedProperties: true,
            merge: true
        });
        
        // Enable offline persistence
        db.enablePersistence()
            .then(() => console.log('✅ Offline persistence enabled'))
            .catch((error) => {
                console.warn('⚠️ Persistence:', error.code);
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
    } else {
        console.error('❌ Firebase SDK not loaded');
    }
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
}

// ============================================
// FIREBASE CORE OBJECT
// ============================================

const FirebaseCore = {
    db: db,
    auth: auth,
    collections: collections,
    firebase: firebase,
    config: firebaseConfig,
    
    getDb() {
        return db;
    },
    
    getAuth() {
        return auth;
    },
    
    getCollection(name) {
        return collections[name] || db.collection(name);
    },
    
    getServerTimestamp() {
        return firebase.firestore.FieldValue.serverTimestamp();
    },
    
    createBatch() {
        return db.batch();
    },
    
    async runTransaction(updateFunction) {
        return await db.runTransaction(updateFunction);
    },
    
    getCurrentUser() {
        return auth ? auth.currentUser : null;
    },
    
    getCurrentUserId() {
        return auth && auth.currentUser ? auth.currentUser.uid : null;
    },
    
    isAuthenticated() {
        return auth && auth.currentUser !== null;
    },
    
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
            console.error('❌ Re-initialization failed:', error);
            return false;
        }
    },
    
    increment(value = 1) {
        return firebase.firestore.FieldValue.increment(value);
    },
    
    deleteField() {
        return firebase.firestore.FieldValue.delete();
    },
    
    arrayUnion(...values) {
        return firebase.firestore.FieldValue.arrayUnion(...values);
    },
    
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

console.log('✅ Firebase Configuration Loaded');
console.log('📋 Project:', firebaseConfig.projectId);
console.log('📋 Collections:', Object.keys(collections).length);

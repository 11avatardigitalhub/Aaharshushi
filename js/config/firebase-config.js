/**
 * ============================================================
 * AAHAR SHUDHI - FIREBASE CONFIGURATION
 * ============================================================
 * @description Firebase initialization with Aahar Shudhi config
 * @version 1.0.0
 * ============================================================
 */

// Firebase Configuration - Aahar Shudhi
const firebaseConfig = {
    apiKey: "AIzaSyBZDaHJSt-4AV6EJYG76p8kcsIHf6LOxdU",
    authDomain: "avatar-wa-dual-crm.firebaseapp.com",
    projectId: "avatar-wa-dual-crm",
    storageBucket: "avatar-wa-dual-crm.firebasestorage.app",
    messagingSenderId: "946959261009",
    appId: "1:946959261009:web:3ae08845917ac8cff8c770"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase App initialized');
}

// Get Firebase services
const db = firebase.firestore();
const auth = firebase.auth();

// Enable offline persistence
db.enablePersistence()
    .then(() => {
        console.log('✅ Offline persistence enabled');
    })
    .catch((error) => {
        console.warn('⚠️ Offline persistence warning:', error.message);
    });

// Collections References
const collections = {
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

// FirebaseCore Global Object
const FirebaseCore = {
    // Services
    db: db,
    auth: auth,
    collections: collections,
    firebase: firebase,
    
    /**
     * Get Firestore database instance
     */
    getDb() {
        return db;
    },
    
    /**
     * Get Auth instance
     */
    getAuth() {
        return auth;
    },
    
    /**
     * Get collection reference
     */
    getCollection(collectionName) {
        return collections[collectionName] || db.collection(collectionName);
    },
    
    /**
     * Get server timestamp
     */
    getServerTimestamp() {
        return firebase.firestore.FieldValue.serverTimestamp();
    },
    
    /**
     * Create write batch
     */
    createBatch() {
        return db.batch();
    },
    
    /**
     * Run transaction
     */
    async runTransaction(updateFunction) {
        return await db.runTransaction(updateFunction);
    },
    
    /**
     * Get current user
     */
    getCurrentUser() {
        return auth.currentUser;
    },
    
    /**
     * Get current user ID
     */
    getCurrentUserId() {
        const user = auth.currentUser;
        return user ? user.uid : null;
    },
    
    /**
     * Check if authenticated
     */
    isAuthenticated() {
        return auth.currentUser !== null;
    },
    
    /**
     * Initialize Firebase (for consistency)
     */
    async initialize() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            console.log('✅ Firebase initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            return false;
        }
    }
};

// Global Export
window.FirebaseCore = FirebaseCore;
window.db = db;
window.auth = auth;
window.collections = collections;
window.firebaseInstance = firebase;

console.log('✅ Firebase Configuration Loaded');
console.log('📋 Project:', firebaseConfig.projectId);
console.log('📋 Collections:', Object.keys(collections));

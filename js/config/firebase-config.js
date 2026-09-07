/**
 * ============================================================
 * AAHAR SHUDHI - FIREBASE CONFIG (FIXED - No Unload Issues)
 * ============================================================
 */

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBZDaHJSt-4AV6EJYG76p8kcsIHf6LOxdU",
    authDomain: "avatar-wa-dual-crm.firebaseapp.com",
    projectId: "avatar-wa-dual-crm",
    storageBucket: "avatar-wa-dual-crm.firebasestorage.app",
    messagingSenderId: "946959261009",
    appId: "1:946959261009:web:3ae08845917ac8cff8c770"
};

// Initialize Firebase (check first)
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase App initialized');
    }
    
    // Get services
    const db = firebase.firestore();
    const auth = firebase.auth();
    
    // Disable persistence to avoid unload issues (optional)
    // db.settings({ persistence: false });
    
    // Enable offline persistence (with error handling)
    db.enablePersistence()
        .then(() => console.log('✅ Offline persistence enabled'))
        .catch((error) => {
            console.warn('⚠️ Offline persistence:', error.code);
            // Continue without persistence
        });
    
    // Collections
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
        auditLogs: db.collection('audit_logs')
    };
    
    // FirebaseCore
    const FirebaseCore = {
        db: db,
        auth: auth,
        collections: collections,
        firebase: firebase,
        
        getDb() { return db; },
        getAuth() { return auth; },
        getCollection(name) { return collections[name] || db.collection(name); },
        getServerTimestamp() { return firebase.firestore.FieldValue.serverTimestamp(); },
        createBatch() { return db.batch(); },
        getCurrentUser() { return auth.currentUser; },
        getCurrentUserId() { return auth.currentUser ? auth.currentUser.uid : null; },
        isAuthenticated() { return auth.currentUser !== null; },
        
        async initialize() {
            return true;
        }
    };
    
    // Global Export
    window.FirebaseCore = FirebaseCore;
    window.db = db;
    window.auth = auth;
    window.collections = collections;
    
    console.log('✅ Firebase Configuration Loaded');
} else {
    console.error('❌ Firebase SDK not loaded');
}

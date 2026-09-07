// ============================================
// AAHAR SHUDHI - FIREBASE CONFIGURATION
// ============================================
// Service: Core Configuration
// Priority: HIGHEST
// ============================================

// Firebase Configuration Object
const firebaseConfig = {
    apiKey: "AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "aahar-shudhi.firebaseapp.com",
    projectId: "aahar-shudhi",
    storageBucket: "aahar-shudhi.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Services
const db = firebase.firestore();
const auth = firebase.auth();

// Enable Offline Persistence
db.enablePersistence()
    .then(() => {
        console.log('✅ Offline persistence enabled');
    })
    .catch((error) => {
        console.error('❌ Offline persistence error:', error);
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
    settings: db.collection('settings')
};

// Export for use in other files
window.FirebaseConfig = {
    db,
    auth,
    collections,
    firebase
};

console.log('✅ Firebase Configuration Loaded');

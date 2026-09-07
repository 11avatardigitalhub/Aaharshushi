/**
 * ============================================================
 * AAHAR SHUDHI - GLOBAL CONSTANTS
 * ============================================================
 * @description All constants with proper global exports
 * @version 1.0.0
 * ============================================================
 */

// ============================================
// LEAD STATUS
// ============================================

const LEAD_STATUS = {
    NEW: 'New',
    CONTACTED: 'Contacted',
    FOLLOW_UP: 'Follow-up',
    INTERESTED: 'Interested',
    NOT_INTERESTED: 'Not Interested',
    CLOSED: 'Closed',
    
    ALL: [
        'New',
        'Contacted',
        'Follow-up',
        'Interested',
        'Not Interested',
        'Closed'
    ],
    
    TRANSITIONS: {
        'New': ['Contacted', 'Not Interested'],
        'Contacted': ['Follow-up', 'Interested', 'Not Interested'],
        'Follow-up': ['Contacted', 'Interested', 'Not Interested', 'Closed'],
        'Interested': ['Follow-up', 'Closed', 'Not Interested'],
        'Not Interested': ['Contacted', 'Closed'],
        'Closed': []
    },
    
    COLORS: {
        'New': { background: '#fff3cd', text: '#856404', border: '#ffc107' },
        'Contacted': { background: '#d1ecf1', text: '#0c5460', border: '#17a2b8' },
        'Follow-up': { background: '#e7d9ff', text: '#4a3696', border: '#6f42c1' },
        'Interested': { background: '#d4edda', text: '#155724', border: '#28a745' },
        'Not Interested': { background: '#f8d7da', text: '#721c24', border: '#dc3545' },
        'Closed': { background: '#d6d8db', text: '#383d41', border: '#6c757d' }
    },
    
    ICONS: {
        'New': '🆕',
        'Contacted': '📞',
        'Follow-up': '⏰',
        'Interested': '💚',
        'Not Interested': '❌',
        'Closed': '✅'
    }
};

// Status Colors (flat object for compatibility)
const STATUS_COLORS = {
    'New': '#fff3cd',
    'Contacted': '#d1ecf1',
    'Follow-up': '#e7d9ff',
    'Interested': '#d4edda',
    'Not Interested': '#f8d7da',
    'Closed': '#d6d8db'
};

const STATUS_TEXT_COLORS = {
    'New': '#856404',
    'Contacted': '#0c5460',
    'Follow-up': '#4a3696',
    'Interested': '#155724',
    'Not Interested': '#721c24',
    'Closed': '#383d41'
};

// ============================================
// PRODUCTS
// ============================================

const PRODUCT_CATALOG = {
    PRODUCTS: [
        { id: 'CHY-001', name: 'Chyawanprash', category: 'Immunity', price: 599 },
        { id: 'ASH-001', name: 'Ashwagandha', category: 'Wellness', price: 499 },
        { id: 'TRI-001', name: 'Triphala', category: 'Digestion', price: 299 },
        { id: 'GIL-001', name: 'Giloy Juice', category: 'Immunity', price: 349 },
        { id: 'BRA-001', name: 'Brahmi', category: 'Mental Health', price: 399 }
    ],
    
    NAMES: [
        'Chyawanprash',
        'Ashwagandha',
        'Triphala',
        'Giloy Juice',
        'Brahmi',
        'Other'
    ]
};

// ============================================
// LEAD SOURCES
// ============================================

const LEAD_SOURCE = {
    ALL: [
        'Facebook',
        'Instagram',
        'Google Ads',
        'YouTube',
        'Website',
        'WhatsApp',
        'Phone Call',
        'Walk-in',
        'Reference',
        'Exhibition',
        'Other'
    ],
    
    ICONS: {
        'Facebook': '📘',
        'Instagram': '📸',
        'Google Ads': '🔍',
        'Website': '🌐',
        'WhatsApp': '💬',
        'Phone Call': '📞',
        'Reference': '👥',
        'Other': '📌'
    }
};

// ============================================
// PRIORITIES
// ============================================

const LEAD_PRIORITIES = [
    'Hot',
    'Warm',
    'Cold',
    'Urgent',
    'Normal',
    'Low'
];

// ============================================
// USER ROLES
// ============================================

const USER_ROLES = {
    ADMIN: 'admin',
    TEAM_LEAD: 'team_lead',
    AGENT: 'agent',
    
    ALL: ['admin', 'team_lead', 'agent'],
    
    PERMISSIONS: {
        admin: {
            canViewAllLeads: true,
            canEditAllLeads: true,
            canDeleteLeads: true,
            canAssignLeads: true,
            canManageUsers: true,
            canViewReports: true,
            canExportData: true,
            canManageSettings: true,
            canViewAnalytics: true,
            canManageTeams: true
        },
        team_lead: {
            canViewAllLeads: true,
            canEditAllLeads: true,
            canDeleteLeads: false,
            canAssignLeads: true,
            canManageUsers: false,
            canViewReports: true,
            canExportData: true,
            canManageSettings: false,
            canViewAnalytics: true,
            canManageTeams: true
        },
        agent: {
            canViewAllLeads: false,
            canEditAllLeads: false,
            canDeleteLeads: false,
            canAssignLeads: false,
            canManageUsers: false,
            canViewReports: false,
            canExportData: false,
            canManageSettings: false,
            canViewAnalytics: false,
            canManageTeams: false
        }
    }
};

// ============================================
// TEAMS & REGIONS
// ============================================

const TEAMS = ['North', 'South', 'East', 'West'];
const REGIONS = ['Delhi', 'Mumbai', 'Chennai', 'Kolkata', 'Pune', 'Hyderabad', 'Jaipur', 'Ahmedabad'];

// ============================================
// PAGINATION
// ============================================

const PAGINATION = {
    LEADS_PER_PAGE: 20,
    NOTES_PER_PAGE: 10,
    NOTIFICATIONS_PER_PAGE: 15,
    MAX_LEADS_FETCH: 500,
    MAX_NOTES_FETCH: 100,
    MAX_EXPORT: 1000,
    MAX_BULK_IMPORT: 500,
    OPTIONS: [10, 20, 50, 100]
};

// ============================================
// TIME CONFIG
// ============================================

const TIME_CONFIG = {
    BUSINESS_HOURS: {
        START: 9,
        END: 18,
        WORKING_DAYS: [1, 2, 3, 4, 5, 6]
    },
    SLA: {
        NEW_LEAD_RESPONSE: 1,
        FOLLOW_UP_REMINDER: 30,
        LEAD_STALE: 7,
        FOLLOW_UP_OVERDUE: 1
    }
};

// ============================================
// VALIDATION RULES
// ============================================

const VALIDATION_RULES = {
    NAME: { minLength: 2, maxLength: 100, required: true, pattern: /^[a-zA-Z\s]+$/ },
    PHONE: { minLength: 10, maxLength: 10, required: true, pattern: /^[6-9]\d{9}$/ },
    EMAIL: { required: false, pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
    NOTES: { maxLength: 1000, required: false }
};

// ============================================
// GLOBAL EXPORT
// ============================================

window.LEAD_STATUS = LEAD_STATUS;
window.STATUS_COLORS = STATUS_COLORS;
window.STATUS_TEXT_COLORS = STATUS_TEXT_COLORS;
window.PRODUCT_CATALOG = PRODUCT_CATALOG;
window.LEAD_SOURCE = LEAD_SOURCE;
window.LEAD_PRIORITIES = LEAD_PRIORITIES;
window.USER_ROLES = USER_ROLES;
window.TEAMS = TEAMS;
window.REGIONS = REGIONS;
window.PAGINATION = PAGINATION;
window.TIME_CONFIG = TIME_CONFIG;
window.VALIDATION_RULES = VALIDATION_RULES;

console.log('✅ Constants Loaded');
console.log('📋 Lead Statuses:', LEAD_STATUS.ALL);
console.log('📋 Products:', PRODUCT_CATALOG.NAMES);

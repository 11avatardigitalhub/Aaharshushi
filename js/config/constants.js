/**
 * ============================================================
 * AAHAR SHUDHI - GLOBAL CONSTANTS & CONFIGURATION
 * ============================================================
 * @description Centralized constants for entire application
 * @version 1.0.0
 * @priority HIGHEST - Core Foundation
 * 
 * This service manages:
 * - Lead status definitions
 * - Color mappings
 * - Product catalog
 * - Source definitions
 * - User roles & permissions
 * - Time configurations
 * - Pagination settings
 * - Feature flags
 * - Validation rules
 * - API endpoints
 * ============================================================
 */

// ============================================
// LEAD STATUS CONFIGURATION
// ============================================

const LEAD_STATUS = {
    // Status definitions
    NEW: 'New',
    CONTACTED: 'Contacted',
    FOLLOW_UP: 'Follow-up',
    INTERESTED: 'Interested',
    NOT_INTERESTED: 'Not Interested',
    CLOSED: 'Closed',
    
    // All statuses in order
    ALL: [
        'New',
        'Contacted',
        'Follow-up',
        'Interested',
        'Not Interested',
        'Closed'
    ],
    
    // Status flow (allowed transitions)
    TRANSITIONS: {
        'New': ['Contacted', 'Not Interested'],
        'Contacted': ['Follow-up', 'Interested', 'Not Interested'],
        'Follow-up': ['Contacted', 'Interested', 'Not Interested', 'Closed'],
        'Interested': ['Follow-up', 'Closed', 'Not Interested'],
        'Not Interested': ['Contacted', 'Closed'],
        'Closed': [] // Final state
    },
    
    // Status colors for UI
    COLORS: {
        'New': {
            background: '#fff3cd',
            text: '#856404',
            border: '#ffc107'
        },
        'Contacted': {
            background: '#d1ecf1',
            text: '#0c5460',
            border: '#17a2b8'
        },
        'Follow-up': {
            background: '#e7d9ff',
            text: '#4a3696',
            border: '#6f42c1'
        },
        'Interested': {
            background: '#d4edda',
            text: '#155724',
            border: '#28a745'
        },
        'Not Interested': {
            background: '#f8d7da',
            text: '#721c24',
            border: '#dc3545'
        },
        'Closed': {
            background: '#d6d8db',
            text: '#383d41',
            border: '#6c757d'
        }
    },
    
    // Status icons
    ICONS: {
        'New': '🆕',
        'Contacted': '📞',
        'Follow-up': '⏰',
        'Interested': '💚',
        'Not Interested': '❌',
        'Closed': '✅'
    },
    
    // Status priorities for sorting
    PRIORITY: {
        'New': 1,
        'Contacted': 2,
        'Follow-up': 3,
        'Interested': 4,
        'Not Interested': 5,
        'Closed': 6
    }
};

// ============================================
// PRODUCT CATALOG
// ============================================

const PRODUCT_CATALOG = {
    // All products
    PRODUCTS: [
        {
            id: 'CHY-001',
            name: 'Chyawanprash',
            description: 'Traditional immunity booster',
            category: 'Immunity',
            unit: '500g',
            mrp: 699,
            sellingPrice: 599,
            stockAlert: 50
        },
        {
            id: 'ASH-001',
            name: 'Ashwagandha',
            description: 'Stress relief and energy',
            category: 'Wellness',
            unit: '500g',
            mrp: 599,
            sellingPrice: 499,
            stockAlert: 50
        },
        {
            id: 'TRI-001',
            name: 'Triphala',
            description: 'Digestive health',
            category: 'Digestion',
            unit: '250g',
            mrp: 399,
            sellingPrice: 299,
            stockAlert: 50
        },
        {
            id: 'GIL-001',
            name: 'Giloy Juice',
            description: 'Immunity and detox',
            category: 'Immunity',
            unit: '500ml',
            mrp: 449,
            sellingPrice: 349,
            stockAlert: 50
        },
        {
            id: 'BRA-001',
            name: 'Brahmi',
            description: 'Memory and focus',
            category: 'Mental Health',
            unit: '250g',
            mrp: 499,
            sellingPrice: 399,
            stockAlert: 50
        }
    ],
    
    // Product names only (for dropdowns)
    NAMES: [
        'Chyawanprash',
        'Ashwagandha',
        'Triphala',
        'Giloy Juice',
        'Brahmi',
        'Other'
    ],
    
    // Categories
    CATEGORIES: [
        'Immunity',
        'Wellness',
        'Digestion',
        'Mental Health',
        'General'
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
    
    // Source categories
    CATEGORIES: {
        'Paid Ads': ['Facebook', 'Instagram', 'Google Ads', 'YouTube'],
        'Organic': ['Website', 'WhatsApp', 'Phone Call', 'Walk-in'],
        'Referral': ['Reference'],
        'Events': ['Exhibition'],
        'Other': ['Other']
    },
    
    // Source icons
    ICONS: {
        'Facebook': '📘',
        'Instagram': '📸',
        'Google Ads': '🔍',
        'YouTube': '▶️',
        'Website': '🌐',
        'WhatsApp': '💬',
        'Phone Call': '📞',
        'Walk-in': '🚶',
        'Reference': '👥',
        'Exhibition': '🎪',
        'Other': '📌'
    }
};

// ============================================
// USER ROLES & PERMISSIONS
// ============================================

const USER_ROLES = {
    // Role definitions
    ADMIN: 'admin',
    TEAM_LEAD: 'team_lead',
    AGENT: 'agent',
    
    // All roles
    ALL: ['admin', 'team_lead', 'agent'],
    
    // Role permissions
    PERMISSIONS: {
        admin: {
            // Full access
            canViewAllLeads: true,
            canEditAllLeads: true,
            canDeleteLeads: true,
            canAssignLeads: true,
            canManageUsers: true,
            canViewReports: true,
            canExportData: true,
            canManageSettings: true,
            canViewAnalytics: true,
            canManageTeams: true,
            canManageProducts: true,
            canManageCampaigns: true
        },
        team_lead: {
            // Team-level access
            canViewAllLeads: true,
            canEditAllLeads: true,
            canDeleteLeads: false,
            canAssignLeads: true,
            canManageUsers: false,
            canViewReports: true,
            canExportData: true,
            canManageSettings: false,
            canViewAnalytics: true,
            canManageTeams: true,
            canManageProducts: false,
            canManageCampaigns: false
        },
        agent: {
            // Own leads only
            canViewAllLeads: false,
            canEditAllLeads: false,
            canDeleteLeads: false,
            canAssignLeads: false,
            canManageUsers: false,
            canViewReports: false,
            canExportData: false,
            canManageSettings: false,
            canViewAnalytics: false,
            canManageTeams: false,
            canManageProducts: false,
            canManageCampaigns: false
        }
    },
    
    // Role labels
    LABELS: {
        'admin': 'Administrator',
        'team_lead': 'Team Lead',
        'agent': 'Tele-calling Agent'
    }
};

// ============================================
// TIME CONFIGURATIONS
// ============================================

const TIME_CONFIG = {
    // Timestamp formats
    FORMATS: {
        DATE: 'DD/MM/YYYY',
        TIME: 'HH:mm:ss',
        DATETIME: 'DD/MM/YYYY HH:mm',
        FULL: 'dddd, DD MMMM YYYY HH:mm:ss'
    },
    
    // Time in milliseconds
    MILLISECONDS: {
        SECOND: 1000,
        MINUTE: 60 * 1000,
        HOUR: 60 * 60 * 1000,
        DAY: 24 * 60 * 60 * 1000,
        WEEK: 7 * 24 * 60 * 60 * 1000,
        MONTH: 30 * 24 * 60 * 60 * 1000,
        YEAR: 365 * 24 * 60 * 60 * 1000
    },
    
    // Business hours
    BUSINESS_HOURS: {
        START: 9, // 9 AM
        END: 18,  // 6 PM
        WORKING_DAYS: [1, 2, 3, 4, 5, 6] // Mon-Sat
    },
    
    // SLA (Service Level Agreement)
    SLA: {
        NEW_LEAD_RESPONSE: 1, // 1 hour
        FOLLOW_UP_REMINDER: 30, // 30 minutes before
        LEAD_STALE: 7, // 7 days without contact
        FOLLOW_UP_OVERDUE: 1 // 1 day overdue
    }
};

// ============================================
// PAGINATION & LIMITS
// ============================================

const PAGINATION = {
    // Default page sizes
    LEADS_PER_PAGE: 20,
    NOTES_PER_PAGE: 10,
    NOTIFICATIONS_PER_PAGE: 15,
    
    // Maximum limits
    MAX_LEADS_FETCH: 500,
    MAX_NOTES_FETCH: 100,
    MAX_EXPORT: 1000,
    MAX_BULK_IMPORT: 500,
    
    // Pagination options
    OPTIONS: [10, 20, 50, 100]
};

// ============================================
// VALIDATION RULES
// ============================================

const VALIDATION_RULES = {
    // Name validation
    NAME: {
        minLength: 3,
        maxLength: 100,
        required: true,
        pattern: /^[a-zA-Z\s]+$/
    },
    
    // Phone validation (Indian)
    PHONE: {
        minLength: 10,
        maxLength: 10,
        required: true,
        pattern: /^[6-9]\d{9}$/
    },
    
    // Email validation
    EMAIL: {
        required: false,
        pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    },
    
    // Notes validation
    NOTES: {
        maxLength: 1000,
        required: false
    }
};

// ============================================
// FEATURE FLAGS
// ============================================

const FEATURE_FLAGS = {
    // Core features
    KANBAN_BOARD: true,
    DRAG_DROP: true,
    QUICK_ACTIONS: true,
    CALL_BUTTON: true,
    WHATSAPP_BUTTON: true,
    
    // Advanced features
    ADVANCED_FILTERS: true,
    BULK_IMPORT: false,
    EXPORT_DATA: false,
    NOTIFICATIONS: true,
    ANALYTICS: true,
    
    // Future features
    AI_LEAD_SCORING: false,
    VOICE_CALL_RECORDING: false,
    AUTO_DIALER: false,
    CHATBOT: false
};

// ============================================
// API ENDPOINTS (Cloudflare Worker)
// ============================================

const API_ENDPOINTS = {
    // Base URL (Cloudflare Worker)
    BASE_URL: 'https://aahar-shudhi-api.workers.dev',
    
    // Auth endpoints
    AUTH: {
        LOGIN: '/api/auth/login',
        LOGOUT: '/api/auth/logout',
        REGISTER: '/api/auth/register',
        VERIFY: '/api/auth/verify'
    },
    
    // Lead endpoints
    LEADS: {
        CREATE: '/api/leads',
        GET_ALL: '/api/leads',
        GET_ONE: '/api/leads/:id',
        UPDATE: '/api/leads/:id',
        DELETE: '/api/leads/:id',
        BULK: '/api/leads/bulk'
    },
    
    // Status endpoints
    STATUS: {
        UPDATE: '/api/leads/:id/status',
        HISTORY: '/api/leads/:id/status-history'
    },
    
    // Notes endpoints
    NOTES: {
        GET_ALL: '/api/leads/:id/notes',
        CREATE: '/api/leads/:id/notes',
        UPDATE: '/api/notes/:id',
        DELETE: '/api/notes/:id'
    }
};

// ============================================
// GLOBAL EXPORT
// ============================================

window.AppConstants = {
    LEAD_STATUS,
    PRODUCT_CATALOG,
    LEAD_SOURCE,
    USER_ROLES,
    TIME_CONFIG,
    PAGINATION,
    VALIDATION_RULES,
    FEATURE_FLAGS,
    API_ENDPOINTS
};

// Freeze objects to prevent modification
Object.freeze(LEAD_STATUS);
Object.freeze(PRODUCT_CATALOG);
Object.freeze(LEAD_SOURCE);
Object.freeze(USER_ROLES);
Object.freeze(TIME_CONFIG);
Object.freeze(PAGINATION);
Object.freeze(VALIDATION_RULES);
Object.freeze(FEATURE_FLAGS);
Object.freeze(API_ENDPOINTS);

console.log('✅ Constants Service Loaded');

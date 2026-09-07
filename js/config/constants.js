// ============================================
// AAHAR SHUDHI - CONSTANTS
// ============================================
// Service: Global Constants
// Priority: HIGHEST
// ============================================

// Lead Statuses
const LEAD_STATUSES = [
    'New',
    'Contacted',
    'Follow-up',
    'Interested',
    'Not Interested',
    'Closed'
];

// Status Colors
const STATUS_COLORS = {
    'New': '#fff3cd',
    'Contacted': '#d1ecf1',
    'Follow-up': '#e7d9ff',
    'Interested': '#d4edda',
    'Not Interested': '#f8d7da',
    'Closed': '#d6d8db'
};

// Status Text Colors
const STATUS_TEXT_COLORS = {
    'New': '#856404',
    'Contacted': '#0c5460',
    'Follow-up': '#4a3696',
    'Interested': '#155724',
    'Not Interested': '#721c24',
    'Closed': '#383d41'
};

// Products List
const PRODUCTS = [
    'Chyawanprash',
    'Ashwagandha',
    'Triphala',
    'Giloy Juice',
    'Brahmi',
    'Other'
];

// Lead Sources
const LEAD_SOURCES = [
    'Facebook',
    'Instagram',
    'Google Ads',
    'Website',
    'WhatsApp',
    'Phone Call',
    'Walk-in',
    'Reference',
    'Other'
];

// Lead Priorities
const LEAD_PRIORITIES = [
    'Hot',
    'Warm',
    'Cold',
    'Urgent',
    'Normal',
    'Low'
];

// User Roles
const USER_ROLES = [
    'admin',
    'team_lead',
    'agent'
];

// Teams
const TEAMS = [
    'North',
    'South',
    'East',
    'West'
];

// Regions
const REGIONS = [
    'Delhi',
    'Mumbai',
    'Chennai',
    'Kolkata',
    'Pune',
    'Hyderabad',
    'Jaipur',
    'Ahmedabad'
];

// Time Constants
const TIME_CONSTANTS = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000
};

// Pagination
const PAGINATION = {
    LEADS_PER_PAGE: 20,
    NOTES_PER_PAGE: 10,
    MAX_EXPORT: 1000
};

// Export
window.Constants = {
    LEAD_STATUSES,
    STATUS_COLORS,
    STATUS_TEXT_COLORS,
    PRODUCTS,
    LEAD_SOURCES,
    LEAD_PRIORITIES,
    USER_ROLES,
    TEAMS,
    REGIONS,
    TIME_CONSTANTS,
    PAGINATION
};

console.log('✅ Constants Loaded');

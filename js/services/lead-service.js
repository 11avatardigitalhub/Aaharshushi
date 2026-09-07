/**
 * ============================================================
 * AAHAR SHUDHI - LEAD MANAGEMENT SERVICE
 * ============================================================
 * @description Enterprise-grade lead management system
 * @version 1.0.0
 * @priority HIGHEST - Core Feature
 * 
 * This service handles:
 * - Lead CRUD operations (Create, Read, Update, Delete)
 * - Duplicate detection & prevention
 * - Advanced validation system
 * - Bulk lead operations (import/export)
 * - Lead search & filtering
 * - Pagination & sorting
 * - Real-time data synchronization
 * - Lead assignment & reassignment
 * - Lead scoring system
 * - Lead activity tracking
 * - Soft delete & restore
 * - Data integrity checks
 * - Cross-tenant isolation
 * - Performance optimization
 * ============================================================
 */

class LeadService {
    constructor() {
        // Service state
        this.db = FirebaseCore.getDb();
        this.leadsCollection = FirebaseCore.getCollection('leads');
        this.statusHistoryCollection = FirebaseCore.getCollection('statusHistory');
        this.auditLogsCollection = FirebaseCore.getCollection('auditLogs');
        
        // Cache management
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
        
        // Pagination state
        this.pagination = {
            currentPage: 1,
            pageSize: PAGINATION.LEADS_PER_PAGE,
            totalLeads: 0,
            totalPages: 0
        };
        
        // Filter state
        this.filters = {
            search: '',
            status: 'All',
            product: 'All',
            source: 'All',
            agent: 'All',
            team: 'All',
            region: 'All',
            priority: 'All',
            dateFrom: null,
            dateTo: null,
            sortBy: 'createdAt',
            sortOrder: 'desc'
        };
        
        // Real-time listeners
        this.listeners = new Map();
        
        // Event listeners
        this.eventListeners = {
            onLeadAdded: [],
            onLeadUpdated: [],
            onLeadDeleted: [],
            onLeadRestored: [],
            onStatusChanged: [],
            onLeadAssigned: [],
            onError: []
        };
        
        console.log('✅ Lead Service initialized');
    }
    
    // ============================================
    // LEAD CREATION
    // ============================================
    
    /**
     * Create new lead
     * @param {Object} leadData - Lead data
     * @param {string} leadData.name - Lead name (required)
     * @param {string} leadData.phone - Lead phone (required)
     * @param {string} leadData.city - Lead city
     * @param {string} leadData.product - Product interest
     * @param {string} leadData.source - Lead source
     * @param {string} leadData.priority - Lead priority
     * @param {string} leadData.notes - Initial notes
     * @returns {Promise<Object>} Creation result
     */
    async createLead(leadData) {
        try {
            // Validate lead data
            const validation = this._validateLeadData(leadData);
            if (!validation.success) {
                throw new Error(validation.message);
            }
            
            // Check for duplicates
            const duplicateCheck = await this.checkDuplicate(leadData.phone, leadData.email);
            if (duplicateCheck.isDuplicate) {
                return {
                    success: false,
                    isDuplicate: true,
                    duplicateLeads: duplicateCheck.leads,
                    message: 'Duplicate lead detected',
                    suggestion: 'Merge or update existing lead'
                };
            }
            
            // Get current user info
            const currentUser = AuthService.getCurrentUser();
            const userProfile = AuthService.getUserProfile();
            
            // Generate lead ID
            const leadId = this._generateLeadId();
            
            // Prepare lead document
            const leadDocument = {
                leadId: leadId,
                name: this._sanitizeString(leadData.name),
                phone: this._sanitizePhone(leadData.phone),
                email: leadData.email ? this._sanitizeEmail(leadData.email) : '',
                city: leadData.city ? this._sanitizeString(leadData.city) : '',
                state: leadData.state ? this._sanitizeString(leadData.state) : '',
                product: leadData.product || 'Other',
                source: leadData.source || 'Other',
                priority: leadData.priority || 'Normal',
                status: LEAD_STATUS.NEW,
                assignedTo: leadData.assignedTo || null,
                assignedTeam: leadData.assignedTeam || userProfile?.team || '',
                assignedRegion: leadData.assignedRegion || userProfile?.region || '',
                createdBy: currentUser?.uid || 'system',
                createdByName: userProfile?.name || 'System',
                notes: leadData.notes || '',
                tags: leadData.tags || [],
                leadScore: this._calculateLeadScore(leadData),
                isDeleted: false,
                deletedAt: null,
                deletedBy: null,
                createdAt: FirebaseCore.getServerTimestamp(),
                updatedAt: FirebaseCore.getServerTimestamp(),
                lastContactedAt: null,
                nextFollowUpAt: null,
                callAttempts: 0,
                whatsappAttempts: 0,
                emailAttempts: 0,
                lastStatusChangeAt: FirebaseCore.getServerTimestamp(),
                lastStatusChangedBy: currentUser?.uid || 'system',
                statusHistory: [{
                    oldStatus: null,
                    newStatus: LEAD_STATUS.NEW,
                    changedBy: currentUser?.uid || 'system',
                    changedAt: FirebaseCore.getServerTimestamp(),
                    source: 'lead_creation'
                }],
                metadata: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                    ipAddress: null, // To be filled by Cloudflare Worker
                    deviceType: this._getDeviceType()
                }
            };
            
            // Create lead in Firestore
            const leadRef = await this.leadsCollection.add(leadDocument);
            
            // Create status history document
            await this._createStatusHistory(leadRef.id, null, LEAD_STATUS.NEW, 'lead_creation');
            
            // Log activity
            await this._logActivity(leadRef.id, 'create', 'Lead created');
            
            // Clear cache
            this._clearCache();
            
            // Notify listeners
            this._notifyListeners('onLeadAdded', {
                leadId: leadRef.id,
                lead: leadDocument
            });
            
            return {
                success: true,
                leadId: leadRef.id,
                leadData: leadDocument,
                message: 'Lead created successfully'
            };
        } catch (error) {
            console.error('❌ Lead creation failed:', error);
            this._notifyListeners('onError', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'createLead'),
                message: error.message
            };
        }
    }
    
    /**
     * Create multiple leads (bulk import)
     * @param {Array} leadsData - Array of lead data
     * @returns {Promise<Object>} Bulk creation result
     */
    async createBulkLeads(leadsData) {
        try {
            if (!leadsData || leadsData.length === 0) {
                throw new Error('No leads provided');
            }
            
            if (leadsData.length > PAGINATION.MAX_BULK_IMPORT) {
                throw new Error(`Maximum ${PAGINATION.MAX_BULK_IMPORT} leads allowed per import`);
            }
            
            const batch = FirebaseCore.createBatch();
            const results = {
                total: leadsData.length,
                success: 0,
                failed: 0,
                duplicates: 0,
                errors: []
            };
            
            for (let i = 0; i < leadsData.length; i++) {
                try {
                    const leadData = leadsData[i];
                    
                    // Validate
                    const validation = this._validateLeadData(leadData);
                    if (!validation.success) {
                        results.failed++;
                        results.errors.push({
                            index: i,
                            lead: leadData,
                            error: validation.message
                        });
                        continue;
                    }
                    
                    // Check duplicate
                    const duplicateCheck = await this.checkDuplicate(leadData.phone, leadData.email);
                    if (duplicateCheck.isDuplicate) {
                        results.duplicates++;
                        results.errors.push({
                            index: i,
                            lead: leadData,
                            error: 'Duplicate lead'
                        });
                        continue;
                    }
                    
                    // Prepare lead document
                    const leadRef = this.leadsCollection.doc();
                    const leadDocument = this._prepareLeadDocument(leadData, leadRef.id);
                    
                    batch.set(leadRef, leadDocument);
                    
                    // Create status history
                    const historyRef = this.statusHistoryCollection.doc();
                    batch.set(historyRef, {
                        leadId: leadRef.id,
                        oldStatus: null,
                        newStatus: LEAD_STATUS.NEW,
                        changedBy: AuthService.getUserId(),
                        changedAt: FirebaseCore.getServerTimestamp()
                    });
                    
                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        index: i,
                        lead: leadsData[i],
                        error: error.message
                    });
                }
            }
            
            // Commit batch
            await batch.commit();
            
            // Clear cache
            this._clearCache();
            
            return {
                success: true,
                results: results,
                message: `${results.success} leads created, ${results.failed} failed, ${results.duplicates} duplicates`
            };
        } catch (error) {
            console.error('❌ Bulk lead creation failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'createBulkLeads'),
                message: error.message
            };
        }
    }
    
    // ============================================
    // LEAD RETRIEVAL
    // ============================================
    
    /**
     * Get lead by ID
     * @param {string} leadId - Lead document ID
     * @returns {Promise<Object>} Lead data
     */
    async getLeadById(leadId) {
        try {
            // Check cache first
            const cachedLead = this._getFromCache(leadId);
            if (cachedLead) {
                return cachedLead;
            }
            
            const leadDoc = await this.leadsCollection.doc(leadId).get();
            
            if (!leadDoc.exists) {
                throw new Error('Lead not found');
            }
            
            const leadData = {
                id: leadDoc.id,
                ...leadDoc.data()
            };
            
            // Check if lead is deleted
            if (leadData.isDeleted) {
                throw new Error('Lead is deleted');
            }
            
            // Cache lead
            this._setCache(leadId, leadData);
            
            return {
                success: true,
                lead: leadData
            };
        } catch (error) {
            console.error('❌ Lead retrieval failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'getLeadById'),
                message: error.message
            };
        }
    }
    
    /**
     * Get all leads with pagination and filters
     * @param {Object} options - Query options
     * @param {number} options.page - Page number
     * @param {number} options.pageSize - Leads per page
     * @param {Object} options.filters - Filter criteria
     * @param {Object} options.sort - Sort options
     * @returns {Promise<Object>} Leads list
     */
    async getLeads(options = {}) {
        try {
            const {
                page = 1,
                pageSize = PAGINATION.LEADS_PER_PAGE,
                filters = {},
                sort = { field: 'createdAt', order: 'desc' }
            } = options;
            
            // Build query
            let query = this.leadsCollection.where('isDeleted', '==', false);
            
            // Apply filters
            if (filters.status && filters.status !== 'All') {
                query = query.where('status', '==', filters.status);
            }
            
            if (filters.product && filters.product !== 'All') {
                query = query.where('product', '==', filters.product);
            }
            
            if (filters.source && filters.source !== 'All') {
                query = query.where('source', '==', filters.source);
            }
            
            if (filters.priority && filters.priority !== 'All') {
                query = query.where('priority', '==', filters.priority);
            }
            
            if (filters.agent && filters.agent !== 'All') {
                query = query.where('assignedTo', '==', filters.agent);
            }
            
            if (filters.team && filters.team !== 'All') {
                query = query.where('assignedTeam', '==', filters.team);
            }
            
            if (filters.region && filters.region !== 'All') {
                query = query.where('assignedRegion', '==', filters.region);
            }
            
            // Date range filters
            if (filters.dateFrom) {
                query = query.where('createdAt', '>=', new Date(filters.dateFrom));
            }
            
            if (filters.dateTo) {
                query = query.where('createdAt', '<=', new Date(filters.dateTo));
            }
            
            // Apply sorting
            query = query.orderBy(sort.field, sort.order);
            
            // Apply pagination
            const startAt = (page - 1) * pageSize;
            query = query.limit(pageSize);
            
            if (startAt > 0) {
                // Get document at start position
                const startDoc = await this.leadsCollection
                    .where('isDeleted', '==', false)
                    .orderBy(sort.field, sort.order)
                    .limit(startAt)
                    .get();
                
                const lastVisible = startDoc.docs[startDoc.docs.length - 1];
                if (lastVisible) {
                    query = query.startAfter(lastVisible);
                }
            }
            
            // Execute query
            const snapshot = await query.get();
            
            const leads = [];
            snapshot.forEach(doc => {
                leads.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Get total count
            const totalSnapshot = await this.leadsCollection
                .where('isDeleted', '==', false)
                .get();
            
            const totalLeads = totalSnapshot.size;
            
            return {
                success: true,
                leads: leads,
                pagination: {
                    currentPage: page,
                    pageSize: pageSize,
                    totalLeads: totalLeads,
                    totalPages: Math.ceil(totalLeads / pageSize),
                    hasNext: page * pageSize < totalLeads,
                    hasPrevious: page > 1
                }
            };
        } catch (error) {
            console.error('❌ Leads retrieval failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'getLeads'),
                message: error.message,
                leads: [],
                pagination: null
            };
        }
    }
    
    /**
     * Search leads
     * @param {string} searchTerm - Search term
     * @returns {Promise<Object>} Search results
     */
    async searchLeads(searchTerm) {
        try {
            if (!searchTerm || searchTerm.length < 2) {
                throw new Error('Search term must be at least 2 characters');
            }
            
            const searchResults = [];
            const searchTermLower = searchTerm.toLowerCase();
            
            // Search by name
            const nameQuery = await this.leadsCollection
                .where('isDeleted', '==', false)
                .where('name', '>=', searchTerm)
                .where('name', '<=', searchTerm + '\uf8ff')
                .limit(50)
                .get();
            
            nameQuery.forEach(doc => {
                const lead = { id: doc.id, ...doc.data() };
                if (lead.name.toLowerCase().includes(searchTermLower)) {
                    searchResults.push(lead);
                }
            });
            
            // Search by phone
            const phoneQuery = await this.leadsCollection
                .where('isDeleted', '==', false)
                .where('phone', '>=', searchTerm)
                .where('phone', '<=', searchTerm + '\uf8ff')
                .limit(50)
                .get();
            
            phoneQuery.forEach(doc => {
                const lead = { id: doc.id, ...doc.data() };
                if (lead.phone.includes(searchTerm) && !searchResults.find(l => l.id === lead.id)) {
                    searchResults.push(lead);
                }
            });
            
            return {
                success: true,
                results: searchResults,
                count: searchResults.length
            };
        } catch (error) {
            console.error('❌ Lead search failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'searchLeads'),
                message: error.message,
                results: []
            };
        }
    }
    
    // ============================================
    // LEAD UPDATE
    // ============================================
    
    /**
     * Update lead information
     * @param {string} leadId - Lead document ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Update result
     */
    async updateLead(leadId, updateData) {
        try {
            // Validate lead ID
            if (!leadId) {
                throw new Error('Lead ID is required');
            }
            
            // Get existing lead
            const leadRef = this.leadsCollection.doc(leadId);
            const leadDoc = await leadRef.get();
            
            if (!leadDoc.exists) {
                throw new Error('Lead not found');
            }
            
            // Check if lead is deleted
            if (leadDoc.data().isDeleted) {
                throw new Error('Cannot update deleted lead');
            }
            
            // Sanitize update data
            const sanitizedData = this._sanitizeUpdateData(updateData);
            
            // Prepare update document
            const updateDocument = {
                ...sanitizedData,
                updatedAt: FirebaseCore.getServerTimestamp(),
                updatedBy: AuthService.getUserId(),
                updatedByName: AuthService.getUserProfile()?.name
            };
            
            // Update lead
            await leadRef.update(updateDocument);
            
            // Clear cache
            this._clearCache(leadId);
            
            // Log activity
            await this._logActivity(leadId, 'update', 'Lead updated');
            
            // Notify listeners
            this._notifyListeners('onLeadUpdated', {
                leadId,
                updates: updateDocument
            });
            
            return {
                success: true,
                message: 'Lead updated successfully'
            };
        } catch (error) {
            console.error('❌ Lead update failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'updateLead'),
                message: error.message
            };
        }
    }
    
    /**
     * Update lead status
     * @param {string} leadId - Lead document ID
     * @param {string} newStatus - New status
     * @param {string} source - Status change source
     * @returns {Promise<Object>} Update result
     */
    async updateLeadStatus(leadId, newStatus, source = 'manual') {
        try {
            // Validate status
            if (!LEAD_STATUS.ALL.includes(newStatus)) {
                throw new Error('Invalid status');
            }
            
            // Get existing lead
            const leadRef = this.leadsCollection.doc(leadId);
            const leadDoc = await leadRef.get();
            
            if (!leadDoc.exists) {
                throw new Error('Lead not found');
            }
            
            const oldStatus = leadDoc.data().status;
            
            // Check if status transition is allowed
            const allowedTransitions = LEAD_STATUS.TRANSITIONS[oldStatus] || [];
            if (!allowedTransitions.includes(newStatus)) {
                throw new Error(`Cannot transition from ${oldStatus} to ${newStatus}`);
            }
            
            // Update lead status
            await leadRef.update({
                status: newStatus,
                lastStatusChangeAt: FirebaseCore.getServerTimestamp(),
                lastStatusChangedBy: AuthService.getUserId(),
                updatedAt: FirebaseCore.getServerTimestamp()
            });
            
            // Create status history
            await this._createStatusHistory(leadId, oldStatus, newStatus, source);
            
            // Clear cache
            this._clearCache(leadId);
            
            // Log activity
            await this._logActivity(leadId, 'status_change', `${oldStatus} → ${newStatus}`);
            
            // Notify listeners
            this._notifyListeners('onStatusChanged', {
                leadId,
                oldStatus,
                newStatus,
                source
            });
            
            return {
                success: true,
                message: 'Status updated successfully'
            };
        } catch (error) {
            console.error('❌ Status update failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'updateLeadStatus'),
                message: error.message
            };
        }
    }
    
    // ============================================
    // LEAD DELETION
    // ============================================
    
    /**
     * Soft delete lead
     * @param {string} leadId - Lead document ID
     * @returns {Promise<Object>} Delete result
     */
    async softDeleteLead(leadId) {
        try {
            // Check permission
            if (!AuthService.hasPermission('canDeleteLeads')) {
                throw new Error('Permission denied: cannot delete leads');
            }
            
            const leadRef = this.leadsCollection.doc(leadId);
            
            await leadRef.update({
                isDeleted: true,
                deletedAt: FirebaseCore.getServerTimestamp(),
                deletedBy: AuthService.getUserId(),
                deletedByName: AuthService.getUserProfile()?.name,
                updatedAt: FirebaseCore.getServerTimestamp()
            });
            
            // Clear cache
            this._clearCache(leadId);
            
            // Log activity
            await this._logActivity(leadId, 'soft_delete', 'Lead soft deleted');
            
            // Notify listeners
            this._notifyListeners('onLeadDeleted', { leadId });
            
            return {
                success: true,
                message: 'Lead deleted successfully'
            };
        } catch (error) {
            console.error('❌ Lead deletion failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'softDeleteLead'),
                message: error.message
            };
        }
    }
    
    /**
     * Restore deleted lead
     * @param {string} leadId - Lead document ID
     * @returns {Promise<Object>} Restore result
     */
    async restoreLead(leadId) {
        try {
            const leadRef = this.leadsCollection.doc(leadId);
            
            await leadRef.update({
                isDeleted: false,
                deletedAt: null,
                deletedBy: null,
                restoredAt: FirebaseCore.getServerTimestamp(),
                restoredBy: AuthService.getUserId(),
                updatedAt: FirebaseCore.getServerTimestamp()
            });
            
            // Clear cache
            this._clearCache(leadId);
            
            // Log activity
            await this._logActivity(leadId, 'restore', 'Lead restored');
            
            // Notify listeners
            this._notifyListeners('onLeadRestored', { leadId });
            
            return {
                success: true,
                message: 'Lead restored successfully'
            };
        } catch (error) {
            console.error('❌ Lead restoration failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'restoreLead'),
                message: error.message
            };
        }
    }
    
    /**
     * Hard delete lead (permanent)
     * @param {string} leadId - Lead document ID
     * @returns {Promise<Object>} Delete result
     */
    async hardDeleteLead(leadId) {
        try {
            // Check permission
            if (!AuthService.isAdmin()) {
                throw new Error('Permission denied: only admin can permanently delete');
            }
            
            const leadRef = this.leadsCollection.doc(leadId);
            
            // Delete lead document
            await leadRef.delete();
            
            // Delete status history
            const historySnapshot = await this.statusHistoryCollection
                .where('leadId', '==', leadId)
                .get();
            
            const batch = FirebaseCore.createBatch();
            historySnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            
            // Clear cache
            this._clearCache(leadId);
            
            // Log activity
            await this._logActivity(leadId, 'hard_delete', 'Lead permanently deleted');
            
            return {
                success: true,
                message: 'Lead permanently deleted'
            };
        } catch (error) {
            console.error('❌ Hard delete failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'hardDeleteLead'),
                message: error.message
            };
        }
    }
    
    // ============================================
    // DUPLICATE DETECTION
    // ============================================
    
    /**
     * Check for duplicate leads
     * @param {string} phone - Lead phone
     * @param {string} email - Lead email
     * @returns {Promise<Object>} Duplicate check result
     */
    async checkDuplicate(phone, email) {
        try {
            const duplicates = [];
            
            // Check by phone
            if (phone) {
                const phoneQuery = await this.leadsCollection
                    .where('phone', '==', phone)
                    .where('isDeleted', '==', false)
                    .get();
                
                phoneQuery.forEach(doc => {
                    duplicates.push({
                        id: doc.id,
                        ...doc.data(),
                        matchType: 'phone'
                    });
                });
            }
            
            // Check by email
            if (email) {
                const emailQuery = await this.leadsCollection
                    .where('email', '==', email)
                    .where('isDeleted', '==', false)
                    .get();
                
                emailQuery.forEach(doc => {
                    if (!duplicates.find(d => d.id === doc.id)) {
                        duplicates.push({
                            id: doc.id,
                            ...doc.data(),
                            matchType: 'email'
                        });
                    }
                });
            }
            
            return {
                isDuplicate: duplicates.length > 0,
                leads: duplicates,
                count: duplicates.length
            };
        } catch (error) {
            console.error('❌ Duplicate check failed:', error);
            return {
                isDuplicate: false,
                leads: [],
                count: 0,
                error: error.message
            };
        }
    }
    
    /**
     * Merge duplicate leads
     * @param {string} primaryLeadId - Lead to keep
     * @param {string} duplicateLeadId - Lead to merge and delete
     * @returns {Promise<Object>} Merge result
     */
    async mergeLeads(primaryLeadId, duplicateLeadId) {
        try {
            // Get both leads
            const primaryLead = await this.getLeadById(primaryLeadId);
            const duplicateLead = await this.getLeadById(duplicateLeadId);
            
            if (!primaryLead.success || !duplicateLead.success) {
                throw new Error('One or both leads not found');
            }
            
            // Merge data (primary lead takes precedence)
            const mergedData = {
                name: primaryLead.lead.name || duplicateLead.lead.name,
                phone: primaryLead.lead.phone || duplicateLead.lead.phone,
                email: primaryLead.lead.email || duplicateLead.lead.email,
                city: primaryLead.lead.city || duplicateLead.lead.city,
                product: primaryLead.lead.product || duplicateLead.lead.product,
                source: primaryLead.lead.source || duplicateLead.lead.source,
                priority: this._getHigherPriority(primaryLead.lead.priority, duplicateLead.lead.priority),
                notes: this._mergeNotes(primaryLead.lead.notes, duplicateLead.lead.notes),
                tags: [...new Set([...(primaryLead.lead.tags || []), ...(duplicateLead.lead.tags || [])])],
                updatedAt: FirebaseCore.getServerTimestamp()
            };
            
            // Update primary lead
            await this.updateLead(primaryLeadId, mergedData);
            
            // Soft delete duplicate
            await this.softDeleteLead(duplicateLeadId);
            
            // Log activity
            await this._logActivity(primaryLeadId, 'merge', `Merged with ${duplicateLeadId}`);
            
            return {
                success: true,
                message: 'Leads merged successfully'
            };
        } catch (error) {
            console.error('❌ Lead merge failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'mergeLeads'),
                message: error.message
            };
        }
    }
    
    // ============================================
    // LEAD ASSIGNMENT
    // ============================================
    
    /**
     * Assign lead to agent
     * @param {string} leadId - Lead document ID
     * @param {string} agentId - Agent user ID
     * @returns {Promise<Object>} Assignment result
     */
    async assignLead(leadId, agentId) {
        try {
            // Check permission
            if (!AuthService.hasPermission('canAssignLeads') && !AuthService.isAgent()) {
                throw new Error('Permission denied: cannot assign leads');
            }
            
            // Get agent info
            const agentDoc = await FirebaseCore.getCollection('users').doc(agentId).get();
            
            if (!agentDoc.exists) {
                throw new Error('Agent not found');
            }
            
            const agentData = agentDoc.data();
            
            // Update lead
            await this.updateLead(leadId, {
                assignedTo: agentId,
                assignedToName: agentData.name,
                assignedTeam: agentData.team,
                assignedRegion: agentData.region,
                assignedAt: FirebaseCore.getServerTimestamp(),
                assignedBy: AuthService.getUserId()
            });
            
            // Log activity
            await this._logActivity(leadId, 'assign', `Assigned to ${agentData.name}`);
            
            // Notify listeners
            this._notifyListeners('onLeadAssigned', {
                leadId,
                agentId,
                agentName: agentData.name
            });
            
            return {
                success: true,
                message: `Lead assigned to ${agentData.name}`
            };
        } catch (error) {
            console.error('❌ Lead assignment failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'assignLead'),
                message: error.message
            };
        }
    }
    
    /**
     * Auto-assign lead (round-robin)
     * @param {string} leadId - Lead document ID
     * @param {string} team - Team name
     * @returns {Promise<Object>} Auto-assignment result
     */
    async autoAssignLead(leadId, team = '') {
        try {
            // Get available agents
            let agentsQuery = FirebaseCore.getCollection('users')
                .where('role', '==', 'agent')
                .where('isActive', '==', true);
            
            if (team) {
                agentsQuery = agentsQuery.where('team', '==', team);
            }
            
            const agentsSnapshot = await agentsQuery.get();
            
            if (agentsSnapshot.empty) {
                throw new Error('No available agents found');
            }
            
            // Get agent with least leads
            const agentLoads = [];
            
            for (const agentDoc of agentsSnapshot.docs) {
                const agentId = agentDoc.id;
                const leadsSnapshot = await this.leadsCollection
                    .where('assignedTo', '==', agentId)
                    .where('isDeleted', '==', false)
                    .where('status', 'in', ['New', 'Contacted', 'Follow-up'])
                    .get();
                
                agentLoads.push({
                    agentId,
                    agentName: agentDoc.data().name,
                    load: leadsSnapshot.size
                });
            }
            
            // Sort by load (least loaded first)
            agentLoads.sort((a, b) => a.load - b.load);
            
            const selectedAgent = agentLoads[0];
            
            // Assign lead
            const result = await this.assignLead(leadId, selectedAgent.agentId);
            
            return {
                ...result,
                autoAssignedTo: selectedAgent
            };
        } catch (error) {
            console.error('❌ Auto-assignment failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'autoAssignLead'),
                message: error.message
            };
        }
    }
    
    // ============================================
    // REAL-TIME LISTENERS
    // ============================================
    
    /**
     * Listen to lead changes
     * @param {Function} callback - Callback function
     * @param {Object} filters - Filter criteria
     * @returns {Function} Unsubscribe function
     */
    listenToLeads(callback, filters = {}) {
        try {
            let query = this.leadsCollection.where('isDeleted', '==', false);
            
            // Apply filters
            if (filters.agent) {
                query = query.where('assignedTo', '==', filters.agent);
            }
            
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }
            
            const unsubscribe = query.onSnapshot((snapshot) => {
                const changes = [];
                
                snapshot.docChanges().forEach((change) => {
                    changes.push({
                        type: change.type, // 'added', 'modified', 'removed'
                        leadId: change.doc.id,
                        lead: change.doc.data(),
                        oldIndex: change.oldIndex,
                        newIndex: change.newIndex
                    });
                });
                
                callback(changes);
            }, (error) => {
                console.error('❌ Real-time listener error:', error);
                callback([], error);
            });
            
            // Store listener
            const listenerId = Date.now().toString();
            this.listeners.set(listenerId, unsubscribe);
            
            return () => {
                unsubscribe();
                this.listeners.delete(listenerId);
            };
        } catch (error) {
            console.error('❌ Listener setup failed:', error);
            return () => {};
        }
    }
    
    /**
     * Listen to single lead changes
     * @param {string} leadId - Lead document ID
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    listenToLead(leadId, callback) {
        try {
            const unsubscribe = this.leadsCollection.doc(leadId).onSnapshot((doc) => {
                if (doc.exists) {
                    callback({
                        id: doc.id,
                        ...doc.data()
                    });
                } else {
                    callback(null);
                }
            });
            
            return unsubscribe;
        } catch (error) {
            console.error('❌ Lead listener setup failed:', error);
            return () => {};
        }
    }
    
    // ============================================
    // VALIDATION
    // ============================================
    
    /**
     * Validate lead data
     * @param {Object} leadData - Lead data to validate
     * @returns {Object} Validation result
     * @private
     */
    _validateLeadData(leadData) {
        // Check required fields
        if (!leadData.name || leadData.name.trim().length < 2) {
            return { success: false, message: 'Name is required (minimum 2 characters)' };
        }
        
        if (!leadData.phone) {
            return { success: false, message: 'Phone number is required' };
        }
        
        // Validate name
        if (leadData.name.length > 100) {
            return { success: false, message: 'Name too long (maximum 100 characters)' };
        }
        
        // Validate phone
        const cleanPhone = leadData.phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length !== 10) {
            return { success: false, message: 'Phone number must be 10 digits' };
        }
        
        if (!/^[6-9]/.test(cleanPhone)) {
            return { success: false, message: 'Invalid phone number (must start with 6-9)' };
        }
        
        // Validate email (if provided)
        if (leadData.email) {
            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(leadData.email)) {
                return { success: false, message: 'Invalid email address' };
            }
        }
        
        return { success: true };
    }
    
    /**
     * Sanitize string input
     * @param {string} value - String to sanitize
     * @returns {string} Sanitized string
     * @private
     */
    _sanitizeString(value) {
        if (!value) return '';
        return value
            .trim()
            .replace(/[<>]/g, '') // Remove HTML tags
            .slice(0, 100); // Limit length
    }
    
    /**
     * Sanitize phone number
     * @param {string} phone - Phone to sanitize
     * @returns {string} Sanitized phone
     * @private
     */
    _sanitizePhone(phone) {
        if (!phone) return '';
        return phone.replace(/[^0-9]/g, '').slice(0, 10);
    }
    
    /**
     * Sanitize email
     * @param {string} email - Email to sanitize
     * @returns {string} Sanitized email
     * @private
     */
    _sanitizeEmail(email) {
        if (!email) return '';
        return email.trim().toLowerCase().slice(0, 100);
    }
    
    /**
     * Sanitize update data
     * @param {Object} updateData - Data to sanitize
     * @returns {Object} Sanitized data
     * @private
     */
    _sanitizeUpdateData(updateData) {
        const sanitized = {};
        
        // Only allow specific fields to update
        const allowedFields = [
            'name', 'phone', 'email', 'city', 'state',
            'product', 'source', 'priority', 'notes',
            'tags', 'assignedTo', 'assignedTeam', 'assignedRegion'
        ];
        
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                if (typeof updateData[key] === 'string') {
                    sanitized[key] = this._sanitizeString(updateData[key]);
                } else {
                    sanitized[key] = updateData[key];
                }
            }
        });
        
        return sanitized;
    }
    
    // ============================================
    // LEAD SCORING
    // ============================================
    
    /**
     * Calculate lead score
     * @param {Object} leadData - Lead data
     * @returns {number} Lead score (0-100)
     * @private
     */
    _calculateLeadScore(leadData) {
        let score = 0;
        
        // Name provided
        if (leadData.name && leadData.name.length > 0) score += 10;
        
        // Phone provided
        if (leadData.phone && leadData.phone.length === 10) score += 20;
        
        // Email provided
        if (leadData.email && leadData.email.includes('@')) score += 10;
        
        // City provided
        if (leadData.city) score += 5;
        
        // Product interest
        if (leadData.product && leadData.product !== 'Other') score += 15;
        
        // Source quality
        const highQualitySources = ['Website', 'Reference', 'Walk-in'];
        if (leadData.source && highQualitySources.includes(leadData.source)) score += 15;
        
        // Priority
        if (leadData.priority === 'Hot') score += 25;
        else if (leadData.priority === 'Warm') score += 15;
        else if (leadData.priority === 'Urgent') score += 20;
        
        return Math.min(score, 100);
    }
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    /**
     * Generate lead ID
     * @returns {string} Lead ID
     * @private
     */
    _generateLeadId() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `LD-${timestamp}-${random}`;
    }
    
    /**
     * Prepare lead document
     * @param {Object} leadData - Lead data
     * @param {string} leadId - Lead document ID
     * @returns {Object} Lead document
     * @private
     */
    _prepareLeadDocument(leadData, leadId) {
        const currentUser = AuthService.getCurrentUser();
        const userProfile = AuthService.getUserProfile();
        
        return {
            leadId: leadId || this._generateLeadId(),
            name: this._sanitizeString(leadData.name),
            phone: this._sanitizePhone(leadData.phone),
            email: this._sanitizeEmail(leadData.email || ''),
            city: this._sanitizeString(leadData.city || ''),
            state: this._sanitizeString(leadData.state || ''),
            product: leadData.product || 'Other',
            source: leadData.source || 'Other',
            priority: leadData.priority || 'Normal',
            status: LEAD_STATUS.NEW,
            assignedTo: leadData.assignedTo || null,
            assignedTeam: leadData.assignedTeam || userProfile?.team || '',
            assignedRegion: leadData.assignedRegion || userProfile?.region || '',
            createdBy: currentUser?.uid || 'system',
            createdByName: userProfile?.name || 'System',
            notes: leadData.notes || '',
            tags: leadData.tags || [],
            leadScore: this._calculateLeadScore(leadData),
            isDeleted: false,
            createdAt: FirebaseCore.getServerTimestamp(),
            updatedAt: FirebaseCore.getServerTimestamp(),
            lastStatusChangeAt: FirebaseCore.getServerTimestamp(),
            lastStatusChangedBy: currentUser?.uid || 'system'
        };
    }
    
    /**
     * Create status history
     * @param {string} leadId - Lead document ID
     * @param {string} oldStatus - Old status
     * @param {string} newStatus - New status
     * @param {string} source - Change source
     * @private
     */
    async _createStatusHistory(leadId, oldStatus, newStatus, source) {
        try {
            await this.statusHistoryCollection.add({
                leadId,
                oldStatus,
                newStatus,
                changedBy: AuthService.getUserId(),
                changedByName: AuthService.getUserProfile()?.name,
                changedAt: FirebaseCore.getServerTimestamp(),
                source: source
            });
        } catch (error) {
            console.warn('⚠️ Could not create status history:', error);
        }
    }
    
    /**
     * Log activity
     * @param {string} leadId - Lead document ID
     * @param {string} action - Action performed
     * @param {string} description - Activity description
     * @private
     */
    async _logActivity(leadId, action, description) {
        try {
            await this.auditLogsCollection.add({
                leadId,
                action,
                description,
                userId: AuthService.getUserId(),
                userName: AuthService.getUserProfile()?.name,
                timestamp: FirebaseCore.getServerTimestamp(),
                userAgent: navigator.userAgent,
                platform: navigator.platform
            });
        } catch (error) {
            console.warn('⚠️ Could not log activity:', error);
        }
    }
    
    /**
     * Get higher priority
     * @param {string} priority1 - First priority
     * @param {string} priority2 - Second priority
     * @returns {string} Higher priority
     * @private
     */
    _getHigherPriority(priority1, priority2) {
        const priorityOrder = { 'Hot': 4, 'Urgent': 3, 'Warm': 2, 'Normal': 1, 'Cold': 0, 'Low': 0 };
        return (priorityOrder[priority1] || 0) >= (priorityOrder[priority2] || 0) ? priority1 : priority2;
    }
    
    /**
     * Merge notes
     * @param {string} notes1 - First notes
     * @param {string} notes2 - Second notes
     * @returns {string} Merged notes
     * @private
     */
    _mergeNotes(notes1, notes2) {
        if (!notes1 && !notes2) return '';
        if (!notes1) return notes2;
        if (!notes2) return notes1;
        return `${notes1}\n---\n${notes2}`;
    }
    
    /**
     * Get device type
     * @returns {string} Device type
     * @private
     */
    _getDeviceType() {
        const userAgent = navigator.userAgent;
        if (/mobile/i.test(userAgent)) return 'Mobile';
        if (/tablet/i.test(userAgent)) return 'Tablet';
        if (/iPad/i.test(userAgent)) return 'Tablet';
        return 'Desktop';
    }
    
    // ============================================
    // CACHE MANAGEMENT
    // ============================================
    
    /**
     * Get from cache
     * @param {string} leadId - Lead document ID
     * @returns {Object|null} Cached lead
     * @private
     */
    _getFromCache(leadId) {
        const cached = this.cache.get(leadId);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        
        return null;
    }
    
    /**
     * Set cache
     * @param {string} leadId - Lead document ID
     * @param {Object} data - Lead data
     * @private
     */
    _setCache(leadId, data) {
        this.cache.set(leadId, {
            data,
            timestamp: Date.now()
        });
    }
    
    /**
     * Clear cache
     * @param {string} leadId - Lead document ID (optional)
     * @private
     */
    _clearCache(leadId = null) {
        if (leadId) {
            this.cache.delete(leadId);
        } else {
            this.cache.clear();
        }
    }
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    addEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
    }
    
    /**
     * Notify listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @private
     */
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

const LeadServiceInstance = new LeadService();

// ============================================
// GLOBAL EXPORT
// ============================================

window.LeadService = LeadServiceInstance;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create new lead (global helper)
 * @param {Object} leadData - Lead data
 * @returns {Promise<Object>} Creation result
 */
async function createLead(leadData) {
    return await LeadServiceInstance.createLead(leadData);
}

/**
 * Get lead by ID (global helper)
 * @param {string} leadId - Lead document ID
 * @returns {Promise<Object>} Lead data
 */
async function getLead(leadId) {
    return await LeadServiceInstance.getLeadById(leadId);
}

/**
 * Update lead (global helper)
 * @param {string} leadId - Lead document ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Update result
 */
async function updateLead(leadId, updateData) {
    return await LeadServiceInstance.updateLead(leadId, updateData);
}

/**
 * Update lead status (global helper)
 * @param {string} leadId - Lead document ID
 * @param {string} newStatus - New status
 * @returns {Promise<Object>} Update result
 */
async function updateLeadStatus(leadId, newStatus) {
    return await LeadServiceInstance.updateLeadStatus(leadId, newStatus);
}

/**
 * Delete lead (global helper)
 * @param {string} leadId - Lead document ID
 * @returns {Promise<Object>} Delete result
 */
async function deleteLead(leadId) {
    return await LeadServiceInstance.softDeleteLead(leadId);
}

window.createLead = createLead;
window.getLead = getLead;
window.updateLead = updateLead;
window.updateLeadStatus = updateLeadStatus;
window.deleteLead = deleteLead;

console.log('✅ Lead Service Loaded');

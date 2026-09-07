/**
 * ============================================================
 * AAHAR SHUDHI - STATUS MANAGEMENT SERVICE
 * ============================================================
 * @description Enterprise-grade status tracking system
 * @version 1.0.0
 * @priority HIGH - Core Feature
 * 
 * This service handles:
 * - Lead status management
 * - Status transition validation
 * - Status history tracking
 * - SLA (Service Level Agreement) monitoring
 * - Status analytics
 * - Auto status updates
 * - Bulk status operations
 * - Status workflow customization
 * - Status change notifications
 * - Time-in-status tracking
 * ============================================================
 */

class StatusService {
    constructor() {
        // Service state
        this.db = FirebaseCore.getDb();
        this.leadsCollection = FirebaseCore.getCollection('leads');
        this.statusHistoryCollection = FirebaseCore.getCollection('statusHistory');
        
        // Status workflow definition
        this.workflow = {
            // All defined statuses
            statuses: [
                {
                    id: 'new',
                    name: LEAD_STATUS.NEW,
                    label: 'New Lead',
                    description: 'Lead just created, no contact made',
                    color: STATUS_COLORS[LEAD_STATUS.NEW].background,
                    textColor: STATUS_COLORS[LEAD_STATUS.NEW].text,
                    borderColor: STATUS_COLORS[LEAD_STATUS.NEW].border,
                    icon: '🆕',
                    order: 1,
                    isInitial: true,
                    isFinal: false,
                    allowedTransitions: ['contacted', 'not_interested'],
                    slaTimeLimit: 1, // 1 hour
                    autoActions: []
                },
                {
                    id: 'contacted',
                    name: LEAD_STATUS.CONTACTED,
                    label: 'Contacted',
                    description: 'First contact made with lead',
                    color: STATUS_COLORS[LEAD_STATUS.CONTACTED].background,
                    textColor: STATUS_COLORS[LEAD_STATUS.CONTACTED].text,
                    borderColor: STATUS_COLORS[LEAD_STATUS.CONTACTED].border,
                    icon: '📞',
                    order: 2,
                    isInitial: false,
                    isFinal: false,
                    allowedTransitions: ['follow_up', 'interested', 'not_interested'],
                    slaTimeLimit: 24, // 24 hours
                    autoActions: []
                },
                {
                    id: 'follow_up',
                    name: LEAD_STATUS.FOLLOW_UP,
                    label: 'Follow-up',
                    description: 'Scheduled for follow-up contact',
                    color: STATUS_COLORS[LEAD_STATUS.FOLLOW_UP].background,
                    textColor: STATUS_COLORS[LEAD_STATUS.FOLLOW_UP].text,
                    borderColor: STATUS_COLORS[LEAD_STATUS.FOLLOW_UP].border,
                    icon: '⏰',
                    order: 3,
                    isInitial: false,
                    isFinal: false,
                    allowedTransitions: ['contacted', 'interested', 'not_interested', 'closed'],
                    slaTimeLimit: 48, // 48 hours
                    autoActions: ['remind_followup']
                },
                {
                    id: 'interested',
                    name: LEAD_STATUS.INTERESTED,
                    label: 'Interested',
                    description: 'Lead showed interest in product',
                    color: STATUS_COLORS[LEAD_STATUS.INTERESTED].background,
                    textColor: STATUS_COLORS[LEAD_STATUS.INTERESTED].text,
                    borderColor: STATUS_COLORS[LEAD_STATUS.INTERESTED].border,
                    icon: '💚',
                    order: 4,
                    isInitial: false,
                    isFinal: false,
                    allowedTransitions: ['follow_up', 'closed', 'not_interested'],
                    slaTimeLimit: 24, // 24 hours
                    autoActions: ['notify_agent', 'flag_priority']
                },
                {
                    id: 'not_interested',
                    name: LEAD_STATUS.NOT_INTERESTED,
                    label: 'Not Interested',
                    description: 'Lead declined or not interested',
                    color: STATUS_COLORS[LEAD_STATUS.NOT_INTERESTED].background,
                    textColor: STATUS_COLORS[LEAD_STATUS.NOT_INTERESTED].text,
                    borderColor: STATUS_COLORS[LEAD_STATUS.NOT_INTERESTED].border,
                    icon: '❌',
                    order: 5,
                    isInitial: false,
                    isFinal: false,
                    allowedTransitions: ['contacted', 'closed'],
                    slaTimeLimit: null,
                    autoActions: []
                },
                {
                    id: 'closed',
                    name: LEAD_STATUS.CLOSED,
                    label: 'Closed',
                    description: 'Lead journey completed',
                    color: STATUS_COLORS[LEAD_STATUS.CLOSED].background,
                    textColor: STATUS_COLORS[LEAD_STATUS.CLOSED].text,
                    borderColor: STATUS_COLORS[LEAD_STATUS.CLOSED].border,
                    icon: '✅',
                    order: 6,
                    isInitial: false,
                    isFinal: true,
                    allowedTransitions: [],
                    slaTimeLimit: null,
                    autoActions: []
                }
            ],
            
            // Status transition rules
            transitionRules: [
                {
                    from: 'new',
                    to: 'contacted',
                    requiresNote: true,
                    requiresCallAttempt: true,
                    autoUpdateLead: true
                },
                {
                    from: 'contacted',
                    to: 'follow_up',
                    requiresNote: true,
                    requiresFollowupDate: true,
                    autoUpdateLead: true
                },
                {
                    from: 'follow_up',
                    to: 'interested',
                    requiresNote: true,
                    autoUpdateLead: true
                },
                {
                    from: 'interested',
                    to: 'closed',
                    requiresNote: true,
                    requiresOrderDetails: true,
                    autoUpdateLead: true
                }
            ]
        };
        
        // SLA tracking
        this.slaConfig = {
            enabled: true,
            checkInterval: 5 * 60 * 1000, // Check every 5 minutes
            breachThresholds: {
                warning: 0.8, // 80% of time limit
                critical: 1.0 // 100% of time limit
            },
            notifyOnBreach: true
        };
        
        // Cache
        this.cache = new Map();
        this.cacheTimeout = 2 * 60 * 1000;
        
        // Event listeners
        this.eventListeners = {
            onStatusChanged: [],
            onTransitionValidated: [],
            onTransitionBlocked: [],
            onSLABreach: [],
            onSLAWarning: [],
            onHistoryRecorded: [],
            onError: []
        };
        
        // SLA check timer
        this.slaCheckTimer = null;
        
        console.log('✅ Status Service initialized');
    }
    
    // ============================================
    // STATUS WORKFLOW MANAGEMENT
    // ============================================
    
    /**
     * Get all statuses
     * @returns {Array} Status definitions
     */
    getAllStatuses() {
        return this.workflow.statuses;
    }
    
    /**
     * Get status by name
     * @param {string} statusName - Status name
     * @returns {Object|null} Status definition
     */
    getStatusByName(statusName) {
        return this.workflow.statuses.find(s => s.name === statusName) || null;
    }
    
    /**
     * Get status by ID
     * @param {string} statusId - Status ID
     * @returns {Object|null} Status definition
     */
    getStatusById(statusId) {
        return this.workflow.statuses.find(s => s.id === statusId) || null;
    }
    
    /**
     * Get initial status
     * @returns {Object|null} Initial status
     */
    getInitialStatus() {
        return this.workflow.statuses.find(s => s.isInitial) || null;
    }
    
    /**
     * Get final statuses
     * @returns {Array} Final statuses
     */
    getFinalStatuses() {
        return this.workflow.statuses.filter(s => s.isFinal);
    }
    
    /**
     * Get allowed transitions for status
     * @param {string} statusName - Current status name
     * @returns {Array} Allowed transition status names
     */
    getAllowedTransitions(statusName) {
        const status = this.getStatusByName(statusName);
        if (!status) return [];
        
        return status.allowedTransitions.map(transitionId => {
            const targetStatus = this.workflow.statuses.find(s => s.id === transitionId);
            return targetStatus ? targetStatus.name : null;
        }).filter(Boolean);
    }
    
    // ============================================
    // STATUS CHANGE OPERATIONS
    // ============================================
    
    /**
     * Change lead status
     * @param {string} leadId - Lead document ID
     * @param {string} newStatusName - New status name
     * @param {Object} options - Change options
     * @param {string} options.source - Change source
     * @param {string} options.note - Status change note
     * @param {boolean} options.validateTransition - Validate transition
     * @param {boolean} options.autoUpdate - Auto update lead
     * @returns {Promise<Object>} Change result
     */
    async changeStatus(leadId, newStatusName, options = {}) {
        try {
            // Validate lead ID
            if (!leadId) {
                throw new Error('Lead ID is required');
            }
            
            // Validate new status
            const newStatus = this.getStatusByName(newStatusName);
            if (!newStatus) {
                throw new Error(`Invalid status: ${newStatusName}`);
            }
            
            // Get existing lead
            const leadRef = this.leadsCollection.doc(leadId);
            const leadDoc = await leadRef.get();
            
            if (!leadDoc.exists) {
                throw new Error('Lead not found');
            }
            
            const leadData = leadDoc.data();
            const oldStatusName = leadData.status || LEAD_STATUS.NEW;
            
            // Check if status is same
            if (oldStatusName === newStatusName) {
                return {
                    success: true,
                    noChange: true,
                    message: 'Status unchanged'
                };
            }
            
            // Validate transition if required
            if (options.validateTransition !== false) {
                const validation = this._validateTransition(oldStatusName, newStatusName, options);
                if (!validation.allowed) {
                    this._notifyListeners('onTransitionBlocked', {
                        leadId,
                        oldStatus: oldStatusName,
                        newStatus: newStatusName,
                        reason: validation.reason
                    });
                    
                    return {
                        success: false,
                        blocked: true,
                        reason: validation.reason,
                        message: `Transition blocked: ${validation.reason}`
                    };
                }
                
                this._notifyListeners('onTransitionValidated', {
                    leadId,
                    oldStatus: oldStatusName,
                    newStatus: newStatusName
                });
            }
            
            // Prepare update data
            const updateData = {
                status: newStatusName,
                lastStatusChangeAt: FirebaseCore.getServerTimestamp(),
                lastStatusChangedBy: AuthService.getUserId(),
                lastStatusChangedByName: AuthService.getUserProfile()?.name,
                updatedAt: FirebaseCore.getServerTimestamp()
            };
            
            // Auto-update lead if required
            if (options.autoUpdate !== false) {
                await leadRef.update(updateData);
            }
            
            // Create status history
            const historyRecord = await this._recordStatusHistory(
                leadId,
                oldStatusName,
                newStatusName,
                options
            );
            
            // Run auto actions for new status
            await this._runAutoActions(leadId, newStatus, leadData);
            
            // Clear cache
            this._clearCache(leadId);
            
            // Log activity
            await this._logActivity(leadId, oldStatusName, newStatusName, options);
            
            // Notify listeners
            this._notifyListeners('onStatusChanged', {
                leadId,
                oldStatus: oldStatusName,
                newStatus: newStatusName,
                source: options.source || 'manual',
                historyId: historyRecord.id,
                note: options.note || ''
            });
            
            return {
                success: true,
                leadId: leadId,
                oldStatus: oldStatusName,
                newStatus: newStatusName,
                historyId: historyRecord.id,
                message: `Status changed from ${oldStatusName} to ${newStatusName}`
            };
        } catch (error) {
            console.error('❌ Status change failed:', error);
            this._notifyListeners('onError', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'changeStatus'),
                message: error.message
            };
        }
    }
    
    /**
     * Bulk change status
     * @param {Array} leadIds - Lead document IDs
     * @param {string} newStatusName - New status name
     * @param {Object} options - Change options
     * @returns {Promise<Object>} Bulk change result
     */
    async bulkChangeStatus(leadIds, newStatusName, options = {}) {
        try {
            if (!leadIds || leadIds.length === 0) {
                throw new Error('No leads provided');
            }
            
            const results = {
                total: leadIds.length,
                success: 0,
                failed: 0,
                blocked: 0,
                errors: []
            };
            
            const batch = FirebaseCore.createBatch();
            
            for (const leadId of leadIds) {
                try {
                    const leadRef = this.leadsCollection.doc(leadId);
                    const leadDoc = await leadRef.get();
                    
                    if (!leadDoc.exists) {
                        throw new Error('Lead not found');
                    }
                    
                    const oldStatusName = leadDoc.data().status;
                    
                    // Validate transition
                    const validation = this._validateTransition(oldStatusName, newStatusName, options);
                    if (!validation.allowed) {
                        results.blocked++;
                        results.errors.push({
                            leadId,
                            error: validation.reason
                        });
                        continue;
                    }
                    
                    batch.update(leadRef, {
                        status: newStatusName,
                        lastStatusChangeAt: FirebaseCore.getServerTimestamp(),
                        lastStatusChangedBy: AuthService.getUserId(),
                        updatedAt: FirebaseCore.getServerTimestamp()
                    });
                    
                    // Create history record
                    const historyRef = this.statusHistoryCollection.doc();
                    batch.set(historyRef, {
                        leadId,
                        oldStatus: oldStatusName,
                        newStatus: newStatusName,
                        changedBy: AuthService.getUserId(),
                        changedByName: AuthService.getUserProfile()?.name,
                        changedAt: FirebaseCore.getServerTimestamp(),
                        source: options.source || 'bulk',
                        note: options.note || ''
                    });
                    
                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        leadId,
                        error: error.message
                    });
                }
            }
            
            await batch.commit();
            
            return {
                success: true,
                results: results,
                message: `${results.success} updated, ${results.blocked} blocked, ${results.failed} failed`
            };
        } catch (error) {
            console.error('❌ Bulk status change failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // ============================================
    // TRANSITION VALIDATION
    // ============================================
    
    /**
     * Validate status transition
     * @param {string} oldStatusName - Old status name
     * @param {string} newStatusName - New status name
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     * @private
     */
    _validateTransition(oldStatusName, newStatusName, options = {}) {
        const oldStatus = this.getStatusByName(oldStatusName);
        const newStatus = this.getStatusByName(newStatusName);
        
        if (!oldStatus || !newStatus) {
            return {
                allowed: false,
                reason: 'Invalid status'
            };
        }
        
        // Check if transition is allowed
        if (!oldStatus.allowedTransitions.includes(newStatus.id)) {
            return {
                allowed: false,
                reason: `Transition from ${oldStatusName} to ${newStatusName} is not allowed`
            };
        }
        
        // Check specific transition rules
        const transitionRule = this.workflow.transitionRules.find(
            rule => rule.from === oldStatus.id && rule.to === newStatus.id
        );
        
        if (transitionRule) {
            if (transitionRule.requiresNote && !options.note) {
                return {
                    allowed: false,
                    reason: 'Note is required for this transition'
                };
            }
            
            if (transitionRule.requiresFollowupDate && !options.followupDate) {
                return {
                    allowed: false,
                    reason: 'Follow-up date is required for this transition'
                };
            }
            
            if (transitionRule.requiresCallAttempt && !options.callAttempted) {
                return {
                    allowed: false,
                    reason: 'Call attempt is required for this transition'
                };
            }
            
            if (transitionRule.requiresOrderDetails && !options.orderDetails) {
                return {
                    allowed: false,
                    reason: 'Order details are required for this transition'
                };
            }
        }
        
        return {
            allowed: true
        };
    }
    
    /**
     * Check if transition is allowed
     * @param {string} fromStatus - From status
     * @param {string} toStatus - To status
     * @returns {boolean} Is allowed
     */
    canTransition(fromStatus, toStatus) {
        const status = this.getStatusByName(fromStatus);
        if (!status) return false;
        
        const targetStatus = this.getStatusByName(toStatus);
        if (!targetStatus) return false;
        
        return status.allowedTransitions.includes(targetStatus.id);
    }
    
    // ============================================
    // STATUS HISTORY
    // ============================================
    
    /**
     * Record status history
     * @param {string} leadId - Lead document ID
     * @param {string} oldStatus - Old status
     * @param {string} newStatus - New status
     * @param {Object} options - Options
     * @returns {Promise<Object>} History record
     * @private
     */
    async _recordStatusHistory(leadId, oldStatus, newStatus, options = {}) {
        try {
            const historyRef = await this.statusHistoryCollection.add({
                leadId,
                oldStatus,
                newStatus,
                changedBy: AuthService.getUserId(),
                changedByName: AuthService.getUserProfile()?.name,
                changedAt: FirebaseCore.getServerTimestamp(),
                source: options.source || 'manual',
                note: options.note || '',
                deviceType: this._getDeviceType(),
                ipAddress: null
            });
            
            this._notifyListeners('onHistoryRecorded', {
                historyId: historyRef.id,
                leadId,
                oldStatus,
                newStatus
            });
            
            return {
                id: historyRef.id
            };
        } catch (error) {
            console.warn('⚠️ Could not record status history:', error);
            return { id: null };
        }
    }
    
    /**
     * Get status history for lead
     * @param {string} leadId - Lead document ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Status history
     */
    async getStatusHistory(leadId, options = {}) {
        try {
            const {
                limit = 50,
                orderBy = 'changedAt',
                orderDirection = 'desc'
            } = options;
            
            const snapshot = await this.statusHistoryCollection
                .where('leadId', '==', leadId)
                .orderBy(orderBy, orderDirection)
                .limit(limit)
                .get();
            
            const history = [];
            snapshot.forEach(doc => {
                history.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return {
                success: true,
                history: history,
                count: history.length
            };
        } catch (error) {
            console.error('❌ Status history retrieval failed:', error);
            return {
                success: false,
                message: error.message,
                history: []
            };
        }
    }
    
    /**
     * Get time spent in each status
     * @param {string} leadId - Lead document ID
     * @returns {Promise<Object>} Time analysis
     */
    async getTimeInStatus(leadId) {
        try {
            const historyResult = await this.getStatusHistory(leadId, {
                orderBy: 'changedAt',
                orderDirection: 'asc'
            });
            
            if (!historyResult.success) {
                throw new Error(historyResult.message);
            }
            
            const timeAnalysis = {};
            const history = historyResult.history;
            
            for (let i = 0; i < history.length; i++) {
                const record = history[i];
                const status = record.newStatus;
                
                if (!timeAnalysis[status]) {
                    timeAnalysis[status] = {
                        status: status,
                        entries: 0,
                        totalTimeMs: 0,
                        averageTimeMs: 0,
                        minTimeMs: Infinity,
                        maxTimeMs: 0
                    };
                }
                
                timeAnalysis[status].entries++;
                
                // Calculate time in status
                if (i < history.length - 1) {
                    const currentTime = record.changedAt?.toDate();
                    const nextTime = history[i + 1].changedAt?.toDate();
                    
                    if (currentTime && nextTime) {
                        const timeDiff = nextTime - currentTime;
                        timeAnalysis[status].totalTimeMs += timeDiff;
                        timeAnalysis[status].minTimeMs = Math.min(timeAnalysis[status].minTimeMs, timeDiff);
                        timeAnalysis[status].maxTimeMs = Math.max(timeAnalysis[status].maxTimeMs, timeDiff);
                    }
                }
            }
            
            // Calculate averages
            Object.values(timeAnalysis).forEach(analysis => {
                analysis.averageTimeMs = analysis.entries > 0 ? 
                    analysis.totalTimeMs / analysis.entries : 0;
                
                // Convert to readable format
                analysis.totalTime = this._formatDuration(analysis.totalTimeMs);
                analysis.averageTime = this._formatDuration(analysis.averageTimeMs);
                analysis.minTime = analysis.minTimeMs === Infinity ? 'N/A' : this._formatDuration(analysis.minTimeMs);
                analysis.maxTime = this._formatDuration(analysis.maxTimeMs);
            });
            
            return {
                success: true,
                timeAnalysis: timeAnalysis
            };
        } catch (error) {
            console.error('❌ Time in status calculation failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // ============================================
    // SLA MONITORING
    // ============================================
    
    /**
     * Start SLA monitoring
     */
    startSLAMonitoring() {
        if (!this.slaConfig.enabled) return;
        
        if (this.slaCheckTimer) {
            clearInterval(this.slaCheckTimer);
        }
        
        this.slaCheckTimer = setInterval(async () => {
            await this._checkSLA();
        }, this.slaConfig.checkInterval);
        
        console.log('✅ SLA monitoring started');
    }
    
    /**
     * Stop SLA monitoring
     */
    stopSLAMonitoring() {
        if (this.slaCheckTimer) {
            clearInterval(this.slaCheckTimer);
            this.slaCheckTimer = null;
        }
    }
    
    /**
     * Check SLA compliance
     * @private
     */
    async _checkSLA() {
        try {
            const now = new Date();
            
            // Get leads with SLA limits
            const snapshot = await this.leadsCollection
                .where('isDeleted', '==', false)
                .get();
            
            snapshot.forEach(async (doc) => {
                const lead = doc.data();
                const leadId = doc.id;
                
                const status = this.getStatusByName(lead.status);
                
                if (!status || !status.slaTimeLimit) return;
                
                const statusChangeTime = lead.lastStatusChangeAt?.toDate();
                
                if (!statusChangeTime) return;
                
                const timeInStatus = now - statusChangeTime;
                const slaTimeLimitMs = status.slaTimeLimit * 60 * 60 * 1000;
                
                // Check warning threshold
                const warningThreshold = slaTimeLimitMs * this.slaConfig.thresholds.warning;
                
                if (timeInStatus >= warningThreshold && timeInStatus < slaTimeLimitMs) {
                    this._notifyListeners('onSLAWarning', {
                        leadId,
                        status: lead.status,
                        timeInStatus: this._formatDuration(timeInStatus),
                        timeLimit: status.slaTimeLimit + ' hours',
                        remaining: this._formatDuration(slaTimeLimitMs - timeInStatus)
                    });
                }
                
                // Check breach
                if (timeInStatus >= slaTimeLimitMs) {
                    this._notifyListeners('onSLABreach', {
                        leadId,
                        status: lead.status,
                        timeInStatus: this._formatDuration(timeInStatus),
                        timeLimit: status.slaTimeLimit + ' hours',
                        breachedBy: this._formatDuration(timeInStatus - slaTimeLimitMs)
                    });
                }
            });
        } catch (error) {
            console.error('❌ SLA check failed:', error);
        }
    }
    
    /**
     * Get SLA compliance report
     * @returns {Promise<Object>} SLA report
     */
    async getSLAReport() {
        try {
            const snapshot = await this.leadsCollection
                .where('isDeleted', '==', false)
                .get();
            
            const report = {
                total: 0,
                withinSLA: 0,
                breached: 0,
                warning: 0,
                byStatus: {}
            };
            
            const now = new Date();
            
            snapshot.forEach(doc => {
                const lead = doc.data();
                const status = this.getStatusByName(lead.status);
                
                if (!status || !status.slaTimeLimit) return;
                
                report.total++;
                
                const statusChangeTime = lead.lastStatusChangeAt?.toDate();
                if (!statusChangeTime) return;
                
                const timeInStatus = now - statusChangeTime;
                const slaTimeLimitMs = status.slaTimeLimit * 60 * 60 * 1000;
                
                if (!report.byStatus[lead.status]) {
                    report.byStatus[lead.status] = {
                        total: 0,
                        withinSLA: 0,
                        breached: 0,
                        warning: 0
                    };
                }
                
                report.byStatus[lead.status].total++;
                
                if (timeInStatus >= slaTimeLimitMs) {
                    report.breached++;
                    report.byStatus[lead.status].breached++;
                } else if (timeInStatus >= slaTimeLimitMs * this.slaConfig.thresholds.warning) {
                    report.warning++;
                    report.byStatus[lead.status].warning++;
                } else {
                    report.withinSLA++;
                    report.byStatus[lead.status].withinSLA++;
                }
            });
            
            return {
                success: true,
                report: report
            };
        } catch (error) {
            console.error('❌ SLA report generation failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // ============================================
    // AUTO ACTIONS
    // ============================================
    
    /**
     * Run auto actions for status
     * @param {string} leadId - Lead document ID
     * @param {Object} status - Status definition
     * @param {Object} leadData - Lead data
     * @private
     */
    async _runAutoActions(leadId, status, leadData) {
        try {
            if (!status.autoActions || status.autoActions.length === 0) return;
            
            for (const action of status.autoActions) {
                switch (action) {
                    case 'remind_followup':
                        // Trigger follow-up reminder
                        if (typeof FollowupService !== 'undefined') {
                            await FollowupService.scheduleFollowup(leadId, {
                                scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                                reason: 'Auto follow-up reminder',
                                priority: 'medium'
                            });
                        }
                        break;
                        
                    case 'notify_agent':
                        // Notify assigned agent
                        if (leadData.assignedTo && typeof NotificationService !== 'undefined') {
                            await NotificationService.createNotification(
                                leadData.assignedTo,
                                'lead_interested',
                                'Lead Interested',
                                `${leadData.name} is interested in ${leadData.product}`
                            );
                        }
                        break;
                        
                    case 'flag_priority':
                        // Flag lead as priority
                        await this.leadsCollection.doc(leadId).update({
                            priority: 'Hot',
                            flaggedAt: FirebaseCore.getServerTimestamp()
                        });
                        break;
                }
            }
        } catch (error) {
            console.warn('⚠️ Auto action failed:', error);
        }
    }
    
    // ============================================
    // UI HELPERS
    // ============================================
    
    /**
     * Render status badge
     * @param {string} statusName - Status name
     * @returns {HTMLElement} Status badge element
     */
    renderStatusBadge(statusName) {
        const status = this.getStatusByName(statusName);
        
        const badge = document.createElement('span');
        badge.className = 'status-badge';
        badge.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            background: ${status?.color || '#f0f0f0'};
            color: ${status?.textColor || '#333'};
            border: 1px solid ${status?.borderColor || '#ddd'};
            transition: all 0.3s ease;
            cursor: pointer;
        `;
        
        badge.innerHTML = `
            ${status?.icon || '📋'} ${status?.label || statusName}
        `;
        
        return badge;
    }
    
    /**
     * Render status dropdown
     * @param {string} currentStatus - Current status
     * @param {Function} onStatusSelect - Status selection callback
     * @returns {HTMLElement} Status dropdown element
     */
    renderStatusDropdown(currentStatus, onStatusSelect) {
        const currentStatusDef = this.getStatusByName(currentStatus);
        const allowedTransitions = currentStatusDef ? currentStatusDef.allowedTransitions : [];
        
        const container = document.createElement('div');
        container.style.cssText = `
            position: relative;
            display: inline-block;
        `;
        
        const button = document.createElement('button');
        button.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 14px;
            border: 1px solid #dee2e6;
            border-radius: 20px;
            background: white;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 600;
            transition: all 0.3s ease;
        `;
        button.innerHTML = `
            ${currentStatusDef?.icon || '📋'} ${currentStatusDef?.label || currentStatus}
            <span style="font-size: 0.7rem;">▼</span>
        `;
        
        button.onclick = () => {
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        };
        
        const dropdown = document.createElement('div');
        dropdown.style.cssText = `
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            z-index: 1000;
            min-width: 200px;
            padding: 8px;
            margin-top: 5px;
        `;
        
        this.workflow.statuses.forEach(status => {
            const isAllowed = allowedTransitions.includes(status.id);
            
            const option = document.createElement('button');
            option.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                width: 100%;
                padding: 10px 12px;
                border: none;
                background: ${status.name === currentStatus ? '#f0f0f0' : 'transparent'};
                border-radius: 8px;
                cursor: ${isAllowed ? 'pointer' : 'not-allowed'};
                font-size: 0.85rem;
                opacity: ${isAllowed ? '1' : '0.5'};
                transition: background 0.2s;
            `;
            
            option.innerHTML = `
                ${status.icon} ${status.label}
                ${isAllowed ? '' : '<span style="font-size: 0.7rem;">🔒</span>'}
            `;
            
            if (isAllowed) {
                option.onmouseover = () => option.style.background = '#f8f9fa';
                option.onmouseout = () => option.style.background = status.name === currentStatus ? '#f0f0f0' : 'transparent';
                option.onclick = () => {
                    dropdown.style.display = 'none';
                    onStatusSelect(status.name);
                };
            }
            
            dropdown.appendChild(option);
        });
        
        container.appendChild(button);
        container.appendChild(dropdown);
        
        return container;
    }
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    /**
     * Format duration
     * @param {number} durationMs - Duration in milliseconds
     * @returns {string} Formatted duration
     * @private
     */
    _formatDuration(durationMs) {
        if (durationMs < 0) durationMs = 0;
        
        const seconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
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
    
    /**
     * Log activity
     * @param {string} leadId - Lead ID
     * @param {string} oldStatus - Old status
     * @param {string} newStatus - New status
     * @param {Object} options - Options
     * @private
     */
    async _logActivity(leadId, oldStatus, newStatus, options) {
        try {
            await FirebaseCore.getCollection('auditLogs').add({
                leadId,
                action: 'status_change',
                description: `${oldStatus} → ${newStatus}`,
                source: options.source || 'manual',
                userId: AuthService.getUserId(),
                userName: AuthService.getUserProfile()?.name,
                timestamp: FirebaseCore.getServerTimestamp()
            });
        } catch (error) {
            console.warn('⚠️ Could not log activity:', error);
        }
    }
    
    // ============================================
    // CACHE MANAGEMENT
    // ============================================
    
    _getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }
    
    _setCache(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }
    
    _clearCache(key = null) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    addEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
    }
    
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

const StatusServiceInstance = new StatusService();

// ============================================
// GLOBAL EXPORT
// ============================================

window.StatusService = StatusServiceInstance;

// ============================================
// HELPER FUNCTIONS
// ============================================

async function changeLeadStatus(leadId, newStatus, options) {
    return await StatusServiceInstance.changeStatus(leadId, newStatus, options);
}

async function getLeadStatusHistory(leadId) {
    return await StatusServiceInstance.getStatusHistory(leadId);
}

async function getTimeInStatus(leadId) {
    return await StatusServiceInstance.getTimeInStatus(leadId);
}

function getAllowedTransitions(statusName) {
    return StatusServiceInstance.getAllowedTransitions(statusName);
}

function canTransition(fromStatus, toStatus) {
    return StatusServiceInstance.canTransition(fromStatus, toStatus);
}

async function getSLAReport() {
    return await StatusServiceInstance.getSLAReport();
}

function renderStatusBadge(statusName) {
    return StatusServiceInstance.renderStatusBadge(statusName);
}

function renderStatusDropdown(currentStatus, callback) {
    return StatusServiceInstance.renderStatusDropdown(currentStatus, callback);
}

window.changeLeadStatus = changeLeadStatus;
window.getLeadStatusHistory = getLeadStatusHistory;
window.getTimeInStatus = getTimeInStatus;
window.getAllowedTransitions = getAllowedTransitions;
window.canTransition = canTransition;
window.getSLAReport = getSLAReport;
window.renderStatusBadge = renderStatusBadge;
window.renderStatusDropdown = renderStatusDropdown;

// Auto-start SLA monitoring
StatusServiceInstance.startSLAMonitoring();

console.log('✅ Status Service Loaded');

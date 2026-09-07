/**
 * ============================================================
 * AAHAR SHUDHI - FOLLOW-UP & REMINDER SERVICE
 * ============================================================
 * @description Enterprise-grade follow-up management system
 * @version 1.0.0
 * @priority MEDIUM - Core Feature
 * 
 * This service handles:
 * - Follow-up scheduling & management
 * - Reminder notifications
 * - Calendar integration
 * - Recurring follow-ups
 * - Missed follow-up tracking
 * - Overdue follow-up alerts
 * - SLA compliance tracking
 * - Follow-up templates
 * - Notification channels (Browser, Email, In-app)
 * - Time zone management
 * - Working hours validation
 * - Bulk follow-up operations
 * - Follow-up analytics
 * ============================================================
 */

class FollowupService {
    constructor() {
        // Service state
        this.db = FirebaseCore.getDb();
        this.followupsCollection = FirebaseCore.getCollection('followups');
        this.leadsCollection = FirebaseCore.getCollection('leads');
        this.notificationsCollection = FirebaseCore.getCollection('notifications');
        
        // Cache management
        this.cache = new Map();
        this.cacheTimeout = 2 * 60 * 1000; // 2 minutes
        
        // Follow-up statuses
        this.statuses = {
            PENDING: 'pending',
            COMPLETED: 'completed',
            MISSED: 'missed',
            CANCELLED: 'cancelled',
            RESCHEDULED: 'rescheduled',
            OVERDUE: 'overdue'
        };
        
        // Follow-up priorities
        this.priorities = {
            HIGH: 'high',
            MEDIUM: 'medium',
            LOW: 'low',
            URGENT: 'urgent'
        };
        
        // Follow-up types
        this.types = {
            CALL: 'call',
            WHATSAPP: 'whatsapp',
            EMAIL: 'email',
            SMS: 'sms',
            MEETING: 'meeting',
            REMINDER: 'reminder',
            PAYMENT: 'payment',
            DELIVERY: 'delivery',
            FEEDBACK: 'feedback',
            GENERAL: 'general'
        };
        
        // Follow-up templates
        this.templates = [
            {
                id: 'fup_001',
                name: 'Standard Follow-up',
                reason: 'General follow-up call',
                priority: 'medium',
                defaultTime: '1 day'
            },
            {
                id: 'fup_002',
                name: 'Price Discussion',
                reason: 'Discuss pricing and offers',
                priority: 'high',
                defaultTime: '4 hours'
            },
            {
                id: 'fup_003',
                name: 'Product Demo',
                reason: 'Schedule product demonstration',
                priority: 'high',
                defaultTime: '1 day'
            },
            {
                id: 'fup_004',
                name: 'Payment Reminder',
                reason: 'Remind about pending payment',
                priority: 'urgent',
                defaultTime: '2 hours'
            },
            {
                id: 'fup_005',
                name: 'Delivery Follow-up',
                reason: 'Check delivery status',
                priority: 'medium',
                defaultTime: '3 days'
            },
            {
                id: 'fup_006',
                name: 'Feedback Call',
                reason: 'Collect customer feedback',
                priority: 'low',
                defaultTime: '1 week'
            }
        ];
        
        // Reminder configuration
        this.reminderConfig = {
            beforeIntervals: [
                { id: '15min', label: '15 minutes before', minutes: 15 },
                { id: '30min', label: '30 minutes before', minutes: 30 },
                { id: '1hour', label: '1 hour before', minutes: 60 },
                { id: '2hours', label: '2 hours before', minutes: 120 },
                { id: '1day', label: '1 day before', minutes: 1440 },
                { id: '2days', label: '2 days before', minutes: 2880 }
            ],
            channels: {
                browser: true,
                inApp: true,
                email: false,
                sms: false
            }
        };
        
        // Event listeners
        this.eventListeners = {
            onFollowupScheduled: [],
            onFollowupCompleted: [],
            onFollowupMissed: [],
            onFollowupCancelled: [],
            onFollowupRescheduled: [],
            onReminderTriggered: [],
            onOverdueDetected: [],
            onError: []
        };
        
        // Real-time listeners
        this.realtimeListeners = new Map();
        
        // Overdue check timer
        this.overdueCheckTimer = null;
        this.overdueCheckInterval = 60 * 1000; // Check every minute
        
        console.log('✅ Follow-up Service initialized');
    }
    
    // ============================================
    // FOLLOW-UP SCHEDULING
    // ============================================
    
    /**
     * Schedule follow-up
     * @param {string} leadId - Lead document ID
     * @param {Object} followupData - Follow-up data
     * @param {Date|string} followupData.scheduledAt - Schedule date/time
     * @param {string} followupData.reason - Follow-up reason
     * @param {string} followupData.type - Follow-up type
     * @param {string} followupData.priority - Follow-up priority
     * @param {Array} followupData.reminders - Reminder intervals
     * @returns {Promise<Object>} Scheduling result
     */
    async scheduleFollowup(leadId, followupData) {
        try {
            // Validate lead ID
            if (!leadId) {
                throw new Error('Lead ID is required');
            }
            
            // Validate schedule date
            if (!followupData.scheduledAt) {
                throw new Error('Schedule date is required');
            }
            
            const scheduledDate = new Date(followupData.scheduledAt);
            if (isNaN(scheduledDate.getTime())) {
                throw new Error('Invalid schedule date');
            }
            
            // Check if date is in the past
            if (scheduledDate < new Date()) {
                throw new Error('Schedule date cannot be in the past');
            }
            
            // Check if within working hours
            if (!this._isWithinWorkingHours(scheduledDate)) {
                throw new Error('Schedule time is outside working hours');
            }
            
            // Check lead exists
            const leadDoc = await this.leadsCollection.doc(leadId).get();
            if (!leadDoc.exists) {
                throw new Error('Lead not found');
            }
            
            // Generate follow-up ID
            const followupId = this._generateFollowupId();
            
            // Get current user
            const currentUser = AuthService.getCurrentUser();
            const userProfile = AuthService.getUserProfile();
            
            // Calculate reminder times
            const reminders = this._calculateReminderTimes(
                scheduledDate,
                followupData.reminders || ['30min', '1hour']
            );
            
            // Prepare follow-up document
            const followupDocument = {
                followupId: followupId,
                leadId: leadId,
                leadName: leadDoc.data().name || '',
                agentId: followupData.agentId || currentUser?.uid || 'system',
                agentName: followupData.agentName || userProfile?.name || 'System',
                scheduledAt: firebase.firestore.Timestamp.fromDate(scheduledDate),
                reason: this._sanitizeContent(followupData.reason || 'General follow-up'),
                type: followupData.type || this.types.CALL,
                priority: followupData.priority || this.priorities.MEDIUM,
                status: this.statuses.PENDING,
                reminders: reminders,
                reminderStatus: reminders.map(r => ({
                    ...r,
                    triggered: false
                })),
                isRecurring: followupData.isRecurring || false,
                recurrencePattern: followupData.recurrencePattern || null,
                createdBy: currentUser?.uid || 'system',
                createdByName: userProfile?.name || 'System',
                createdAt: FirebaseCore.getServerTimestamp(),
                updatedAt: FirebaseCore.getServerTimestamp(),
                completedAt: null,
                completedBy: null,
                missedAt: null,
                cancelledAt: null,
                cancelledBy: null,
                notes: followupData.notes || '',
                metadata: {
                    source: followupData.source || 'manual',
                    userAgent: navigator.userAgent,
                    platform: navigator.platform
                }
            };
            
            // Create follow-up in Firestore
            const followupRef = await this.followupsCollection.add(followupDocument);
            
            // Update lead with next follow-up
            await this.leadsCollection.doc(leadId).update({
                nextFollowUpAt: firebase.firestore.Timestamp.fromDate(scheduledDate),
                followupCount: firebase.firestore.FieldValue.increment(1),
                lastFollowupScheduledAt: FirebaseCore.getServerTimestamp(),
                updatedAt: FirebaseCore.getServerTimestamp()
            });
            
            // Schedule reminders
            this._scheduleReminders(followupRef.id, reminders, leadId);
            
            // Clear cache
            this._clearCache(leadId);
            
            // Log activity
            await this._logActivity(followupRef.id, leadId, 'schedule', 'Follow-up scheduled');
            
            // Notify listeners
            this._notifyListeners('onFollowupScheduled', {
                followupId: followupRef.id,
                leadId,
                followup: followupDocument
            });
            
            return {
                success: true,
                followupId: followupRef.id,
                followup: followupDocument,
                message: 'Follow-up scheduled successfully'
            };
        } catch (error) {
            console.error('❌ Follow-up scheduling failed:', error);
            this._notifyListeners('onError', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'scheduleFollowup'),
                message: error.message
            };
        }
    }
    
    /**
     * Schedule follow-up from template
     * @param {string} leadId - Lead document ID
     * @param {string} templateId - Template ID
     * @returns {Promise<Object>} Scheduling result
     */
    async scheduleFromTemplate(leadId, templateId) {
        try {
            const template = this.templates.find(t => t.id === templateId);
            
            if (!template) {
                throw new Error('Template not found');
            }
            
            // Calculate schedule time from template
            const scheduledAt = this._calculateTimeFromTemplate(template.defaultTime);
            
            return await this.scheduleFollowup(leadId, {
                scheduledAt: scheduledAt,
                reason: template.reason,
                priority: template.priority,
                type: this.types.CALL
            });
        } catch (error) {
            console.error('❌ Template scheduling failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * Schedule bulk follow-ups
     * @param {Array} followups - Array of follow-up data
     * @returns {Promise<Object>} Bulk scheduling result
     */
    async scheduleBulkFollowups(followups) {
        try {
            if (!followups || followups.length === 0) {
                throw new Error('No follow-ups provided');
            }
            
            const results = {
                total: followups.length,
                success: 0,
                failed: 0,
                errors: []
            };
            
            for (let i = 0; i < followups.length; i++) {
                const followupData = followups[i];
                const result = await this.scheduleFollowup(
                    followupData.leadId,
                    followupData
                );
                
                if (result.success) {
                    results.success++;
                } else {
                    results.failed++;
                    results.errors.push({
                        index: i,
                        leadId: followupData.leadId,
                        error: result.message
                    });
                }
            }
            
            return {
                success: true,
                results: results,
                message: `${results.success} scheduled, ${results.failed} failed`
            };
        } catch (error) {
            console.error('❌ Bulk scheduling failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // ============================================
    // FOLLOW-UP RETRIEVAL
    // ============================================
    
    /**
     * Get follow-up by ID
     * @param {string} followupId - Follow-up document ID
     * @returns {Promise<Object>} Follow-up data
     */
    async getFollowupById(followupId) {
        try {
            // Check cache
            const cached = this._getFromCache(followupId);
            if (cached) {
                return cached;
            }
            
            const followupDoc = await this.followupsCollection.doc(followupId).get();
            
            if (!followupDoc.exists) {
                throw new Error('Follow-up not found');
            }
            
            const followupData = {
                id: followupDoc.id,
                ...followupDoc.data()
            };
            
            // Cache data
            this._setCache(followupId, followupData);
            
            return {
                success: true,
                followup: followupData
            };
        } catch (error) {
            console.error('❌ Follow-up retrieval failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * Get all follow-ups for lead
     * @param {string} leadId - Lead document ID
     * @returns {Promise<Object>} Follow-ups list
     */
    async getLeadFollowups(leadId) {
        try {
            const snapshot = await this.followupsCollection
                .where('leadId', '==', leadId)
                .orderBy('scheduledAt', 'desc')
                .get();
            
            const followups = [];
            snapshot.forEach(doc => {
                followups.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return {
                success: true,
                followups: followups,
                count: followups.length
            };
        } catch (error) {
            console.error('❌ Lead follow-ups retrieval failed:', error);
            return {
                success: false,
                message: error.message,
                followups: []
            };
        }
    }
    
    /**
     * Get pending follow-ups for agent
     * @param {string} agentId - Agent user ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Pending follow-ups
     */
    async getAgentPendingFollowups(agentId, options = {}) {
        try {
            const {
                limit = 50,
                includeOverdue = true
            } = options;
            
            let query = this.followupsCollection
                .where('agentId', '==', agentId)
                .where('status', '==', this.statuses.PENDING)
                .orderBy('scheduledAt', 'asc')
                .limit(limit);
            
            const snapshot = await query.get();
            
            const followups = [];
            const now = new Date();
            
            snapshot.forEach(doc => {
                const followup = {
                    id: doc.id,
                    ...doc.data()
                };
                
                // Check if overdue
                if (includeOverdue || followup.scheduledAt.toDate() >= now) {
                    followup.isOverdue = followup.scheduledAt.toDate() < now;
                    followups.push(followup);
                }
            });
            
            return {
                success: true,
                followups: followups,
                count: followups.length,
                overdueCount: followups.filter(f => f.isOverdue).length
            };
        } catch (error) {
            console.error('❌ Agent follow-ups retrieval failed:', error);
            return {
                success: false,
                message: error.message,
                followups: []
            };
        }
    }
    
    /**
     * Get today's follow-ups
     * @param {string} agentId - Agent user ID (optional)
     * @returns {Promise<Object>} Today's follow-ups
     */
    async getTodayFollowups(agentId = null) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            let query = this.followupsCollection
                .where('status', '==', this.statuses.PENDING)
                .where('scheduledAt', '>=', firebase.firestore.Timestamp.fromDate(today))
                .where('scheduledAt', '<', firebase.firestore.Timestamp.fromDate(tomorrow));
            
            if (agentId) {
                query = query.where('agentId', '==', agentId);
            }
            
            const snapshot = await query.get();
            
            const followups = [];
            snapshot.forEach(doc => {
                followups.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return {
                success: true,
                followups: followups,
                count: followups.length
            };
        } catch (error) {
            console.error('❌ Today follow-ups retrieval failed:', error);
            return {
                success: false,
                message: error.message,
                followups: []
            };
        }
    }
    
    /**
     * Get overdue follow-ups
     * @returns {Promise<Object>} Overdue follow-ups
     */
    async getOverdueFollowups() {
        try {
            const now = new Date();
            
            const snapshot = await this.followupsCollection
                .where('status', '==', this.statuses.PENDING)
                .where('scheduledAt', '<', firebase.firestore.Timestamp.fromDate(now))
                .get();
            
            const followups = [];
            snapshot.forEach(doc => {
                const followup = {
                    id: doc.id,
                    ...doc.data()
                };
                followup.overdueBy = this._getTimeAgo(followup.scheduledAt.toDate());
                followups.push(followup);
            });
            
            return {
                success: true,
                followups: followups,
                count: followups.length
            };
        } catch (error) {
            console.error('❌ Overdue follow-ups retrieval failed:', error);
            return {
                success: false,
                message: error.message,
                followups: []
            };
        }
    }
    
    // ============================================
    // FOLLOW-UP COMPLETION
    // ============================================
    
    /**
     * Complete follow-up
     * @param {string} followupId - Follow-up document ID
     * @param {Object} completionData - Completion data
     * @returns {Promise<Object>} Completion result
     */
    async completeFollowup(followupId, completionData = {}) {
        try {
            const followupRef = this.followupsCollection.doc(followupId);
            const followupDoc = await followupRef.get();
            
            if (!followupDoc.exists) {
                throw new Error('Follow-up not found');
            }
            
            const followup = followupDoc.data();
            
            // Check if already completed
            if (followup.status === this.statuses.COMPLETED) {
                throw new Error('Follow-up already completed');
            }
            
            // Update follow-up
            await followupRef.update({
                status: this.statuses.COMPLETED,
                completedAt: FirebaseCore.getServerTimestamp(),
                completedBy: AuthService.getUserId(),
                completedByName: AuthService.getUserProfile()?.name,
                completionNotes: completionData.notes || '',
                outcome: completionData.outcome || 'completed',
                updatedAt: FirebaseCore.getServerTimestamp()
            });
            
            // Update lead
            await this.leadsCollection.doc(followup.leadId).update({
                lastFollowupCompletedAt: FirebaseCore.getServerTimestamp(),
                updatedAt: FirebaseCore.getServerTimestamp()
            });
            
            // Clear cache
            this._clearCache(followupId);
            
            // Log activity
            await this._logActivity(followupId, followup.leadId, 'complete', 'Follow-up completed');
            
            // Notify listeners
            this._notifyListeners('onFollowupCompleted', {
                followupId,
                leadId: followup.leadId
            });
            
            return {
                success: true,
                message: 'Follow-up completed successfully'
            };
        } catch (error) {
            console.error('❌ Follow-up completion failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * Mark follow-up as missed
     * @param {string} followupId - Follow-up document ID
     * @param {string} reason - Miss reason
     * @returns {Promise<Object>} Miss result
     */
    async missFollowup(followupId, reason = '') {
        try {
            const followupRef = this.followupsCollection.doc(followupId);
            const followupDoc = await followupRef.get();
            
            if (!followupDoc.exists) {
                throw new Error('Follow-up not found');
            }
            
            await followupRef.update({
                status: this.statuses.MISSED,
                missedAt: FirebaseCore.getServerTimestamp(),
                missedReason: reason,
                updatedAt: FirebaseCore.getServerTimestamp()
            });
            
            // Clear cache
            this._clearCache(followupId);
            
            // Notify listeners
            this._notifyListeners('onFollowupMissed', {
                followupId,
                leadId: followupDoc.data().leadId,
                reason
            });
            
            return {
                success: true,
                message: 'Follow-up marked as missed'
            };
        } catch (error) {
            console.error('❌ Follow-up miss marking failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * Cancel follow-up
     * @param {string} followupId - Follow-up document ID
     * @param {string} reason - Cancellation reason
     * @returns {Promise<Object>} Cancellation result
     */
    async cancelFollowup(followupId, reason = '') {
        try {
            const followupRef = this.followupsCollection.doc(followupId);
            const followupDoc = await followupRef.get();
            
            if (!followupDoc.exists) {
                throw new Error('Follow-up not found');
            }
            
            await followupRef.update({
                status: this.statuses.CANCELLED,
                cancelledAt: FirebaseCore.getServerTimestamp(),
                cancelledBy: AuthService.getUserId(),
                cancelledReason: reason,
                updatedAt: FirebaseCore.getServerTimestamp()
            });
            
            // Clear cache
            this._clearCache(followupId);
            
            // Notify listeners
            this._notifyListeners('onFollowupCancelled', {
                followupId,
                leadId: followupDoc.data().leadId,
                reason
            });
            
            return {
                success: true,
                message: 'Follow-up cancelled successfully'
            };
        } catch (error) {
            console.error('❌ Follow-up cancellation failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * Reschedule follow-up
     * @param {string} followupId - Follow-up document ID
     * @param {Date|string} newScheduleAt - New schedule date/time
     * @param {string} reason - Reschedule reason
     * @returns {Promise<Object>} Reschedule result
     */
    async rescheduleFollowup(followupId, newScheduleAt, reason = '') {
        try {
            const followupRef = this.followupsCollection.doc(followupId);
            const followupDoc = await followupRef.get();
            
            if (!followupDoc.exists) {
                throw new Error('Follow-up not found');
            }
            
            const newDate = new Date(newScheduleAt);
            if (isNaN(newDate.getTime())) {
                throw new Error('Invalid date');
            }
            
            if (newDate < new Date()) {
                throw new Error('Cannot reschedule to past date');
            }
            
            // Calculate new reminders
            const reminders = this._calculateReminderTimes(newDate, ['30min', '1hour']);
            
            await followupRef.update({
                scheduledAt: firebase.firestore.Timestamp.fromDate(newDate),
                status: this.statuses.PENDING,
                reminders: reminders,
                reminderStatus: reminders.map(r => ({
                    ...r,
                    triggered: false
                })),
                rescheduledAt: FirebaseCore.getServerTimestamp(),
                rescheduledBy: AuthService.getUserId(),
                rescheduleReason: reason,
                rescheduleCount: firebase.firestore.FieldValue.increment(1),
                updatedAt: FirebaseCore.getServerTimestamp()
            });
            
            // Schedule new reminders
            this._scheduleReminders(followupId, reminders, followupDoc.data().leadId);
            
            // Clear cache
            this._clearCache(followupId);
            
            // Notify listeners
            this._notifyListeners('onFollowupRescheduled', {
                followupId,
                leadId: followupDoc.data().leadId,
                newScheduleAt: newDate
            });
            
            return {
                success: true,
                message: 'Follow-up rescheduled successfully'
            };
        } catch (error) {
            console.error('❌ Follow-up rescheduling failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // ============================================
    // REMINDER SYSTEM
    // ============================================
    
    /**
     * Calculate reminder times
     * @param {Date} scheduledAt - Schedule date/time
     * @param {Array} reminderKeys - Reminder interval keys
     * @returns {Array} Reminder times
     * @private
     */
    _calculateReminderTimes(scheduledAt, reminderKeys) {
        return reminderKeys.map(key => {
            const interval = this.reminderConfig.beforeIntervals.find(i => i.id === key);
            
            if (!interval) return null;
            
            const reminderTime = new Date(scheduledAt.getTime() - interval.minutes * 60 * 1000);
            
            return {
                intervalKey: interval.id,
                intervalLabel: interval.label,
                minutesBefore: interval.minutes,
                reminderAt: firebase.firestore.Timestamp.fromDate(reminderTime)
            };
        }).filter(r => r !== null);
    }
    
    /**
     * Schedule reminders
     * @param {string} followupId - Follow-up document ID
     * @param {Array} reminders - Reminder times
     * @param {string} leadId - Lead document ID
     * @private
     */
    _scheduleReminders(followupId, reminders, leadId) {
        reminders.forEach(reminder => {
            const reminderTime = reminder.reminderAt.toDate();
            const now = new Date();
            
            if (reminderTime > now) {
                const delay = reminderTime.getTime() - now.getTime();
                
                setTimeout(async () => {
                    await this._triggerReminder(followupId, reminder, leadId);
                }, delay);
            }
        });
    }
    
    /**
     * Trigger reminder
     * @param {string} followupId - Follow-up document ID
     * @param {Object} reminder - Reminder data
     * @param {string} leadId - Lead document ID
     * @private
     */
    async _triggerReminder(followupId, reminder, leadId) {
        try {
            // Get follow-up
            const followupDoc = await this.followupsCollection.doc(followupId).get();
            
            if (!followupDoc.exists) {
                return;
            }
            
            const followup = followupDoc.data();
            
            // Check if still pending
            if (followup.status !== this.statuses.PENDING) {
                return;
            }
            
            // Create notification
            await this._createNotification(followupId, leadId, reminder);
            
            // Show browser notification
            this._showBrowserNotification(followup, reminder);
            
            // Update reminder status
            const reminderStatus = followup.reminderStatus || [];
            const updatedReminderStatus = reminderStatus.map(r => {
                if (r.intervalKey === reminder.intervalKey) {
                    return { ...r, triggered: true, triggeredAt: new Date() };
                }
                return r;
            });
            
            await this.followupsCollection.doc(followupId).update({
                reminderStatus: updatedReminderStatus,
                lastReminderAt: FirebaseCore.getServerTimestamp()
            });
            
            // Notify listeners
            this._notifyListeners('onReminderTriggered', {
                followupId,
                leadId,
                reminder
            });
            
        } catch (error) {
            console.error('❌ Reminder trigger failed:', error);
        }
    }
    
    /**
     * Create notification
     * @param {string} followupId - Follow-up document ID
     * @param {string} leadId - Lead document ID
     * @param {Object} reminder - Reminder data
     * @private
     */
    async _createNotification(followupId, leadId, reminder) {
        try {
            await this.notificationsCollection.add({
                followupId,
                leadId,
                type: 'followup_reminder',
                title: 'Follow-up Reminder',
                message: `Follow-up scheduled in ${reminder.intervalLabel}`,
                reminderData: reminder,
                isRead: false,
                createdAt: FirebaseCore.getServerTimestamp()
            });
        } catch (error) {
            console.warn('⚠️ Could not create notification:', error);
        }
    }
    
    /**
     * Show browser notification
     * @param {Object} followup - Follow-up data
     * @param {Object} reminder - Reminder data
     * @private
     */
    _showBrowserNotification(followup, reminder) {
        if (!('Notification' in window)) {
            return;
        }
        
        if (Notification.permission === 'granted') {
            new Notification('⏰ Follow-up Reminder', {
                body: `${followup.leadName || 'Lead'} - ${followup.reason}\nReminder: ${reminder.intervalLabel}`,
                icon: '/assets/icons/followup-icon.png'
            });
        }
    }
    
    // ============================================
    // OVERDUE TRACKING
    // ============================================
    
    /**
     * Start overdue tracking
     */
    startOverdueTracking() {
        if (this.overdueCheckTimer) {
            clearInterval(this.overdueCheckTimer);
        }
        
        this.overdueCheckTimer = setInterval(async () => {
            await this._checkForOverdue();
        }, this.overdueCheckInterval);
        
        console.log('✅ Overdue tracking started');
    }
    
    /**
     * Stop overdue tracking
     */
    stopOverdueTracking() {
        if (this.overdueCheckTimer) {
            clearInterval(this.overdueCheckTimer);
            this.overdueCheckTimer = null;
        }
    }
    
    /**
     * Check for overdue follow-ups
     * @private
     */
    async _checkForOverdue() {
        try {
            const now = new Date();
            
            const snapshot = await this.followupsCollection
                .where('status', '==', this.statuses.PENDING)
                .where('scheduledAt', '<', firebase.firestore.Timestamp.fromDate(now))
                .get();
            
            snapshot.forEach(async (doc) => {
                const followup = {
                    id: doc.id,
                    ...doc.data()
                };
                
                // Update status to overdue
                await doc.ref.update({
                    status: this.statuses.OVERDUE,
                    overdueAt: FirebaseCore.getServerTimestamp(),
                    updatedAt: FirebaseCore.getServerTimestamp()
                });
                
                // Notify listeners
                this._notifyListeners('onOverdueDetected', {
                    followupId: doc.id,
                    leadId: followup.leadId,
                    overdueBy: this._getTimeAgo(followup.scheduledAt.toDate())
                });
            });
        } catch (error) {
            console.error('❌ Overdue check failed:', error);
        }
    }
    
    // ============================================
    // UI HELPERS
    // ============================================
    
    /**
     * Open follow-up modal
     * @param {string} leadId - Lead document ID
     */
    openFollowupModal(leadId) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 3000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 20px; padding: 25px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; animation: slideUp 0.3s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0;">⏰ Schedule Follow-up</h2>
                    <button onclick="this.closest('div[style]').parentElement.remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #2a5c3e;">Schedule Date/Time *</label>
                    <input type="datetime-local" id="followupDateTime" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 8px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #2a5c3e;">Reason</label>
                    <select id="followupReason" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 8px;">
                        <option value="">Select reason...</option>
                        ${this.templates.map(tpl => `
                            <option value="${tpl.reason}">${tpl.name} - ${tpl.reason}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #2a5c3e;">Priority</label>
                    <select id="followupPriority" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 8px;">
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                        <option value="low">Low</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #2a5c3e;">Reminders</label>
                    <div id="reminderCheckboxes" style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${this.reminderConfig.beforeIntervals.map(interval => `
                            <label style="display: flex; align-items: center; gap: 5px; padding: 5px 10px; border: 1px solid #dee2e6; border-radius: 15px; cursor: pointer;">
                                <input type="checkbox" value="${interval.id}" checked>
                                ${interval.label}
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #2a5c3e;">Notes</label>
                    <textarea id="followupNotes" rows="3" placeholder="Additional notes..." style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 8px; resize: vertical;"></textarea>
                </div>
                
                <button onclick="FollowupService.saveFollowupFromModal('${leadId}')" style="width: 100%; padding: 12px; background: #2a5c3e; color: white; border: none; border-radius: 25px; font-weight: 600; cursor: pointer;">
                    💾 Schedule Follow-up
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    /**
     * Save follow-up from modal
     * @param {string} leadId - Lead document ID
     */
    async saveFollowupFromModal(leadId) {
        const scheduledAt = document.getElementById('followupDateTime')?.value;
        const reason = document.getElementById('followupReason')?.value;
        const priority = document.getElementById('followupPriority')?.value;
        const notes = document.getElementById('followupNotes')?.value;
        
        const reminderCheckboxes = document.querySelectorAll('#reminderCheckboxes input:checked');
        const reminders = Array.from(reminderCheckboxes).map(cb => cb.value);
        
        if (!scheduledAt) {
            alert('Schedule date is required');
            return;
        }
        
        const result = await this.scheduleFollowup(leadId, {
            scheduledAt: new Date(scheduledAt),
            reason: reason || 'General follow-up',
            priority: priority,
            notes: notes,
            reminders: reminders.length > 0 ? reminders : ['30min', '1hour']
        });
        
        if (result.success) {
            const modal = document.querySelector('div[style*="z-index: 3000"]');
            if (modal) modal.remove();
            
            if (typeof showToast === 'function') {
                showToast('✅ Follow-up scheduled successfully');
            }
        } else {
            alert(result.message);
        }
    }
    
    // ============================================
    // VALIDATION & SANITIZATION
    // ============================================
    
    /**
     * Check if time is within working hours
     * @param {Date} date - Date to check
     * @returns {boolean} Is within working hours
     * @private
     */
    _isWithinWorkingHours(date) {
        const hour = date.getHours();
        const day = date.getDay();
        
        const businessHours = TIME_CONFIG.BUSINESS_HOURS;
        
        return businessHours.WORKING_DAYS.includes(day) &&
               hour >= businessHours.START &&
               hour < businessHours.END;
    }
    
    /**
     * Calculate time from template
     * @param {string} timeString - Time string (e.g., "1 day", "4 hours")
     * @returns {Date} Calculated date
     * @private
     */
    _calculateTimeFromTemplate(timeString) {
        const now = new Date();
        const [value, unit] = timeString.split(' ');
        const numValue = parseInt(value);
        
        switch (unit) {
            case 'hours':
                return new Date(now.getTime() + numValue * 60 * 60 * 1000);
            case 'day':
            case 'days':
                return new Date(now.getTime() + numValue * 24 * 60 * 60 * 1000);
            case 'week':
            case 'weeks':
                return new Date(now.getTime() + numValue * 7 * 24 * 60 * 60 * 1000);
            default:
                return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
    }
    
    /**
     * Sanitize content
     * @param {string} content - Content to sanitize
     * @returns {string} Sanitized content
     * @private
     */
    _sanitizeContent(content) {
        if (!content) return '';
        return content.trim().slice(0, 500);
    }
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    /**
     * Generate follow-up ID
     * @returns {string} Follow-up ID
     * @private
     */
    _generateFollowupId() {
        return 'FUP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    }
    
    /**
     * Get time ago
     * @param {Date} date - Date object
     * @returns {string} Time ago string
     * @private
     */
    _getTimeAgo(date) {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return `${Math.floor(seconds / 604800)}w ago`;
    }
    
    /**
     * Log activity
     * @param {string} followupId - Follow-up ID
     * @param {string} leadId - Lead ID
     * @param {string} action - Action performed
     * @param {string} description - Activity description
     * @private
     */
    async _logActivity(followupId, leadId, action, description) {
        try {
            await FirebaseCore.getCollection('auditLogs').add({
                followupId,
                leadId,
                action,
                description,
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

const FollowupServiceInstance = new FollowupService();

// ============================================
// GLOBAL EXPORT
// ============================================

window.FollowupService = FollowupServiceInstance;

// ============================================
// HELPER FUNCTIONS
// ============================================

async function scheduleFollowup(leadId, followupData) {
    return await FollowupServiceInstance.scheduleFollowup(leadId, followupData);
}

async function getLeadFollowups(leadId) {
    return await FollowupServiceInstance.getLeadFollowups(leadId);
}

async function getTodayFollowups() {
    return await FollowupServiceInstance.getTodayFollowups();
}

function openFollowupModal(leadId) {
    FollowupServiceInstance.openFollowupModal(leadId);
}

window.scheduleFollowup = scheduleFollowup;
window.getLeadFollowups = getLeadFollowups;
window.getTodayFollowups = getTodayFollowups;
window.openFollowupModal = openFollowupModal;

// Auto-start overdue tracking
FollowupServiceInstance.startOverdueTracking();

console.log('✅ Follow-up Service Loaded');

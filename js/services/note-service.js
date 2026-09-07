/**
 * ============================================================
 * AAHAR SHUDHI - NOTE & REMARKS SERVICE
 * ============================================================
 * @description Enterprise-grade notes management system
 * @version 1.0.0
 * @priority MEDIUM - Core Feature
 * 
 * This service handles:
 * - Call notes CRUD operations
 * - Note categorization & tagging
 * - Rich text formatting
 * - Note templates system
 * - Voice notes (future)
 * - Note search & filtering
 * - Real-time synchronization
 * - Note history & versioning
 * - File attachments
 * - Note pinning & starring
 * - Quick notes
 * - Bulk operations
 * - Export functionality
 * ============================================================
 */

class NoteService {
    constructor() {
        // Service state
        this.db = FirebaseCore.getDb();
        this.notesCollection = FirebaseCore.getCollection('notes');
        this.leadsCollection = FirebaseCore.getCollection('leads');
        
        // Cache management
        this.cache = new Map();
        this.cacheTimeout = 3 * 60 * 1000; // 3 minutes
        
        // Note types
        this.noteTypes = {
            CALL: 'call',
            WHATSAPP: 'whatsapp',
            EMAIL: 'email',
            SMS: 'sms',
            VISIT: 'visit',
            GENERAL: 'general',
            FOLLOW_UP: 'follow_up',
            PAYMENT: 'payment',
            ORDER: 'order',
            COMPLAINT: 'complaint',
            FEEDBACK: 'feedback'
        };
        
        // Note tags
        this.noteTags = [
            'Hot Lead',
            'Warm Lead',
            'Cold Lead',
            'Price Discussion',
            'Product Inquiry',
            'Call Later',
            'Busy',
            'Not Answering',
            'Wrong Number',
            'Interested',
            'Not Interested',
            'Payment Pending',
            'Order Confirmed',
            'Delivery Issue',
            'Refund',
            'Complaint',
            'Follow-up Required',
            'VIP Customer',
            'Regular Customer',
            'New Customer'
        ];
        
        // Note templates
        this.noteTemplates = [
            {
                id: 'tpl_001',
                name: 'First Contact',
                content: 'First call made. Customer {status}. Product interest: {product}.',
                tags: ['First Contact']
            },
            {
                id: 'tpl_002',
                name: 'Follow-up Call',
                content: 'Follow-up call. Previous discussion: {context}. Customer {status}.',
                tags: ['Follow-up']
            },
            {
                id: 'tpl_003',
                name: 'Price Discussion',
                content: 'Price discussed. Customer budget: {budget}. Negotiation: {negotiation}.',
                tags: ['Price Discussion']
            },
            {
                id: 'tpl_004',
                name: 'Order Confirmation',
                content: 'Order confirmed. Product: {product}. Amount: {amount}. Payment: {payment}.',
                tags: ['Order Confirmed']
            },
            {
                id: 'tpl_005',
                name: 'Not Interested',
                content: 'Customer not interested. Reason: {reason}.',
                tags: ['Not Interested']
            },
            {
                id: 'tpl_006',
                name: 'Call Later',
                content: 'Customer asked to call later. Preferred time: {time}.',
                tags: ['Call Later']
            }
        ];
        
        // Event listeners
        this.eventListeners = {
            onNoteAdded: [],
            onNoteUpdated: [],
            onNoteDeleted: [],
            onNotePinned: [],
            onNoteStarred: [],
            onError: []
        };
        
        // Real-time listeners
        this.realtimeListeners = new Map();
        
        console.log('✅ Note Service initialized');
    }
    
    // ============================================
    // NOTE CREATION
    // ============================================
    
    /**
     * Add note to lead
     * @param {string} leadId - Lead document ID
     * @param {Object} noteData - Note data
     * @param {string} noteData.content - Note content
     * @param {string} noteData.type - Note type
     * @param {Array} noteData.tags - Note tags
     * @param {boolean} noteData.isPinned - Pin note
     * @param {boolean} noteData.isStarred - Star note
     * @returns {Promise<Object>} Creation result
     */
    async addNote(leadId, noteData) {
        try {
            // Validate lead ID
            if (!leadId) {
                throw new Error('Lead ID is required');
            }
            
            // Validate note content
            if (!noteData.content || noteData.content.trim().length === 0) {
                throw new Error('Note content is required');
            }
            
            if (noteData.content.length > VALIDATION_RULES.NOTES.maxLength) {
                throw new Error(`Note cannot exceed ${VALIDATION_RULES.NOTES.maxLength} characters`);
            }
            
            // Check if lead exists
            const leadDoc = await this.leadsCollection.doc(leadId).get();
            if (!leadDoc.exists) {
                throw new Error('Lead not found');
            }
            
            // Generate note ID
            const noteId = this._generateNoteId();
            
            // Get current user
            const currentUser = AuthService.getCurrentUser();
            const userProfile = AuthService.getUserProfile();
            
            // Prepare note document
            const noteDocument = {
                noteId: noteId,
                leadId: leadId,
                content: this._sanitizeContent(noteData.content),
                type: noteData.type || this.noteTypes.GENERAL,
                tags: noteData.tags || [],
                isPinned: noteData.isPinned || false,
                isStarred: noteData.isStarred || false,
                isDeleted: false,
                createdBy: currentUser?.uid || 'system',
                createdByName: userProfile?.name || 'System',
                createdAt: FirebaseCore.getServerTimestamp(),
                updatedAt: FirebaseCore.getServerTimestamp(),
                attachments: noteData.attachments || [],
                metadata: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    deviceType: this._getDeviceType()
                }
            };
            
            // Create note in Firestore
            const noteRef = await this.notesCollection.add(noteDocument);
            
            // Update lead's last note timestamp
            await this.leadsCollection.doc(leadId).update({
                lastNoteAt: FirebaseCore.getServerTimestamp(),
                lastNoteBy: currentUser?.uid,
                noteCount: firebase.firestore.FieldValue.increment(1),
                updatedAt: FirebaseCore.getServerTimestamp()
            });
            
            // Clear cache
            this._clearCache(leadId);
            
            // Log activity
            await this._logActivity(noteRef.id, leadId, 'create', 'Note added');
            
            // Notify listeners
            this._notifyListeners('onNoteAdded', {
                noteId: noteRef.id,
                leadId,
                note: noteDocument
            });
            
            return {
                success: true,
                noteId: noteRef.id,
                note: noteDocument,
                message: 'Note added successfully'
            };
        } catch (error) {
            console.error('❌ Note creation failed:', error);
            this._notifyListeners('onError', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'addNote'),
                message: error.message
            };
        }
    }
    
    /**
     * Add quick note
     * @param {string} leadId - Lead document ID
     * @param {string} content - Quick note content
     * @returns {Promise<Object>} Creation result
     */
    async addQuickNote(leadId, content) {
        return await this.addNote(leadId, {
            content: content,
            type: this.noteTypes.GENERAL,
            tags: ['Quick Note']
        });
    }
    
    /**
     * Add call note
     * @param {string} leadId - Lead document ID
     * @param {string} content - Call summary
     * @param {Object} callDetails - Call details
     * @returns {Promise<Object>} Creation result
     */
    async addCallNote(leadId, content, callDetails = {}) {
        return await this.addNote(leadId, {
            content: content,
            type: this.noteTypes.CALL,
            tags: ['Call Note', ...(callDetails.tags || [])],
            callDetails: {
                duration: callDetails.duration || 0,
                outcome: callDetails.outcome || 'completed',
                callType: callDetails.callType || 'outgoing'
            }
        });
    }
    
    /**
     * Add note from template
     * @param {string} leadId - Lead document ID
     * @param {string} templateId - Template ID
     * @param {Object} variables - Template variables
     * @returns {Promise<Object>} Creation result
     */
    async addNoteFromTemplate(leadId, templateId, variables = {}) {
        try {
            // Find template
            const template = this.noteTemplates.find(t => t.id === templateId);
            
            if (!template) {
                throw new Error('Template not found');
            }
            
            // Replace variables in template
            let content = template.content;
            Object.keys(variables).forEach(key => {
                content = content.replace(`{${key}}`, variables[key]);
            });
            
            return await this.addNote(leadId, {
                content: content,
                type: this.noteTypes.GENERAL,
                tags: template.tags
            });
        } catch (error) {
            console.error('❌ Template note creation failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // ============================================
    // NOTE RETRIEVAL
    // ============================================
    
    /**
     * Get note by ID
     * @param {string} noteId - Note document ID
     * @returns {Promise<Object>} Note data
     */
    async getNoteById(noteId) {
        try {
            // Check cache
            const cachedNote = this._getFromCache(noteId);
            if (cachedNote) {
                return cachedNote;
            }
            
            const noteDoc = await this.notesCollection.doc(noteId).get();
            
            if (!noteDoc.exists) {
                throw new Error('Note not found');
            }
            
            const noteData = {
                id: noteDoc.id,
                ...noteDoc.data()
            };
            
            // Cache note
            this._setCache(noteId, noteData);
            
            return {
                success: true,
                note: noteData
            };
        } catch (error) {
            console.error('❌ Note retrieval failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'getNoteById'),
                message: error.message
            };
        }
    }
    
    /**
     * Get all notes for lead
     * @param {string} leadId - Lead document ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Notes list
     */
    async getLeadNotes(leadId, options = {}) {
        try {
            const {
                page = 1,
                pageSize = PAGINATION.NOTES_PER_PAGE,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                filters = {}
            } = options;
            
            // Build query
            let query = this.notesCollection
                .where('leadId', '==', leadId)
                .where('isDeleted', '==', false);
            
            // Apply filters
            if (filters.type) {
                query = query.where('type', '==', filters.type);
            }
            
            if (filters.isPinned) {
                query = query.where('isPinned', '==', true);
            }
            
            if (filters.isStarred) {
                query = query.where('isStarred', '==', true);
            }
            
            // Apply sorting
            query = query.orderBy(sortBy, sortOrder);
            
            // Apply pagination
            query = query.limit(pageSize);
            
            // Execute query
            const snapshot = await query.get();
            
            const notes = [];
            snapshot.forEach(doc => {
                notes.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return {
                success: true,
                notes: notes,
                count: notes.length
            };
        } catch (error) {
            console.error('❌ Notes retrieval failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'getLeadNotes'),
                message: error.message,
                notes: []
            };
        }
    }
    
    /**
     * Search notes
     * @param {string} searchTerm - Search term
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Object>} Search results
     */
    async searchNotes(searchTerm, filters = {}) {
        try {
            if (!searchTerm || searchTerm.length < 2) {
                throw new Error('Search term must be at least 2 characters');
            }
            
            const results = [];
            const searchTermLower = searchTerm.toLowerCase();
            
            // Get all notes (limited for performance)
            const snapshot = await this.notesCollection
                .where('isDeleted', '==', false)
                .orderBy('createdAt', 'desc')
                .limit(100)
                .get();
            
            snapshot.forEach(doc => {
                const note = { id: doc.id, ...doc.data() };
                
                // Check if content matches
                if (note.content && note.content.toLowerCase().includes(searchTermLower)) {
                    // Apply filters
                    if (filters.type && note.type !== filters.type) return;
                    if (filters.leadId && note.leadId !== filters.leadId) return;
                    
                    results.push(note);
                }
            });
            
            return {
                success: true,
                results: results,
                count: results.length
            };
        } catch (error) {
            console.error('❌ Note search failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'searchNotes'),
                message: error.message,
                results: []
            };
        }
    }
    
    // ============================================
    // NOTE UPDATE
    // ============================================
    
    /**
     * Update note
     * @param {string} noteId - Note document ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Update result
     */
    async updateNote(noteId, updateData) {
        try {
            // Get existing note
            const noteRef = this.notesCollection.doc(noteId);
            const noteDoc = await noteRef.get();
            
            if (!noteDoc.exists) {
                throw new Error('Note not found');
            }
            
            // Check if note is deleted
            if (noteDoc.data().isDeleted) {
                throw new Error('Cannot update deleted note');
            }
            
            // Prepare update document
            const updateDocument = {
                ...updateData,
                updatedAt: FirebaseCore.getServerTimestamp(),
                updatedBy: AuthService.getUserId()
            };
            
            // Remove restricted fields
            delete updateDocument.noteId;
            delete updateDocument.leadId;
            delete updateDocument.createdBy;
            delete updateDocument.createdAt;
            
            // Update note
            await noteRef.update(updateDocument);
            
            // Clear cache
            this._clearCache(noteId);
            
            // Log activity
            await this._logActivity(noteId, noteDoc.data().leadId, 'update', 'Note updated');
            
            // Notify listeners
            this._notifyListeners('onNoteUpdated', {
                noteId,
                updates: updateDocument
            });
            
            return {
                success: true,
                message: 'Note updated successfully'
            };
        } catch (error) {
            console.error('❌ Note update failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'updateNote'),
                message: error.message
            };
        }
    }
    
    /**
     * Pin note
     * @param {string} noteId - Note document ID
     * @param {boolean} isPinned - Pin status
     * @returns {Promise<Object>} Pin result
     */
    async pinNote(noteId, isPinned = true) {
        try {
            const result = await this.updateNote(noteId, { isPinned });
            
            this._notifyListeners('onNotePinned', { noteId, isPinned });
            
            return result;
        } catch (error) {
            console.error('❌ Note pin failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * Star note
     * @param {string} noteId - Note document ID
     * @param {boolean} isStarred - Star status
     * @returns {Promise<Object>} Star result
     */
    async starNote(noteId, isStarred = true) {
        try {
            const result = await this.updateNote(noteId, { isStarred });
            
            this._notifyListeners('onNoteStarred', { noteId, isStarred });
            
            return result;
        } catch (error) {
            console.error('❌ Note star failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // ============================================
    // NOTE DELETION
    // ============================================
    
    /**
     * Soft delete note
     * @param {string} noteId - Note document ID
     * @returns {Promise<Object>} Delete result
     */
    async softDeleteNote(noteId) {
        try {
            const noteRef = this.notesCollection.doc(noteId);
            const noteDoc = await noteRef.get();
            
            if (!noteDoc.exists) {
                throw new Error('Note not found');
            }
            
            await noteRef.update({
                isDeleted: true,
                deletedAt: FirebaseCore.getServerTimestamp(),
                deletedBy: AuthService.getUserId(),
                updatedAt: FirebaseCore.getServerTimestamp()
            });
            
            // Update lead note count
            await this.leadsCollection.doc(noteDoc.data().leadId).update({
                noteCount: firebase.firestore.FieldValue.increment(-1),
                updatedAt: FirebaseCore.getServerTimestamp()
            });
            
            // Clear cache
            this._clearCache(noteId);
            
            // Log activity
            await this._logActivity(noteId, noteDoc.data().leadId, 'delete', 'Note soft deleted');
            
            // Notify listeners
            this._notifyListeners('onNoteDeleted', { noteId });
            
            return {
                success: true,
                message: 'Note deleted successfully'
            };
        } catch (error) {
            console.error('❌ Note deletion failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * Hard delete note
     * @param {string} noteId - Note document ID
     * @returns {Promise<Object>} Delete result
     */
    async hardDeleteNote(noteId) {
        try {
            // Check permission
            if (!AuthService.isAdmin()) {
                throw new Error('Permission denied: only admin can permanently delete notes');
            }
            
            const noteRef = this.notesCollection.doc(noteId);
            const noteDoc = await noteRef.get();
            
            if (!noteDoc.exists) {
                throw new Error('Note not found');
            }
            
            await noteRef.delete();
            
            // Clear cache
            this._clearCache(noteId);
            
            // Log activity
            await this._logActivity(noteId, noteDoc.data().leadId, 'hard_delete', 'Note permanently deleted');
            
            return {
                success: true,
                message: 'Note permanently deleted'
            };
        } catch (error) {
            console.error('❌ Hard delete failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // ============================================
    // NOTE TEMPLATES
    // ============================================
    
    /**
     * Get all note templates
     * @returns {Array} Templates array
     */
    getTemplates() {
        return this.noteTemplates;
    }
    
    /**
     * Add custom template
     * @param {Object} template - Template data
     * @returns {Object} Template object
     */
    addTemplate(template) {
        const newTemplate = {
            id: this._generateNoteId(),
            name: template.name,
            content: template.content,
            tags: template.tags || []
        };
        
        this.noteTemplates.push(newTemplate);
        
        return newTemplate;
    }
    
    /**
     * Update template
     * @param {string} templateId - Template ID
     * @param {Object} updateData - Data to update
     * @returns {Object} Updated template
     */
    updateTemplate(templateId, updateData) {
        const index = this.noteTemplates.findIndex(t => t.id === templateId);
        
        if (index === -1) {
            throw new Error('Template not found');
        }
        
        this.noteTemplates[index] = {
            ...this.noteTemplates[index],
            ...updateData
        };
        
        return this.noteTemplates[index];
    }
    
    /**
     * Delete template
     * @param {string} templateId - Template ID
     * @returns {boolean} Deletion success
     */
    deleteTemplate(templateId) {
        const index = this.noteTemplates.findIndex(t => t.id === templateId);
        
        if (index === -1) {
            return false;
        }
        
        this.noteTemplates.splice(index, 1);
        return true;
    }
    
    // ============================================
    // NOTE TAGS
    // ============================================
    
    /**
     * Get all note tags
     * @returns {Array} Tags array
     */
    getTags() {
        return this.noteTags;
    }
    
    /**
     * Add custom tag
     * @param {string} tag - Tag name
     * @returns {boolean} Addition success
     */
    addTag(tag) {
        if (this.noteTags.includes(tag)) {
            return false;
        }
        
        this.noteTags.push(tag);
        return true;
    }
    
    /**
     * Remove tag
     * @param {string} tag - Tag name
     * @returns {boolean} Removal success
     */
    removeTag(tag) {
        const index = this.noteTags.indexOf(tag);
        
        if (index === -1) {
            return false;
        }
        
        this.noteTags.splice(index, 1);
        return true;
    }
    
    // ============================================
    // REAL-TIME LISTENERS
    // ============================================
    
    /**
     * Listen to lead notes
     * @param {string} leadId - Lead document ID
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    listenToLeadNotes(leadId, callback) {
        try {
            const unsubscribe = this.notesCollection
                .where('leadId', '==', leadId)
                .where('isDeleted', '==', false)
                .orderBy('createdAt', 'desc')
                .onSnapshot((snapshot) => {
                    const notes = [];
                    
                    snapshot.docChanges().forEach((change) => {
                        notes.push({
                            type: change.type,
                            noteId: change.doc.id,
                            note: change.doc.data()
                        });
                    });
                    
                    callback(notes);
                });
            
            // Store listener
            const listenerId = `${leadId}_${Date.now()}`;
            this.realtimeListeners.set(listenerId, unsubscribe);
            
            return () => {
                unsubscribe();
                this.realtimeListeners.delete(listenerId);
            };
        } catch (error) {
            console.error('❌ Note listener setup failed:', error);
            return () => {};
        }
    }
    
    // ============================================
    // UI HELPERS
    // ============================================
    
    /**
     * Open note modal
     * @param {string} leadId - Lead document ID
     */
    openNoteModal(leadId) {
        // Create modal
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
                    <h2 style="margin: 0;">📝 Add Note</h2>
                    <button onclick="this.closest('div[style]').parentElement.remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #2a5c3e;">Note Type</label>
                    <select id="noteType" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 8px;">
                        <option value="general">General</option>
                        <option value="call">Call Note</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">Email</option>
                        <option value="follow_up">Follow-up</option>
                        <option value="payment">Payment</option>
                        <option value="order">Order</option>
                        <option value="complaint">Complaint</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #2a5c3e;">Note Content *</label>
                    <textarea id="noteContent" rows="5" placeholder="Enter note details..." style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 8px; resize: vertical;"></textarea>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #2a5c3e;">Tags</label>
                    <div id="noteTagsContainer" style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${this.noteTags.map(tag => `
                            <button type="button" onclick="this.classList.toggle('active')" style="padding: 4px 10px; border: 1px solid #dee2e6; border-radius: 15px; background: none; cursor: pointer; font-size: 0.75rem; transition: all 0.2s;">
                                ${tag}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #2a5c3e;">Quick Template</label>
                    <select id="noteTemplate" onchange="if(this.value) { document.getElementById('noteContent').value = this.value; }" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 8px;">
                        <option value="">Select template...</option>
                        ${this.noteTemplates.map(tpl => `
                            <option value="${tpl.content}">${tpl.name}</option>
                        `).join('')}
                    </select>
                </div>
                
                <button onclick="NoteService.saveNoteFromModal('${leadId}')" style="width: 100%; padding: 12px; background: #2a5c3e; color: white; border: none; border-radius: 25px; font-weight: 600; cursor: pointer; transition: all 0.3s;">
                    💾 Save Note
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add active tag styles
        const style = document.createElement('style');
        style.textContent = `
            #noteTagsContainer button.active {
                background: #2a5c3e !important;
                color: white !important;
                border-color: #2a5c3e !important;
            }
        `;
        document.head.appendChild(style);
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    /**
     * Save note from modal
     * @param {string} leadId - Lead document ID
     */
    async saveNoteFromModal(leadId) {
        const content = document.getElementById('noteContent')?.value;
        const type = document.getElementById('noteType')?.value || 'general';
        
        // Get selected tags
        const tagButtons = document.querySelectorAll('#noteTagsContainer button.active');
        const tags = Array.from(tagButtons).map(btn => btn.textContent.trim());
        
        if (!content || content.trim().length === 0) {
            alert('Note content is required');
            return;
        }
        
        const result = await this.addNote(leadId, {
            content: content,
            type: type,
            tags: tags
        });
        
        if (result.success) {
            // Close modal
            const modal = document.querySelector('div[style*="z-index: 3000"]');
            if (modal) modal.remove();
            
            // Show success message
            if (typeof showToast === 'function') {
                showToast('✅ Note added successfully');
            }
        } else {
            alert(result.message);
        }
    }
    
    // ============================================
    // VALIDATION & SANITIZATION
    // ============================================
    
    /**
     * Sanitize note content
     * @param {string} content - Note content
     * @returns {string} Sanitized content
     * @private
     */
    _sanitizeContent(content) {
        if (!content) return '';
        
        return content
            .trim()
            .replace(/<script[^>]*>.*<\/script>/gi, '') // Remove scripts
            .replace(/<[^>]+>/g, '') // Remove HTML tags
            .slice(0, VALIDATION_RULES.NOTES.maxLength);
    }
    
    /**
     * Validate note data
     * @param {Object} noteData - Note data
     * @returns {Object} Validation result
     * @private
     */
    _validateNoteData(noteData) {
        if (!noteData.content || noteData.content.trim().length === 0) {
            return { success: false, message: 'Note content is required' };
        }
        
        if (noteData.content.length > VALIDATION_RULES.NOTES.maxLength) {
            return { success: false, message: `Note too long (max ${VALIDATION_RULES.NOTES.maxLength} characters)` };
        }
        
        return { success: true };
    }
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    /**
     * Generate note ID
     * @returns {string} Note ID
     * @private
     */
    _generateNoteId() {
        return 'NOTE-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
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
     * @param {string} noteId - Note ID
     * @param {string} leadId - Lead ID
     * @param {string} action - Action performed
     * @param {string} description - Activity description
     * @private
     */
    async _logActivity(noteId, leadId, action, description) {
        try {
            await FirebaseCore.getCollection('auditLogs').add({
                noteId,
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
    
    /**
     * Get from cache
     * @param {string} key - Cache key
     * @returns {Object|null} Cached data
     * @private
     */
    _getFromCache(key) {
        const cached = this.cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        
        return null;
    }
    
    /**
     * Set cache
     * @param {string} key - Cache key
     * @param {Object} data - Data to cache
     * @private
     */
    _setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    /**
     * Clear cache
     * @param {string} key - Cache key (optional)
     * @private
     */
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

const NoteServiceInstance = new NoteService();

// ============================================
// GLOBAL EXPORT
// ============================================

window.NoteService = NoteServiceInstance;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Add note to lead (global helper)
 * @param {string} leadId - Lead document ID
 * @param {string} content - Note content
 * @returns {Promise<Object>} Creation result
 */
async function addLeadNote(leadId, content) {
    return await NoteServiceInstance.addNote(leadId, { content });
}

/**
 * Get lead notes (global helper)
 * @param {string} leadId - Lead document ID
 * @returns {Promise<Object>} Notes list
 */
async function getLeadNotes(leadId) {
    return await NoteServiceInstance.getLeadNotes(leadId);
}

/**
 * Open note modal (global helper)
 * @param {string} leadId - Lead document ID
 */
function openNoteModal(leadId) {
    NoteServiceInstance.openNoteModal(leadId);
}

window.addLeadNote = addLeadNote;
window.getLeadNotes = getLeadNotes;
window.openNoteModal = openNoteModal;

console.log('✅ Note Service Loaded');

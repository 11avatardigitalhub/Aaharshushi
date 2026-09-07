/**
 * ============================================================
 * AAHAR SHUDHI - FILTER & SEARCH SERVICE
 * ============================================================
 * @description Enterprise-grade filtering and search system
 * @version 1.0.0
 * @priority MEDIUM - Core Feature
 * 
 * This service handles:
 * - Advanced multi-field filtering
 * - Global search across all fields
 * - Saved filter presets
 * - Quick filters (one-click)
 * - Date range filtering
 * - Custom filter combinations
 * - AND/OR logic operations
 * - Real-time filter updates
 * - Filter persistence
 * - Fuzzy search
 * - Search suggestions
 * - Filter history
 * ============================================================
 */

class FilterService {
    constructor() {
        // Service state
        this.db = FirebaseCore.getDb();
        this.leadsCollection = FirebaseCore.getCollection('leads');
        
        // Current filters
        this.currentFilters = {
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
            createdBy: 'All',
            hasNotes: 'All',
            hasFollowups: 'All',
            leadScoreMin: null,
            leadScoreMax: null,
            customFields: {}
        };
        
        // Filter definitions
        this.filterDefinitions = {
            search: {
                label: 'Search',
                type: 'text',
                placeholder: 'Search by name, phone, email, city...',
                appliesTo: ['name', 'phone', 'email', 'city', 'state', 'notes']
            },
            status: {
                label: 'Status',
                type: 'select',
                options: ['All', ...LEAD_STATUS.ALL]
            },
            product: {
                label: 'Product',
                type: 'select',
                options: ['All', ...PRODUCT_CATALOG.NAMES]
            },
            source: {
                label: 'Source',
                type: 'select',
                options: ['All', ...LEAD_SOURCE.ALL]
            },
            priority: {
                label: 'Priority',
                type: 'select',
                options: ['All', ...LEAD_PRIORITIES]
            },
            agent: {
                label: 'Agent',
                type: 'dynamic_select',
                collection: 'users',
                filterField: 'role',
                filterValue: 'agent'
            },
            team: {
                label: 'Team',
                type: 'select',
                options: ['All', ...TEAMS]
            },
            region: {
                label: 'Region',
                type: 'select',
                options: ['All', ...REGIONS]
            },
            dateFrom: {
                label: 'From Date',
                type: 'date'
            },
            dateTo: {
                label: 'To Date',
                type: 'date'
            },
            hasNotes: {
                label: 'Has Notes',
                type: 'select',
                options: ['All', 'Yes', 'No']
            },
            hasFollowups: {
                label: 'Has Follow-ups',
                type: 'select',
                options: ['All', 'Yes', 'No']
            }
        };
        
        // Saved filters
        this.savedFilters = this._loadSavedFilters();
        
        // Quick filters
        this.quickFilters = [
            {
                id: 'today',
                label: '📅 Today',
                description: 'Leads created today',
                apply: () => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    this.currentFilters.dateFrom = today;
                    this.currentFilters.dateTo = new Date();
                }
            },
            {
                id: 'this_week',
                label: '📆 This Week',
                description: 'Leads created this week',
                apply: () => {
                    const weekStart = new Date();
                    weekStart.setDate(weekStart.getDate() - 7);
                    this.currentFilters.dateFrom = weekStart;
                    this.currentFilters.dateTo = new Date();
                }
            },
            {
                id: 'hot_leads',
                label: '🔥 Hot Leads',
                description: 'High priority leads',
                apply: () => {
                    this.currentFilters.priority = 'Hot';
                }
            },
            {
                id: 'new_leads',
                label: '🆕 New Leads',
                description: 'Uncontacted leads',
                apply: () => {
                    this.currentFilters.status = 'New';
                }
            },
            {
                id: 'followups_due',
                label: '⏰ Follow-ups Due',
                description: 'Leads needing follow-up',
                apply: () => {
                    this.currentFilters.status = 'Follow-up';
                }
            },
            {
                id: 'interested',
                label: '💚 Interested',
                description: 'Interested leads',
                apply: () => {
                    this.currentFilters.status = 'Interested';
                }
            },
            {
                id: 'high_score',
                label: '⭐ High Score',
                description: 'Leads with score > 70',
                apply: () => {
                    this.currentFilters.leadScoreMin = 70;
                }
            },
            {
                id: 'no_agent',
                label: '👤 Unassigned',
                description: 'Leads without agent',
                apply: () => {
                    this.currentFilters.agent = 'Unassigned';
                }
            }
        ];
        
        // Filter history
        this.filterHistory = [];
        this.maxHistorySize = 20;
        
        // Event listeners
        this.eventListeners = {
            onFiltersChanged: [],
            onFiltersApplied: [],
            onFiltersReset: [],
            onFilterSaved: [],
            onFilterDeleted: [],
            onError: []
        };
        
        console.log('✅ Filter Service initialized');
    }
    
    // ============================================
    // FILTER APPLICATION
    // ============================================
    
    /**
     * Apply filters to leads
     * @param {Array} leads - Leads array
     * @param {Object} filters - Filter criteria
     * @returns {Array} Filtered leads
     */
    applyFilters(leads, filters = null) {
        try {
            const activeFilters = filters || this.currentFilters;
            
            let filteredLeads = [...leads];
            
            // Text search
            if (activeFilters.search && activeFilters.search.trim().length > 0) {
                const searchTerm = activeFilters.search.toLowerCase().trim();
                filteredLeads = filteredLeads.filter(lead => {
                    return this.filterDefinitions.search.appliesTo.some(field => {
                        const value = lead[field];
                        return value && value.toLowerCase().includes(searchTerm);
                    });
                });
            }
            
            // Status filter
            if (activeFilters.status && activeFilters.status !== 'All') {
                filteredLeads = filteredLeads.filter(lead => 
                    lead.status === activeFilters.status
                );
            }
            
            // Product filter
            if (activeFilters.product && activeFilters.product !== 'All') {
                filteredLeads = filteredLeads.filter(lead => 
                    lead.product === activeFilters.product
                );
            }
            
            // Source filter
            if (activeFilters.source && activeFilters.source !== 'All') {
                filteredLeads = filteredLeads.filter(lead => 
                    lead.source === activeFilters.source
                );
            }
            
            // Priority filter
            if (activeFilters.priority && activeFilters.priority !== 'All') {
                filteredLeads = filteredLeads.filter(lead => 
                    lead.priority === activeFilters.priority
                );
            }
            
            // Agent filter
            if (activeFilters.agent && activeFilters.agent !== 'All') {
                if (activeFilters.agent === 'Unassigned') {
                    filteredLeads = filteredLeads.filter(lead => !lead.assignedTo);
                } else {
                    filteredLeads = filteredLeads.filter(lead => 
                        lead.assignedTo === activeFilters.agent
                    );
                }
            }
            
            // Team filter
            if (activeFilters.team && activeFilters.team !== 'All') {
                filteredLeads = filteredLeads.filter(lead => 
                    lead.assignedTeam === activeFilters.team
                );
            }
            
            // Region filter
            if (activeFilters.region && activeFilters.region !== 'All') {
                filteredLeads = filteredLeads.filter(lead => 
                    lead.assignedRegion === activeFilters.region ||
                    lead.city === activeFilters.region ||
                    lead.state === activeFilters.region
                );
            }
            
            // Date range filter
            if (activeFilters.dateFrom) {
                const fromDate = new Date(activeFilters.dateFrom);
                filteredLeads = filteredLeads.filter(lead => 
                    lead.createdAt && lead.createdAt.toDate() >= fromDate
                );
            }
            
            if (activeFilters.dateTo) {
                const toDate = new Date(activeFilters.dateTo);
                toDate.setHours(23, 59, 59, 999);
                filteredLeads = filteredLeads.filter(lead => 
                    lead.createdAt && lead.createdAt.toDate() <= toDate
                );
            }
            
            // Has notes filter
            if (activeFilters.hasNotes === 'Yes') {
                filteredLeads = filteredLeads.filter(lead => 
                    lead.noteCount && lead.noteCount > 0
                );
            } else if (activeFilters.hasNotes === 'No') {
                filteredLeads = filteredLeads.filter(lead => 
                    !lead.noteCount || lead.noteCount === 0
                );
            }
            
            // Has follow-ups filter
            if (activeFilters.hasFollowups === 'Yes') {
                filteredLeads = filteredLeads.filter(lead => 
                    lead.followupCount && lead.followupCount > 0
                );
            } else if (activeFilters.hasFollowups === 'No') {
                filteredLeads = filteredLeads.filter(lead => 
                    !lead.followupCount || lead.followupCount === 0
                );
            }
            
            // Lead score range
            if (activeFilters.leadScoreMin !== null && activeFilters.leadScoreMin !== undefined) {
                filteredLeads = filteredLeads.filter(lead => 
                    (lead.leadScore || 0) >= activeFilters.leadScoreMin
                );
            }
            
            if (activeFilters.leadScoreMax !== null && activeFilters.leadScoreMax !== undefined) {
                filteredLeads = filteredLeads.filter(lead => 
                    (lead.leadScore || 0) <= activeFilters.leadScoreMax
                );
            }
            
            // Custom fields
            Object.keys(activeFilters.customFields || {}).forEach(field => {
                const value = activeFilters.customFields[field];
                if (value && value !== 'All') {
                    filteredLeads = filteredLeads.filter(lead => 
                        lead[field] === value
                    );
                }
            });
            
            // Add to history
            this._addToHistory(activeFilters);
            
            // Notify listeners
            this._notifyListeners('onFiltersApplied', {
                filters: activeFilters,
                resultCount: filteredLeads.length
            });
            
            return filteredLeads;
        } catch (error) {
            console.error('❌ Filter application failed:', error);
            this._notifyListeners('onError', error);
            return leads;
        }
    }
    
    /**
     * Apply quick filter
     * @param {string} quickFilterId - Quick filter ID
     * @param {Array} leads - Leads array
     * @returns {Array} Filtered leads
     */
    applyQuickFilter(quickFilterId, leads) {
        const quickFilter = this.quickFilters.find(qf => qf.id === quickFilterId);
        
        if (!quickFilter) {
            console.warn('⚠️ Quick filter not found:', quickFilterId);
            return leads;
        }
        
        // Reset current filters
        this.resetFilters();
        
        // Apply quick filter
        quickFilter.apply();
        
        // Apply to leads
        return this.applyFilters(leads);
    }
    
    /**
     * Reset all filters
     */
    resetFilters() {
        this.currentFilters = {
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
            createdBy: 'All',
            hasNotes: 'All',
            hasFollowups: 'All',
            leadScoreMin: null,
            leadScoreMax: null,
            customFields: {}
        };
        
        this._notifyListeners('onFiltersReset', {});
    }
    
    /**
     * Set specific filter
     * @param {string} filterKey - Filter key
     * @param {*} value - Filter value
     */
    setFilter(filterKey, value) {
        if (filterKey in this.currentFilters) {
            this.currentFilters[filterKey] = value;
            this._notifyListeners('onFiltersChanged', {
                key: filterKey,
                value: value
            });
        }
    }
    
    /**
     * Get current filters
     * @returns {Object} Current filters
     */
    getCurrentFilters() {
        return this.currentFilters;
    }
    
    /**
     * Check if any filter is active
     * @returns {boolean} Has active filters
     */
    hasActiveFilters() {
        return Object.keys(this.currentFilters).some(key => {
            const value = this.currentFilters[key];
            return value !== 'All' && value !== '' && value !== null && value !== undefined;
        });
    }
    
    /**
     * Get active filter count
     * @returns {number} Active filter count
     */
    getActiveFilterCount() {
        let count = 0;
        
        Object.keys(this.currentFilters).forEach(key => {
            const value = this.currentFilters[key];
            if (value !== 'All' && value !== '' && value !== null && value !== undefined) {
                count++;
            }
        });
        
        return count;
    }
    
    // ============================================
    // SEARCH FUNCTIONALITY
    // ============================================
    
    /**
     * Global search
     * @param {string} searchTerm - Search term
     * @param {Array} leads - Leads array
     * @returns {Array} Search results
     */
    globalSearch(searchTerm, leads) {
        try {
            if (!searchTerm || searchTerm.trim().length < 2) {
                return leads;
            }
            
            const term = searchTerm.toLowerCase().trim();
            
            return leads.filter(lead => {
                // Search in all text fields
                const searchableFields = [
                    lead.name,
                    lead.phone,
                    lead.email,
                    lead.city,
                    lead.state,
                    lead.product,
                    lead.source,
                    lead.notes,
                    lead.assignedToName,
                    lead.assignedTeam,
                    lead.assignedRegion
                ];
                
                return searchableFields.some(field => 
                    field && field.toLowerCase().includes(term)
                );
            });
        } catch (error) {
            console.error('❌ Global search failed:', error);
            return leads;
        }
    }
    
    /**
     * Fuzzy search
     * @param {string} searchTerm - Search term
     * @param {Array} leads - Leads array
     * @param {number} threshold - Similarity threshold (0-1)
     * @returns {Array} Search results
     */
    fuzzySearch(searchTerm, leads, threshold = 0.6) {
        try {
            if (!searchTerm || searchTerm.trim().length < 3) {
                return leads;
            }
            
            const term = searchTerm.toLowerCase().trim();
            
            return leads.filter(lead => {
                const name = (lead.name || '').toLowerCase();
                const similarity = this._calculateSimilarity(term, name);
                return similarity >= threshold;
            });
        } catch (error) {
            console.error('❌ Fuzzy search failed:', error);
            return leads;
        }
    }
    
    /**
     * Calculate string similarity (Levenshtein distance)
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Similarity score (0-1)
     * @private
     */
    _calculateSimilarity(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0) return len2 === 0 ? 1 : 0;
        if (len2 === 0) return 0;
        
        const matrix = [];
        
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        
        const distance = matrix[len1][len2];
        const maxLength = Math.max(len1, len2);
        
        return 1 - (distance / maxLength);
    }
    
    /**
     * Get search suggestions
     * @param {string} partialTerm - Partial search term
     * @param {Array} leads - Leads array
     * @returns {Array} Search suggestions
     */
    getSearchSuggestions(partialTerm, leads) {
        try {
            if (!partialTerm || partialTerm.length < 2) {
                return [];
            }
            
            const term = partialTerm.toLowerCase();
            const suggestions = new Set();
            
            leads.forEach(lead => {
                // Suggest names
                if (lead.name && lead.name.toLowerCase().includes(term)) {
                    suggestions.add(lead.name);
                }
                
                // Suggest cities
                if (lead.city && lead.city.toLowerCase().includes(term)) {
                    suggestions.add(lead.city);
                }
                
                // Suggest products
                if (lead.product && lead.product.toLowerCase().includes(term)) {
                    suggestions.add(lead.product);
                }
            });
            
            return Array.from(suggestions).slice(0, 10);
        } catch (error) {
            console.error('❌ Search suggestions failed:', error);
            return [];
        }
    }
    
    // ============================================
    // SAVED FILTERS
    // ============================================
    
    /**
     * Save current filters
     * @param {string} name - Filter name
     * @param {string} description - Filter description
     * @returns {Object} Saved filter
     */
    saveCurrentFilters(name, description = '') {
        const savedFilter = {
            id: this._generateFilterId(),
            name: name,
            description: description,
            filters: { ...this.currentFilters },
            savedAt: new Date().toISOString(),
            savedBy: AuthService.getUserId()
        };
        
        this.savedFilters.push(savedFilter);
        this._saveSavedFilters();
        
        this._notifyListeners('onFilterSaved', savedFilter);
        
        return savedFilter;
    }
    
    /**
     * Apply saved filter
     * @param {string} filterId - Saved filter ID
     * @returns {boolean} Apply success
     */
    applySavedFilter(filterId) {
        const savedFilter = this.savedFilters.find(f => f.id === filterId);
        
        if (!savedFilter) {
            return false;
        }
        
        this.currentFilters = { ...savedFilter.filters };
        this._notifyListeners('onFiltersApplied', {
            filters: this.currentFilters
        });
        
        return true;
    }
    
    /**
     * Delete saved filter
     * @param {string} filterId - Saved filter ID
     * @returns {boolean} Delete success
     */
    deleteSavedFilter(filterId) {
        const index = this.savedFilters.findIndex(f => f.id === filterId);
        
        if (index === -1) {
            return false;
        }
        
        this.savedFilters.splice(index, 1);
        this._saveSavedFilters();
        
        this._notifyListeners('onFilterDeleted', { filterId });
        
        return true;
    }
    
    /**
     * Get all saved filters
     * @returns {Array} Saved filters
     */
    getSavedFilters() {
        return this.savedFilters;
    }
    
    /**
     * Load saved filters from localStorage
     * @returns {Array} Saved filters
     * @private
     */
    _loadSavedFilters() {
        try {
            const saved = localStorage.getItem('savedFilters');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.warn('⚠️ Could not load saved filters:', error);
            return [];
        }
    }
    
    /**
     * Save saved filters to localStorage
     * @private
     */
    _saveSavedFilters() {
        try {
            localStorage.setItem('savedFilters', JSON.stringify(this.savedFilters));
        } catch (error) {
            console.warn('⚠️ Could not save saved filters:', error);
        }
    }
    
    // ============================================
    // FILTER HISTORY
    // ============================================
    
    /**
     * Add to filter history
     * @param {Object} filters - Filter criteria
     * @private
     */
    _addToHistory(filters) {
        this.filterHistory.unshift({
            filters: { ...filters },
            appliedAt: new Date().toISOString()
        });
        
        // Limit history size
        if (this.filterHistory.length > this.maxHistorySize) {
            this.filterHistory.pop();
        }
    }
    
    /**
     * Get filter history
     * @returns {Array} Filter history
     */
    getFilterHistory() {
        return this.filterHistory;
    }
    
    /**
     * Clear filter history
     */
    clearFilterHistory() {
        this.filterHistory = [];
    }
    
    // ============================================
    // SORTING
    // ============================================
    
    /**
     * Sort leads
     * @param {Array} leads - Leads array
     * @param {string} sortBy - Sort field
     * @param {string} sortOrder - Sort order ('asc' or 'desc')
     * @returns {Array} Sorted leads
     */
    sortLeads(leads, sortBy = 'createdAt', sortOrder = 'desc') {
        try {
            const sortedLeads = [...leads];
            
            sortedLeads.sort((a, b) => {
                let valueA = a[sortBy];
                let valueB = b[sortBy];
                
                // Handle Firestore timestamps
                if (valueA && valueA.toDate) {
                    valueA = valueA.toDate();
                }
                if (valueB && valueB.toDate) {
                    valueB = valueB.toDate();
                }
                
                // Handle strings
                if (typeof valueA === 'string') {
                    valueA = valueA.toLowerCase();
                    valueB = valueB.toLowerCase();
                }
                
                // Handle null/undefined
                if (valueA === null || valueA === undefined) return 1;
                if (valueB === null || valueB === undefined) return -1;
                
                if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
                if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
            
            return sortedLeads;
        } catch (error) {
            console.error('❌ Sort failed:', error);
            return leads;
        }
    }
    
    // ============================================
    // PAGINATION
    // ============================================
    
    /**
     * Paginate leads
     * @param {Array} leads - Leads array
     * @param {number} page - Page number
     * @param {number} pageSize - Page size
     * @returns {Object} Paginated results
     */
    paginateLeads(leads, page = 1, pageSize = PAGINATION.LEADS_PER_PAGE) {
        try {
            const totalLeads = leads.length;
            const totalPages = Math.ceil(totalLeads / pageSize);
            
            const startIndex = (page - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, totalLeads);
            
            const paginatedLeads = leads.slice(startIndex, endIndex);
            
            return {
                leads: paginatedLeads,
                pagination: {
                    currentPage: page,
                    pageSize: pageSize,
                    totalLeads: totalLeads,
                    totalPages: totalPages,
                    hasNext: page < totalPages,
                    hasPrevious: page > 1,
                    startIndex: startIndex + 1,
                    endIndex: endIndex
                }
            };
        } catch (error) {
            console.error('❌ Pagination failed:', error);
            return {
                leads: leads,
                pagination: {
                    currentPage: 1,
                    pageSize: pageSize,
                    totalLeads: leads.length,
                    totalPages: 1,
                    hasNext: false,
                    hasPrevious: false
                }
            };
        }
    }
    
    // ============================================
    // UI RENDERING
    // ============================================
    
    /**
     * Render filter bar
     * @param {HTMLElement} container - Container element
     */
    renderFilterBar(container) {
        container.innerHTML = '';
        
        // Search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '🔍 Search leads...';
        searchInput.value = this.currentFilters.search;
        searchInput.style.cssText = `
            flex: 2;
            min-width: 200px;
            padding: 10px 14px;
            border: 1px solid #dee2e6;
            border-radius: 25px;
            font-size: 0.85rem;
        `;
        searchInput.addEventListener('input', (e) => {
            this.setFilter('search', e.target.value);
        });
        
        container.appendChild(searchInput);
        
        // Filter selects
        const filterKeys = ['status', 'product', 'source', 'priority', 'team', 'region'];
        
        filterKeys.forEach(key => {
            const definition = this.filterDefinitions[key];
            
            if (definition && definition.type === 'select') {
                const select = document.createElement('select');
                select.style.cssText = `
                    flex: 1;
                    min-width: 120px;
                    padding: 10px;
                    border: 1px solid #dee2e6;
                    border-radius: 25px;
                    font-size: 0.85rem;
                `;
                
                definition.options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option;
                    optionElement.textContent = option;
                    if (this.currentFilters[key] === option) {
                        optionElement.selected = true;
                    }
                    select.appendChild(optionElement);
                });
                
                select.addEventListener('change', (e) => {
                    this.setFilter(key, e.target.value);
                });
                
                container.appendChild(select);
            }
        });
        
        // Reset button
        const resetButton = document.createElement('button');
        resetButton.textContent = '🔄 Reset';
        resetButton.style.cssText = `
            padding: 10px 16px;
            border: 1px solid #dee2e6;
            border-radius: 25px;
            background: white;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 600;
            transition: all 0.3s ease;
        `;
        resetButton.onclick = () => {
            this.resetFilters();
            this.renderFilterBar(container);
        };
        
        container.appendChild(resetButton);
    }
    
    /**
     * Render quick filters
     * @param {HTMLElement} container - Container element
     */
    renderQuickFilters(container) {
        container.innerHTML = '';
        
        this.quickFilters.forEach(filter => {
            const button = document.createElement('button');
            button.textContent = filter.label;
            button.title = filter.description;
            button.style.cssText = `
                padding: 8px 14px;
                border: 1px solid #dee2e6;
                border-radius: 20px;
                background: white;
                cursor: pointer;
                font-size: 0.8rem;
                font-weight: 600;
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                white-space: nowrap;
            `;
            button.onmouseover = () => {
                button.style.background = '#2a5c3e';
                button.style.color = 'white';
                button.style.borderColor = '#2a5c3e';
                button.style.transform = 'translateY(-2px)';
            };
            button.onmouseout = () => {
                button.style.background = 'white';
                button.style.color = '#1e3a2f';
                button.style.borderColor = '#dee2e6';
                button.style.transform = 'translateY(0)';
            };
            button.onclick = () => {
                this.applyQuickFilter(filter.id, []);
                this.renderQuickFilters(container);
            };
            
            container.appendChild(button);
        });
    }
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    /**
     * Generate filter ID
     * @returns {string} Filter ID
     * @private
     */
    _generateFilterId() {
        return 'FILTER-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
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

const FilterServiceInstance = new FilterService();

// ============================================
// GLOBAL EXPORT
// ============================================

window.FilterService = FilterServiceInstance;

// ============================================
// HELPER FUNCTIONS
// ============================================

function applyFilters(leads, filters) {
    return FilterServiceInstance.applyFilters(leads, filters);
}

function applyQuickFilter(quickFilterId, leads) {
    return FilterServiceInstance.applyQuickFilter(quickFilterId, leads);
}

function resetFilters() {
    FilterServiceInstance.resetFilters();
}

function globalSearch(searchTerm, leads) {
    return FilterServiceInstance.globalSearch(searchTerm, leads);
}

function sortLeads(leads, sortBy, sortOrder) {
    return FilterServiceInstance.sortLeads(leads, sortBy, sortOrder);
}

function paginateLeads(leads, page, pageSize) {
    return FilterServiceInstance.paginateLeads(leads, page, pageSize);
}

function renderFilterBar(container) {
    FilterServiceInstance.renderFilterBar(container);
}

function renderQuickFilters(container) {
    FilterServiceInstance.renderQuickFilters(container);
}

window.applyFilters = applyFilters;
window.applyQuickFilter = applyQuickFilter;
window.resetFilters = resetFilters;
window.globalSearch = globalSearch;
window.sortLeads = sortLeads;
window.paginateLeads = paginateLeads;
window.renderFilterBar = renderFilterBar;
window.renderQuickFilters = renderQuickFilters;

console.log('✅ Filter Service Loaded');

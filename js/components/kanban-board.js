/**
 * ============================================================
 * AAHAR SHUDHI - KANBAN BOARD COMPONENT
 * ============================================================
 * @description Enterprise-grade Kanban board UI component
 * @version 1.0.0
 * @priority HIGH - UI Component
 * 
 * Features:
 * - Complete board rendering
 * - Column management
 * - Card drag & drop
 * - Real-time updates
 * - Board search
 * - Column filtering
 * - Card count display
 * - WIP limits
 * - Column collapse
 * - Board presets
 * - Keyboard navigation
 * - Touch support
 * ============================================================
 */

class KanbanBoardComponent {
    constructor() {
        // Board state
        this.board = null;
        this.columns = [];
        this.cards = new Map();
        this.columnElements = new Map();
        this.sortableInstances = new Map();
        
        // Board configuration
        this.config = {
            boardId: 'kanban-board',
            columnWidth: 280,
            columnMinWidth: 220,
            columnGap: 16,
            animationDuration: 300,
            dragDelay: 100,
            touchDelay: 200,
            enableWIPLimits: true,
            enableCardCount: true,
            enableColumnCollapse: true,
            enableBoardSearch: true,
            enableColumnFilter: true,
            maxColumns: 10,
            maxCardsPerColumn: 100
        };
        
        // Default columns
        this.defaultColumns = [
            { id: 'new', title: 'New', icon: '🆕', color: '#fff3cd', textColor: '#856404', wipLimit: 50, order: 1, isDefault: true, isCollapsed: false },
            { id: 'contacted', title: 'Contacted', icon: '📞', color: '#d1ecf1', textColor: '#0c5460', wipLimit: 50, order: 2, isDefault: true, isCollapsed: false },
            { id: 'follow-up', title: 'Follow-up', icon: '⏰', color: '#e7d9ff', textColor: '#4a3696', wipLimit: 30, order: 3, isDefault: true, isCollapsed: false },
            { id: 'interested', title: 'Interested', icon: '💚', color: '#d4edda', textColor: '#155724', wipLimit: 20, order: 4, isDefault: true, isCollapsed: false },
            { id: 'not-interested', title: 'Not Interested', icon: '❌', color: '#f8d7da', textColor: '#721c24', wipLimit: 50, order: 5, isDefault: true, isCollapsed: false },
            { id: 'closed', title: 'Closed', icon: '✅', color: '#d6d8db', textColor: '#383d41', wipLimit: 100, order: 6, isDefault: true, isCollapsed: false }
        ];
        
        // Event listeners
        this.eventListeners = {
            onBoardReady: [],
            onCardDragStart: [],
            onCardDragEnd: [],
            onCardMove: [],
            onColumnAdd: [],
            onColumnRemove: [],
            onColumnUpdate: [],
            onCardAdd: [],
            onCardRemove: [],
            onCardUpdate: [],
            onSearch: [],
            onFilter: [],
            onError: []
        };
        
        console.log('✅ Kanban Board Component initialized');
    }
    
    // ============================================
    // BOARD INITIALIZATION
    // ============================================
    
    /**
     * Initialize board
     * @param {HTMLElement} container - Board container
     * @param {Object} options - Board options
     * @returns {Promise<Object>} Initialization result
     */
    async initialize(container, options = {}) {
        try {
            if (!container) {
                throw new Error('Container is required');
            }
            
            this.board = container;
            this.config = { ...this.config, ...options };
            
            // Apply board styles
            this._applyBoardStyles();
            
            // Create board toolbar
            if (this.config.enableBoardSearch || this.config.enableColumnFilter) {
                this._createBoardToolbar();
            }
            
            // Create columns container
            this.columnsContainer = document.createElement('div');
            this.columnsContainer.className = 'kanban-columns-container';
            this.columnsContainer.style.cssText = `
                display: flex;
                gap: ${this.config.columnGap}px;
                overflow-x: auto;
                overflow-y: hidden;
                padding: 16px;
                min-height: 500px;
                align-items: flex-start;
                scroll-behavior: smooth;
                -webkit-overflow-scrolling: touch;
                scroll-snap-type: x proximity;
            `;
            this.board.appendChild(this.columnsContainer);
            
            // Load columns
            const columns = options.columns || this.defaultColumns;
            
            for (const columnConfig of columns) {
                this.createColumn(columnConfig);
            }
            
            // Setup drag & drop
            this._setupGlobalDragDrop();
            
            // Notify listeners
            this._notifyListeners('onBoardReady', {
                board: this.board,
                columns: this.columns
            });
            
            return {
                success: true,
                columns: this.columns.length
            };
        } catch (error) {
            console.error('❌ Board initialization failed:', error);
            this._notifyListeners('onError', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Apply board styles
     * @private
     */
    _applyBoardStyles() {
        if (!this.board) return;
        
        this.board.style.cssText = `
            background: transparent;
            border-radius: 16px;
            position: relative;
            width: 100%;
        `;
    }
    
    /**
     * Create board toolbar
     * @private
     */
    _createBoardToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'kanban-toolbar';
        toolbar.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: white;
            border-radius: 12px;
            margin-bottom: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            flex-wrap: wrap;
        `;
        
        // Search input
        if (this.config.enableBoardSearch) {
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = '🔍 Search cards...';
            searchInput.style.cssText = `
                flex: 1;
                min-width: 150px;
                padding: 10px 14px;
                border: 1px solid #dee2e6;
                border-radius: 25px;
                font-size: 0.85rem;
                font-family: inherit;
                transition: all 0.3s ease;
            `;
            searchInput.addEventListener('input', (e) => {
                this._handleSearch(e.target.value);
            });
            toolbar.appendChild(searchInput);
        }
        
        // Column filter
        if (this.config.enableColumnFilter) {
            const filterSelect = document.createElement('select');
            filterSelect.style.cssText = `
                padding: 10px 14px;
                border: 1px solid #dee2e6;
                border-radius: 25px;
                font-size: 0.85rem;
                font-family: inherit;
                cursor: pointer;
                background: white;
            `;
            filterSelect.innerHTML = `
                <option value="all">All Columns</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="follow-up">Follow-up</option>
                <option value="interested">Interested</option>
                <option value="not-interested">Not Interested</option>
                <option value="closed">Closed</option>
            `;
            filterSelect.addEventListener('change', (e) => {
                this._handleColumnFilter(e.target.value);
            });
            toolbar.appendChild(filterSelect);
        }
        
        // Add Column button
        const addColumnBtn = document.createElement('button');
        addColumnBtn.textContent = '+ Add Column';
        addColumnBtn.style.cssText = `
            padding: 10px 16px;
            border: 1px solid #2a5c3e;
            border-radius: 25px;
            background: white;
            color: #2a5c3e;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.85rem;
            font-family: inherit;
            transition: all 0.3s ease;
            white-space: nowrap;
        `;
        addColumnBtn.onclick = () => this._showAddColumnModal();
        toolbar.appendChild(addColumnBtn);
        
        this.board.appendChild(toolbar);
    }
    
    // ============================================
    // COLUMN MANAGEMENT
    // ============================================
    
    /**
     * Create column
     * @param {Object} columnConfig - Column configuration
     * @returns {Object} Column object
     */
    createColumn(columnConfig) {
        try {
            // Check max columns
            if (this.columns.length >= this.config.maxColumns) {
                throw new Error(`Maximum ${this.config.maxColumns} columns allowed`);
            }
            
            const column = {
                id: columnConfig.id || this._generateId('col'),
                title: columnConfig.title || 'New Column',
                icon: columnConfig.icon || '📋',
                color: columnConfig.color || '#e9ecef',
                textColor: columnConfig.textColor || '#1e3a2f',
                wipLimit: columnConfig.wipLimit || 50,
                order: columnConfig.order || this.columns.length + 1,
                isDefault: columnConfig.isDefault || false,
                isCollapsed: columnConfig.isCollapsed || false,
                cards: []
            };
            
            // Create column element
            const columnElement = this._createColumnElement(column);
            
            // Add to DOM
            this.columnsContainer.appendChild(columnElement);
            
            // Store references
            this.columns.push(column);
            this.columnElements.set(column.id, columnElement);
            
            // Setup sortable
            this._setupSortableForColumn(columnElement, column.id);
            
            // Notify listeners
            this._notifyListeners('onColumnAdd', column);
            
            return column;
        } catch (error) {
            console.error('❌ Column creation failed:', error);
            return null;
        }
    }
    
    /**
     * Create column element
     * @param {Object} column - Column data
     * @returns {HTMLElement} Column element
     * @private
     */
    _createColumnElement(column) {
        const columnElement = document.createElement('div');
        columnElement.className = 'kanban-column';
        columnElement.dataset.columnId = column.id;
        columnElement.style.cssText = `
            background: ${column.color};
            border-radius: 12px;
            padding: 12px;
            min-width: ${this.config.columnMinWidth}px;
            width: ${this.config.columnWidth}px;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            max-height: calc(100vh - 250px);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            scroll-snap-align: start;
            position: relative;
        `;
        
        // Column header
        const header = this._createColumnHeader(column);
        columnElement.appendChild(header);
        
        // Cards container
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'kanban-cards';
        cardsContainer.dataset.columnId = column.id;
        cardsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
            overflow-y: auto;
            flex: 1;
            min-height: 100px;
            padding: 4px;
            transition: background 0.2s ease;
        `;
        
        // Drop zone indicator
        cardsContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            cardsContainer.style.background = 'rgba(42,92,62,0.05)';
            cardsContainer.style.borderRadius = '8px';
        });
        
        cardsContainer.addEventListener('dragleave', () => {
            cardsContainer.style.background = 'transparent';
        });
        
        cardsContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            cardsContainer.style.background = 'transparent';
        });
        
        columnElement.appendChild(cardsContainer);
        
        // WIP indicator
        if (this.config.enableWIPLimits && column.wipLimit) {
            const wipIndicator = document.createElement('div');
            wipIndicator.className = 'wip-indicator';
            wipIndicator.style.cssText = `
                font-size: 10px;
                color: #6c757d;
                text-align: center;
                padding: 4px;
                border-top: 1px dashed #d0d0d0;
                margin-top: auto;
                user-select: none;
            `;
            wipIndicator.textContent = `0/${column.wipLimit}`;
            columnElement.appendChild(wipIndicator);
        }
        
        return columnElement;
    }
    
    /**
     * Create column header
     * @param {Object} column - Column data
     * @returns {HTMLElement} Header element
     * @private
     */
    _createColumnHeader(column) {
        const header = document.createElement('div');
        header.className = 'kanban-column-header';
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 10px;
            background: rgba(255,255,255,0.9);
            border-radius: 8px;
            margin-bottom: 10px;
            cursor: pointer;
            user-select: none;
            transition: background 0.2s ease;
        `;
        
        // Title section
        const titleSection = document.createElement('div');
        titleSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            font-weight: 700;
            font-size: 0.8rem;
            color: ${column.textColor};
        `;
        titleSection.innerHTML = `${column.icon} ${column.title}`;
        
        // Actions section
        const actionsSection = document.createElement('div');
        actionsSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 4px;
        `;
        
        // Card count
        if (this.config.enableCardCount) {
            const count = document.createElement('span');
            count.className = 'kanban-count';
            count.style.cssText = `
                background: ${column.textColor};
                color: white;
                padding: 2px 8px;
                border-radius: 15px;
                font-size: 0.65rem;
                font-weight: 700;
                min-width: 20px;
                text-align: center;
            `;
            count.textContent = '0';
            count.dataset.countFor = column.id;
            actionsSection.appendChild(count);
        }
        
        // Collapse button
        if (this.config.enableColumnCollapse) {
            const collapseBtn = document.createElement('button');
            collapseBtn.style.cssText = `
                background: none;
                border: none;
                cursor: pointer;
                font-size: 0.9rem;
                padding: 0 4px;
                color: ${column.textColor};
                transition: transform 0.3s ease;
            `;
            collapseBtn.textContent = column.isCollapsed ? '▶' : '▼';
            collapseBtn.onclick = (e) => {
                e.stopPropagation();
                this.toggleColumnCollapse(column.id);
            };
            actionsSection.appendChild(collapseBtn);
        }
        
        // Menu button
        if (!column.isDefault) {
            const menuBtn = document.createElement('button');
            menuBtn.style.cssText = `
                background: none;
                border: none;
                cursor: pointer;
                font-size: 0.9rem;
                padding: 0 4px;
                color: ${column.textColor};
            `;
            menuBtn.textContent = '⋯';
            menuBtn.onclick = (e) => {
                e.stopPropagation();
                this._showColumnMenu(column.id, e);
            };
            actionsSection.appendChild(menuBtn);
        }
        
        header.appendChild(titleSection);
        header.appendChild(actionsSection);
        
        // Column header click to collapse
        header.onclick = () => {
            if (this.config.enableColumnCollapse) {
                this.toggleColumnCollapse(column.id);
            }
        };
        
        return header;
    }
    
    /**
     * Toggle column collapse
     * @param {string} columnId - Column ID
     */
    toggleColumnCollapse(columnId) {
        const column = this.columns.find(c => c.id === columnId);
        if (!column) return;
        
        column.isCollapsed = !column.isCollapsed;
        
        const columnElement = this.columnElements.get(columnId);
        if (!columnElement) return;
        
        const cardsContainer = columnElement.querySelector('.kanban-cards');
        const wipIndicator = columnElement.querySelector('.wip-indicator');
        const collapseBtn = columnElement.querySelector('button:nth-child(2)');
        
        if (column.isCollapsed) {
            cardsContainer.style.display = 'none';
            if (wipIndicator) wipIndicator.style.display = 'none';
            columnElement.style.width = '50px';
            columnElement.style.minWidth = '50px';
            if (collapseBtn) collapseBtn.textContent = '▶';
        } else {
            cardsContainer.style.display = 'flex';
            if (wipIndicator) wipIndicator.style.display = 'block';
            columnElement.style.width = `${this.config.columnWidth}px`;
            columnElement.style.minWidth = `${this.config.columnMinWidth}px`;
            if (collapseBtn) collapseBtn.textContent = '▼';
        }
    }
    
    // ============================================
    // CARD MANAGEMENT
    // ============================================
    
    /**
     * Add card to column
     * @param {string} columnId - Column ID
     * @param {Object} cardData - Card data
     * @returns {Object|null} Card object
     */
    addCard(columnId, cardData) {
        try {
            const column = this.columns.find(c => c.id === columnId);
            if (!column) {
                throw new Error('Column not found');
            }
            
            // Check WIP limit
            if (column.wipLimit && column.cards.length >= column.wipLimit) {
                throw new Error(`WIP limit reached (${column.wipLimit})`);
            }
            
            const card = {
                id: cardData.id || this._generateId('card'),
                columnId: columnId,
                data: cardData,
                element: null
            };
            
            // Create card element using LeadCard component
            if (window.LeadCard) {
                card.element = window.LeadCard.create(cardData, {
                    showQuickActions: true,
                    enable3DTilt: true
                });
            } else {
                card.element = this._createSimpleCardElement(cardData);
            }
            
            // Set drag attributes
            card.element.draggable = true;
            card.element.dataset.cardId = card.id;
            card.element.dataset.columnId = columnId;
            
            // Add to container
            const cardsContainer = this.columnsContainer.querySelector(`.kanban-cards[data-column-id="${columnId}"]`);
            if (cardsContainer) {
                cardsContainer.appendChild(card.element);
            }
            
            // Store card
            column.cards.push(card);
            this.cards.set(card.id, card);
            
            // Update count
            this._updateColumnCount(columnId);
            this._updateWIPIndicator(columnId);
            
            // Animate card in
            card.element.style.animation = 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            
            // Setup drag events
            this._setupCardDragEvents(card);
            
            // Notify listeners
            this._notifyListeners('onCardAdd', card);
            
            return card;
        } catch (error) {
            console.error('❌ Card addition failed:', error);
            return null;
        }
    }
    
    /**
     * Remove card
     * @param {string} cardId - Card ID
     * @returns {boolean} Success
     */
    removeCard(cardId) {
        const card = this.cards.get(cardId);
        if (!card) return false;
        
        const column = this.columns.find(c => c.id === card.columnId);
        if (column) {
            column.cards = column.cards.filter(c => c.id !== cardId);
        }
        
        // Remove element
        if (card.element && card.element.parentNode) {
            card.element.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                card.element.remove();
            }, 300);
        }
        
        this.cards.delete(cardId);
        
        // Update count
        this._updateColumnCount(card.columnId);
        this._updateWIPIndicator(card.columnId);
        
        this._notifyListeners('onCardRemove', { cardId });
        
        return true;
    }
    
    /**
     * Move card to column
     * @param {string} cardId - Card ID
     * @param {string} newColumnId - New column ID
     * @param {number} newIndex - New index
     * @returns {boolean} Success
     */
    moveCard(cardId, newColumnId, newIndex = 0) {
        const card = this.cards.get(cardId);
        if (!card) return false;
        
        const oldColumnId = card.columnId;
        
        if (oldColumnId === newColumnId) {
            // Reorder within same column
            this._reorderCard(cardId, newIndex);
            return true;
        }
        
        const oldColumn = this.columns.find(c => c.id === oldColumnId);
        const newColumn = this.columns.find(c => c.id === newColumnId);
        
        if (!oldColumn || !newColumn) return false;
        
        // Check WIP limit
        if (newColumn.wipLimit && newColumn.cards.length >= newColumn.wipLimit) {
            this._showWIPLimitWarning(newColumn);
            return false;
        }
        
        // Remove from old column
        oldColumn.cards = oldColumn.cards.filter(c => c.id !== cardId);
        
        // Add to new column
        card.columnId = newColumnId;
        newColumn.cards.splice(newIndex, 0, card);
        
        // Move DOM element
        const newCardsContainer = this.columnsContainer.querySelector(`.kanban-cards[data-column-id="${newColumnId}"]`);
        if (newCardsContainer && card.element) {
            card.element.dataset.columnId = newColumnId;
            const cards = newCardsContainer.querySelectorAll('.kanban-card, .lead-card');
            if (cards[newIndex]) {
                newCardsContainer.insertBefore(card.element, cards[newIndex]);
            } else {
                newCardsContainer.appendChild(card.element);
            }
        }
        
        // Update counts
        this._updateColumnCount(oldColumnId);
        this._updateColumnCount(newColumnId);
        this._updateWIPIndicator(oldColumnId);
        this._updateWIPIndicator(newColumnId);
        
        this._notifyListeners('onCardMove', {
            cardId,
            fromColumnId: oldColumnId,
            toColumnId: newColumnId,
            fromStatus: oldColumn.title,
            toStatus: newColumn.title
        });
        
        return true;
    }
    
    /**
     * Reorder card within column
     * @param {string} cardId - Card ID
     * @param {number} newIndex - New index
     * @private
     */
    _reorderCard(cardId, newIndex) {
        const card = this.cards.get(cardId);
        if (!card) return;
        
        const column = this.columns.find(c => c.id === card.columnId);
        if (!column) return;
        
        column.cards = column.cards.filter(c => c.id !== cardId);
        column.cards.splice(newIndex, 0, card);
        
        // Reorder DOM
        const cardsContainer = this.columnsContainer.querySelector(`.kanban-cards[data-column-id="${card.columnId}"]`);
        if (cardsContainer && card.element) {
            const cards = cardsContainer.querySelectorAll('.kanban-card, .lead-card');
            if (cards[newIndex]) {
                cardsContainer.insertBefore(card.element, cards[newIndex]);
            } else {
                cardsContainer.appendChild(card.element);
            }
        }
    }
    
    // ============================================
    // DRAG & DROP SETUP
    // ============================================
    
    /**
     * Setup global drag & drop
     * @private
     */
    _setupGlobalDragDrop() {
        if (!this.columnsContainer) return;
        
        this.columnsContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        this.columnsContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            
            const cardId = e.dataTransfer.getData('text/plain');
            const targetCard = e.target.closest('.kanban-card, .lead-card');
            const targetColumn = e.target.closest('.kanban-column');
            
            if (cardId && targetColumn) {
                const columnId = targetColumn.dataset.columnId;
                let newIndex = 0;
                
                if (targetCard) {
                    const cards = targetColumn.querySelectorAll('.kanban-card, .lead-card');
                    newIndex = Array.from(cards).indexOf(targetCard);
                }
                
                this.moveCard(cardId, columnId, newIndex);
            }
        });
    }
    
    /**
     * Setup sortable for column
     * @param {HTMLElement} columnElement - Column element
     * @param {string} columnId - Column ID
     * @private
     */
    _setupSortableForColumn(columnElement, columnId) {
        const cardsContainer = columnElement.querySelector('.kanban-cards');
        if (!cardsContainer) return;
        
        if (typeof Sortable !== 'undefined') {
            const sortable = new Sortable(cardsContainer, {
                group: 'kanban-cards',
                animation: this.config.animationDuration,
                delay: this.config.dragDelay,
                touchStartThreshold: this.config.touchDelay,
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                chosenClass: 'sortable-chosen',
                
                onAdd: (evt) => {
                    const cardId = evt.item.dataset.cardId;
                    const newColumnId = evt.to.closest('.kanban-column').dataset.columnId;
                    const newIndex = evt.newIndex;
                    
                    this.moveCard(cardId, newColumnId, newIndex);
                },
                
                onUpdate: (evt) => {
                    const cardId = evt.item.dataset.cardId;
                    const columnId = evt.from.closest('.kanban-column').dataset.columnId;
                    const newIndex = evt.newIndex;
                    
                    this._reorderCard(cardId, newIndex);
                },
                
                onStart: (evt) => {
                    evt.item.style.transform = 'scale(1.05)';
                    evt.item.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
                    this._notifyListeners('onCardDragStart', { cardId: evt.item.dataset.cardId });
                },
                
                onEnd: (evt) => {
                    evt.item.style.transform = 'scale(1)';
                    evt.item.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                    this._notifyListeners('onCardDragEnd', { cardId: evt.item.dataset.cardId });
                }
            });
            
            this.sortableInstances.set(columnId, sortable);
        }
    }
    
    /**
     * Setup card drag events
     * @param {Object} card - Card object
     * @private
     */
    _setupCardDragEvents(card) {
        if (!card.element) return;
        
        card.element.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.id);
            e.dataTransfer.effectAllowed = 'move';
            card.element.style.opacity = '0.5';
            this._notifyListeners('onCardDragStart', { cardId: card.id });
        });
        
        card.element.addEventListener('dragend', () => {
            card.element.style.opacity = '1';
            this._notifyListeners('onCardDragEnd', { cardId: card.id });
        });
    }
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    _updateColumnCount(columnId) {
        const column = this.columns.find(c => c.id === columnId);
        if (!column) return;
        
        const countElement = this.columnsContainer.querySelector(`[data-count-for="${columnId}"]`);
        if (countElement) {
            countElement.textContent = column.cards.length;
        }
    }
    
    _updateWIPIndicator(columnId) {
        const column = this.columns.find(c => c.id === columnId);
        if (!column || !column.wipLimit) return;
        
        const wipElement = this.columnsContainer.querySelector(`.kanban-column[data-column-id="${columnId}"] .wip-indicator`);
        if (wipElement) {
            const remaining = column.wipLimit - column.cards.length;
            wipElement.textContent = `${column.cards.length}/${column.wipLimit}`;
            wipElement.style.color = remaining <= 5 ? '#dc3545' : remaining <= 10 ? '#ffc107' : '#6c757d';
        }
    }
    
    _handleSearch(searchTerm) {
        this._notifyListeners('onSearch', searchTerm);
        
        const term = searchTerm.toLowerCase();
        
        this.cards.forEach((card, cardId) => {
            if (!card.element) return;
            
            const lead = card.data;
            const matches = !term || 
                (lead.name && lead.name.toLowerCase().includes(term)) ||
                (lead.phone && lead.phone.includes(term)) ||
                (lead.city && lead.city.toLowerCase().includes(term));
            
            card.element.style.display = matches ? 'block' : 'none';
        });
    }
    
    _handleColumnFilter(columnId) {
        this._notifyListeners('onFilter', columnId);
        
        this.columns.forEach(column => {
            const columnElement = this.columnElements.get(column.id);
            if (columnElement) {
                columnElement.style.display = (columnId === 'all' || column.id === columnId) ? 'flex' : 'none';
            }
        });
    }
    
    _showWIPLimitWarning(column) {
        if (window.Toast) {
            window.Toast.warning(`WIP limit reached for ${column.title} (${column.wipLimit} cards max)`);
        }
    }
    
    _showAddColumnModal() {
        if (window.Toast) {
            window.Toast.info('Add column feature coming soon');
        }
    }
    
    _showColumnMenu(columnId, event) {
        if (window.Toast) {
            window.Toast.info('Column menu coming soon');
        }
    }
    
    _generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }
    
    _createSimpleCardElement(cardData) {
        const element = document.createElement('div');
        element.className = 'kanban-card';
        element.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            cursor: grab;
        `;
        element.innerHTML = `
            <div style="font-weight: 600; font-size: 0.85rem;">${cardData.name || 'Unknown'}</div>
            <div style="font-size: 0.75rem; color: #6c757d;">${cardData.phone || ''}</div>
        `;
        return element;
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

const KanbanBoardComponentInstance = new KanbanBoardComponent();

// ============================================
// GLOBAL EXPORT
// ============================================

window.KanbanBoard = KanbanBoardComponentInstance;

console.log('✅ Kanban Board Component Loaded');

/**
 * ============================================================
 * AAHAR SHUDHI - KANBAN BOARD SERVICE
 * ============================================================
 * @description Enterprise-grade Kanban board management
 * @version 1.0.0
 * @priority HIGHEST - Core Feature
 * 
 * This service handles:
 * - Kanban board initialization & configuration
 * - Column management (CRUD operations)
 * - Card management & rendering
 * - Drag & drop functionality
 * - Real-time synchronization
 * - Mobile touch support
 * - Undo/Redo operations
 * - Column limits (WIP)
 * - Custom column creation
 * - Board presets & templates
 * - Performance optimization
 * - Animation system
 * - Accessibility features
 * ============================================================
 */

class KanbanService {
    constructor() {
        // Service state
        this.board = null;
        this.columns = [];
        this.cards = new Map();
        this.columnElements = new Map();
        this.sortableInstances = new Map();
        
        // Board configuration
        this.boardConfig = {
            boardId: 'main-board',
            columnWidth: 280,
            columnGap: 16,
            animationDuration: 300,
            dragDelay: 100,
            touchDelay: 200,
            enableWIPLimits: true,
            enableCardCount: true,
            enableColumnCollapse: true
        };
        
        // Default columns
        this.defaultColumns = [
            {
                id: 'new',
                title: LEAD_STATUS.NEW,
                color: STATUS_COLORS[LEAD_STATUS.NEW],
                textColor: STATUS_TEXT_COLORS[LEAD_STATUS.NEW],
                icon: LEAD_STATUS.ICONS[LEAD_STATUS.NEW],
                order: 1,
                wipLimit: 50,
                isCollapsed: false,
                isDefault: true
            },
            {
                id: 'contacted',
                title: LEAD_STATUS.CONTACTED,
                color: STATUS_COLORS[LEAD_STATUS.CONTACTED],
                textColor: STATUS_TEXT_COLORS[LEAD_STATUS.CONTACTED],
                icon: LEAD_STATUS.ICONS[LEAD_STATUS.CONTACTED],
                order: 2,
                wipLimit: 50,
                isCollapsed: false,
                isDefault: true
            },
            {
                id: 'follow-up',
                title: LEAD_STATUS.FOLLOW_UP,
                color: STATUS_COLORS[LEAD_STATUS.FOLLOW_UP],
                textColor: STATUS_TEXT_COLORS[LEAD_STATUS.FOLLOW_UP],
                icon: LEAD_STATUS.ICONS[LEAD_STATUS.FOLLOW_UP],
                order: 3,
                wipLimit: 30,
                isCollapsed: false,
                isDefault: true
            },
            {
                id: 'interested',
                title: LEAD_STATUS.INTERESTED,
                color: STATUS_COLORS[LEAD_STATUS.INTERESTED],
                textColor: STATUS_TEXT_COLORS[LEAD_STATUS.INTERESTED],
                icon: LEAD_STATUS.ICONS[LEAD_STATUS.INTERESTED],
                order: 4,
                wipLimit: 20,
                isCollapsed: false,
                isDefault: true
            },
            {
                id: 'not-interested',
                title: LEAD_STATUS.NOT_INTERESTED,
                color: STATUS_COLORS[LEAD_STATUS.NOT_INTERESTED],
                textColor: STATUS_TEXT_COLORS[LEAD_STATUS.NOT_INTERESTED],
                icon: LEAD_STATUS.ICONS[LEAD_STATUS.NOT_INTERESTED],
                order: 5,
                wipLimit: 50,
                isCollapsed: false,
                isDefault: true
            },
            {
                id: 'closed',
                title: LEAD_STATUS.CLOSED,
                color: STATUS_COLORS[LEAD_STATUS.CLOSED],
                textColor: STATUS_TEXT_COLORS[LEAD_STATUS.CLOSED],
                icon: LEAD_STATUS.ICONS[LEAD_STATUS.CLOSED],
                order: 6,
                wipLimit: 100,
                isCollapsed: false,
                isDefault: true
            }
        ];
        
        // Undo/Redo stack
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoStack = 50;
        
        // Event listeners
        this.eventListeners = {
            onBoardReady: [],
            onColumnAdded: [],
            onColumnRemoved: [],
            onColumnUpdated: [],
            onCardMoved: [],
            onCardAdded: [],
            onCardRemoved: [],
            onDragStart: [],
            onDragEnd: [],
            onBoardChanged: [],
            onError: []
        };
        
        // Animation config
        this.animations = {
            cardAdd: 'scaleIn',
            cardRemove: 'scaleOut',
            cardMove: 'slideMove',
            columnAdd: 'fadeIn',
            columnRemove: 'fadeOut'
        };
        
        console.log('✅ Kanban Service initialized');
    }
    
    // ============================================
    // BOARD INITIALIZATION
    // ============================================
    
    /**
     * Initialize Kanban board
     * @param {HTMLElement} container - Board container element
     * @param {Object} options - Board options
     * @returns {Promise<Object>} Initialization result
     */
    async initializeBoard(container, options = {}) {
        try {
            // Validate container
            if (!container || !(container instanceof HTMLElement)) {
                throw new Error('Invalid board container');
            }
            
            // Store container reference
            this.board = container;
            this.board.classList.add('kanban-board');
            
            // Apply board styles
            this._applyBoardStyles();
            
            // Merge options
            this.boardConfig = {
                ...this.boardConfig,
                ...options
            };
            
            // Load columns from config or use defaults
            const columnsConfig = options.columns || this.defaultColumns;
            
            // Clear existing board
            this.board.innerHTML = '';
            this.columns = [];
            this.columnElements.clear();
            this.sortableInstances.clear();
            
            // Create columns
            for (const columnConfig of columnsConfig) {
                await this.createColumn(columnConfig);
            }
            
            // Setup drag & drop
            this._setupDragAndDrop();
            
            // Load cards
            await this.loadAllCards();
            
            // Setup real-time sync
            this._setupRealTimeSync();
            
            // Notify listeners
            this._notifyListeners('onBoardReady', {
                board: this.board,
                columns: this.columns
            });
            
            return {
                success: true,
                columns: this.columns,
                message: 'Board initialized successfully'
            };
        } catch (error) {
            console.error('❌ Board initialization failed:', error);
            this._notifyListeners('onError', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'initializeBoard'),
                message: error.message
            };
        }
    }
    
    /**
     * Apply board styles
     * @private
     */
    _applyBoardStyles() {
        if (!this.board) return;
        
        this.board.style.display = 'flex';
        this.board.style.gap = `${this.boardConfig.columnGap}px`;
        this.board.style.overflowX = 'auto';
        this.board.style.overflowY = 'hidden';
        this.board.style.padding = '16px';
        this.board.style.minHeight = '500px';
        this.board.style.alignItems = 'flex-start';
        this.board.style.scrollBehavior = 'smooth';
        this.board.style.webkitOverflowScrolling = 'touch';
        this.board.style.scrollSnapType = 'x proximity';
        
        // Add scrollbar styling
        this.board.style.scrollbarWidth = 'thin';
        this.board.style.scrollbarColor = '#2a5c3e #e0e0e0';
    }
    
    // ============================================
    // COLUMN MANAGEMENT
    // ============================================
    
    /**
     * Create a new column
     * @param {Object} columnConfig - Column configuration
     * @param {string} columnConfig.title - Column title
     * @param {string} columnConfig.color - Column color
     * @param {string} columnConfig.icon - Column icon
     * @param {number} columnConfig.wipLimit - WIP limit
     * @returns {Promise<Object>} Creation result
     */
    async createColumn(columnConfig) {
        try {
            // Generate column ID
            const columnId = columnConfig.id || this._generateColumnId(columnConfig.title);
            
            // Create column data
            const columnData = {
                id: columnId,
                title: columnConfig.title || 'New Column',
                color: columnConfig.color || '#e9ecef',
                textColor: columnConfig.textColor || '#1e3a2f',
                icon: columnConfig.icon || '📋',
                order: columnConfig.order || this.columns.length + 1,
                wipLimit: columnConfig.wipLimit || 50,
                isCollapsed: columnConfig.isCollapsed || false,
                isDefault: columnConfig.isDefault || false,
                cards: []
            };
            
            // Add to columns array
            this.columns.push(columnData);
            
            // Sort columns by order
            this.columns.sort((a, b) => a.order - b.order);
            
            // Create column element
            const columnElement = this._createColumnElement(columnData);
            
            // Insert at correct position
            const insertIndex = this.columns.indexOf(columnData);
            if (insertIndex < this.board.children.length) {
                this.board.insertBefore(columnElement, this.board.children[insertIndex]);
            } else {
                this.board.appendChild(columnElement);
            }
            
            // Store column element
            this.columnElements.set(columnId, columnElement);
            
            // Setup sortable for column
            this._setupSortableForColumn(columnElement, columnId);
            
            // Notify listeners
            this._notifyListeners('onColumnAdded', columnData);
            
            // Save column to Firestore
            await this._saveColumnToFirestore(columnData);
            
            return {
                success: true,
                column: columnData,
                element: columnElement
            };
        } catch (error) {
            console.error('❌ Column creation failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'createColumn'),
                message: error.message
            };
        }
    }
    
    /**
     * Remove column
     * @param {string} columnId - Column ID
     * @returns {Promise<Object>} Removal result
     */
    async removeColumn(columnId) {
        try {
            // Find column
            const columnIndex = this.columns.findIndex(col => col.id === columnId);
            
            if (columnIndex === -1) {
                throw new Error('Column not found');
            }
            
            const column = this.columns[columnIndex];
            
            // Check if column is default
            if (column.isDefault) {
                throw new Error('Cannot remove default column');
            }
            
            // Check if column has cards
            if (column.cards.length > 0) {
                throw new Error('Cannot remove column with cards. Move cards first.');
            }
            
            // Remove from array
            this.columns.splice(columnIndex, 1);
            
            // Remove element from DOM
            const columnElement = this.columnElements.get(columnId);
            if (columnElement) {
                this._animateElementOut(columnElement, () => {
                    columnElement.remove();
                });
                this.columnElements.delete(columnId);
            }
            
            // Remove sortable instance
            const sortable = this.sortableInstances.get(columnId);
            if (sortable) {
                sortable.destroy();
                this.sortableInstances.delete(columnId);
            }
            
            // Remove from Firestore
            await this._deleteColumnFromFirestore(columnId);
            
            // Notify listeners
            this._notifyListeners('onColumnRemoved', { columnId });
            
            return {
                success: true,
                message: 'Column removed successfully'
            };
        } catch (error) {
            console.error('❌ Column removal failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'removeColumn'),
                message: error.message
            };
        }
    }
    
    /**
     * Update column
     * @param {string} columnId - Column ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Update result
     */
    async updateColumn(columnId, updateData) {
        try {
            // Find column
            const column = this.columns.find(col => col.id === columnId);
            
            if (!column) {
                throw new Error('Column not found');
            }
            
            // Update column data
            Object.assign(column, updateData);
            
            // Update column element
            const columnElement = this.columnElements.get(columnId);
            if (columnElement) {
                this._updateColumnElement(columnElement, column);
            }
            
            // Save to Firestore
            await this._saveColumnToFirestore(column);
            
            // Notify listeners
            this._notifyListeners('onColumnUpdated', column);
            
            return {
                success: true,
                column: column,
                message: 'Column updated successfully'
            };
        } catch (error) {
            console.error('❌ Column update failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'updateColumn'),
                message: error.message
            };
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
        columnElement.dataset.status = column.title;
        
        // Apply column styles
        columnElement.style.width = `${this.boardConfig.columnWidth}px`;
        columnElement.style.minWidth = `${this.boardConfig.columnWidth}px`;
        columnElement.style.background = column.color;
        columnElement.style.borderRadius = '12px';
        columnElement.style.padding = '12px';
        columnElement.style.display = 'flex';
        columnElement.style.flexDirection = 'column';
        columnElement.style.maxHeight = 'calc(100vh - 200px)';
        columnElement.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        columnElement.style.scrollSnapAlign = 'start';
        columnElement.style.flexShrink = '0';
        
        // Column header
        const header = document.createElement('div');
        header.className = 'kanban-column-header';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.padding = '8px 10px';
        header.style.background = 'rgba(255,255,255,0.8)';
        header.style.borderRadius = '8px';
        header.style.marginBottom = '10px';
        header.style.cursor = 'pointer';
        
        // Column title
        const titleContainer = document.createElement('div');
        titleContainer.style.display = 'flex';
        titleContainer.style.alignItems = 'center';
        titleContainer.style.gap = '8px';
        
        const icon = document.createElement('span');
        icon.textContent = column.icon || '📋';
        icon.style.fontSize = '1.2rem';
        
        const title = document.createElement('strong');
        title.textContent = column.title;
        title.style.color = column.textColor;
        title.style.fontSize = '0.85rem';
        
        titleContainer.appendChild(icon);
        titleContainer.appendChild(title);
        
        // Column actions
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '5px';
        actions.style.alignItems = 'center';
        
        // Card count badge
        const countBadge = document.createElement('span');
        countBadge.className = 'kanban-count';
        countBadge.style.background = column.textColor || '#2a5c3e';
        countBadge.style.color = '#ffffff';
        countBadge.style.padding = '2px 8px';
        countBadge.style.borderRadius = '15px';
        countBadge.style.fontSize = '0.7rem';
        countBadge.style.fontWeight = '700';
        countBadge.textContent = '0';
        countBadge.dataset.columnId = column.id;
        
        // Collapse button
        const collapseBtn = document.createElement('button');
        collapseBtn.innerHTML = '−';
        collapseBtn.style.background = 'none';
        collapseBtn.style.border = 'none';
        collapseBtn.style.cursor = 'pointer';
        collapseBtn.style.fontSize = '1rem';
        collapseBtn.style.padding = '0 5px';
        collapseBtn.onclick = () => this.toggleColumnCollapse(column.id);
        
        actions.appendChild(countBadge);
        actions.appendChild(collapseBtn);
        
        header.appendChild(titleContainer);
        header.appendChild(actions);
        
        // Cards container
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'kanban-cards';
        cardsContainer.dataset.columnId = column.id;
        cardsContainer.style.display = 'flex';
        cardsContainer.style.flexDirection = 'column';
        cardsContainer.style.gap = '8px';
        cardsContainer.style.overflowY = 'auto';
        cardsContainer.style.flex = '1';
        cardsContainer.style.minHeight = '100px';
        cardsContainer.style.padding = '4px';
        cardsContainer.style.transition = 'all 0.3s ease';
        
        // WIP limit indicator
        if (this.boardConfig.enableWIPLimits && column.wipLimit) {
            const wipIndicator = document.createElement('div');
            wipIndicator.className = 'wip-indicator';
            wipIndicator.style.fontSize = '0.65rem';
            wipIndicator.style.color = '#6c757d';
            wipIndicator.style.textAlign = 'center';
            wipIndicator.style.padding = '4px';
            wipIndicator.dataset.columnId = column.id;
            
            cardsContainer.appendChild(wipIndicator);
        }
        
        columnElement.appendChild(header);
        columnElement.appendChild(cardsContainer);
        
        // Add drag-over effect
        columnElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            columnElement.style.transform = 'scale(1.02)';
            columnElement.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
        });
        
        columnElement.addEventListener('dragleave', () => {
            columnElement.style.transform = 'scale(1)';
            columnElement.style.boxShadow = 'none';
        });
        
        columnElement.addEventListener('drop', () => {
            columnElement.style.transform = 'scale(1)';
            columnElement.style.boxShadow = 'none';
        });
        
        return columnElement;
    }
    
    /**
     * Update column element
     * @param {HTMLElement} element - Column element
     * @param {Object} column - Column data
     * @private
     */
    _updateColumnElement(element, column) {
        // Update styles
        element.style.background = column.color;
        
        // Update title
        const titleElement = element.querySelector('strong');
        if (titleElement) {
            titleElement.textContent = column.title;
            titleElement.style.color = column.textColor;
        }
        
        // Update icon
        const iconElement = element.querySelector('.kanban-column-header span');
        if (iconElement) {
            iconElement.textContent = column.icon || '📋';
        }
        
        // Update count
        this._updateColumnCount(column.id);
        
        // Update WIP indicator
        if (this.boardConfig.enableWIPLimits && column.wipLimit) {
            this._updateWIPIndicator(column.id);
        }
    }
    
    // ============================================
    // CARD MANAGEMENT
    // ============================================
    
    /**
     * Add card to column
     * @param {string} columnId - Column ID
     * @param {Object} cardData - Card data
     * @returns {Object} Card object
     */
    addCard(columnId, cardData) {
        try {
            // Find column
            const column = this.columns.find(col => col.id === columnId);
            
            if (!column) {
                throw new Error('Column not found');
            }
            
            // Check WIP limit
            if (column.wipLimit && column.cards.length >= column.wipLimit) {
                throw new Error(`WIP limit reached for ${column.title} (${column.wipLimit} cards max)`);
            }
            
            // Create card object
            const card = {
                id: cardData.id || this._generateCardId(),
                columnId: columnId,
                data: cardData,
                element: null
            };
            
            // Add to column cards
            column.cards.push(card);
            
            // Store in cards map
            this.cards.set(card.id, card);
            
            // Create card element
            const cardElement = this._createCardElement(card);
            card.element = cardElement;
            
            // Add to cards container
            const cardsContainer = this.board.querySelector(`[data-column-id="${columnId}"] .kanban-cards`);
            if (cardsContainer) {
                cardsContainer.appendChild(cardElement);
            }
            
            // Update column count
            this._updateColumnCount(columnId);
            
            // Update WIP indicator
            this._updateWIPIndicator(columnId);
            
            // Animate card in
            this._animateCardIn(cardElement);
            
            // Notify listeners
            this._notifyListeners('onCardAdded', card);
            
            return card;
        } catch (error) {
            console.error('❌ Card addition failed:', error);
            this._notifyListeners('onError', error);
            return null;
        }
    }
    
    /**
     * Remove card from column
     * @param {string} cardId - Card ID
     * @returns {boolean} Removal success
     */
    removeCard(cardId) {
        try {
            const card = this.cards.get(cardId);
            
            if (!card) {
                throw new Error('Card not found');
            }
            
            // Find column
            const column = this.columns.find(col => col.id === card.columnId);
            
            if (column) {
                // Remove from column cards
                column.cards = column.cards.filter(c => c.id !== cardId);
            }
            
            // Remove from cards map
            this.cards.delete(cardId);
            
            // Remove element from DOM
            if (card.element) {
                this._animateCardOut(card.element, () => {
                    card.element.remove();
                });
            }
            
            // Update column count
            this._updateColumnCount(card.columnId);
            
            // Update WIP indicator
            this._updateWIPIndicator(card.columnId);
            
            // Notify listeners
            this._notifyListeners('onCardRemoved', { cardId });
            
            return true;
        } catch (error) {
            console.error('❌ Card removal failed:', error);
            return false;
        }
    }
    
    /**
     * Move card to column
     * @param {string} cardId - Card ID
     * @param {string} newColumnId - New column ID
     * @param {number} newIndex - New card index
     * @returns {Promise<Object>} Move result
     */
    async moveCard(cardId, newColumnId, newIndex = 0) {
        try {
            const card = this.cards.get(cardId);
            
            if (!card) {
                throw new Error('Card not found');
            }
            
            const oldColumnId = card.columnId;
            
            // Check if same column
            if (oldColumnId === newColumnId) {
                // Reorder within same column
                this._reorderCardInColumn(cardId, newIndex);
                return { success: true, reordered: true };
            }
            
            // Find columns
            const oldColumn = this.columns.find(col => col.id === oldColumnId);
            const newColumn = this.columns.find(col => col.id === newColumnId);
            
            if (!oldColumn || !newColumn) {
                throw new Error('Column not found');
            }
            
            // Check WIP limit
            if (newColumn.wipLimit && newColumn.cards.length >= newColumn.wipLimit) {
                throw new Error(`WIP limit reached for ${newColumn.title}`);
            }
            
            // Save undo state
            this._saveUndoState({
                type: 'move',
                cardId: cardId,
                fromColumnId: oldColumnId,
                toColumnId: newColumnId,
                fromIndex: oldColumn.cards.indexOf(card),
                toIndex: newIndex
            });
            
            // Remove from old column
            oldColumn.cards = oldColumn.cards.filter(c => c.id !== cardId);
            
            // Add to new column
            card.columnId = newColumnId;
            newColumn.cards.splice(newIndex, 0, card);
            
            // Move element in DOM
            const cardElement = card.element;
            const newCardsContainer = this.board.querySelector(`[data-column-id="${newColumnId}"] .kanban-cards`);
            
            if (cardElement && newCardsContainer) {
                // Remove from old container
                cardElement.remove();
                
                // Insert at correct position
                const cards = newCardsContainer.querySelectorAll('.kanban-card');
                if (cards[newIndex]) {
                    newCardsContainer.insertBefore(cardElement, cards[newIndex]);
                } else {
                    newCardsContainer.appendChild(cardElement);
                }
            }
            
            // Update counts
            this._updateColumnCount(oldColumnId);
            this._updateColumnCount(newColumnId);
            
            // Update WIP indicators
            this._updateWIPIndicator(oldColumnId);
            this._updateWIPIndicator(newColumnId);
            
            // Update lead status in Firestore
            const newStatus = newColumn.title;
            await LeadService.updateLeadStatus(cardId, newStatus, 'kanban_drag');
            
            // Notify listeners
            this._notifyListeners('onCardMoved', {
                cardId,
                fromColumnId: oldColumnId,
                toColumnId: newColumnId,
                fromStatus: oldColumn.title,
                toStatus: newColumn.title
            });
            
            this._notifyListeners('onBoardChanged', {
                type: 'card_moved',
                cardId,
                fromColumnId,
                toColumnId
            });
            
            return {
                success: true,
                message: `Card moved to ${newColumn.title}`
            };
        } catch (error) {
            console.error('❌ Card move failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'moveCard'),
                message: error.message
            };
        }
    }
    
    /**
     * Reorder card within column
     * @param {string} cardId - Card ID
     * @param {number} newIndex - New index
     * @private
     */
    _reorderCardInColumn(cardId, newIndex) {
        const card = this.cards.get(cardId);
        if (!card) return;
        
        const column = this.columns.find(col => col.id === card.columnId);
        if (!column) return;
        
        // Remove card from current position
        column.cards = column.cards.filter(c => c.id !== cardId);
        
        // Insert at new position
        column.cards.splice(newIndex, 0, card);
        
        // Reorder DOM elements
        const cardsContainer = this.board.querySelector(`[data-column-id="${card.columnId}"] .kanban-cards`);
        if (cardsContainer && card.element) {
            const cards = cardsContainer.querySelectorAll('.kanban-card');
            if (cards[newIndex]) {
                cardsContainer.insertBefore(card.element, cards[newIndex]);
            } else {
                cardsContainer.appendChild(card.element);
            }
        }
    }
    
    /**
     * Create card element
     * @param {Object} card - Card object
     * @returns {HTMLElement} Card element
     * @private
     */
    _createCardElement(card) {
        const cardElement = document.createElement('div');
        cardElement.className = 'kanban-card';
        cardElement.dataset.cardId = card.id;
        cardElement.draggable = true;
        
        // Apply card styles
        cardElement.style.background = '#ffffff';
        cardElement.style.borderRadius = '8px';
        cardElement.style.padding = '12px';
        cardElement.style.boxShadow = '0 2px 5px rgba(0,0,0,0.08)';
        cardElement.style.cursor = 'grab';
        cardElement.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        cardElement.style.position = 'relative';
        
        // Card content
        const lead = card.data;
        
        cardElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #2a5c3e, #3d7a54); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700;">
                        ${this._getInitials(lead.name)}
                    </div>
                    <div>
                        <div style="font-weight: 600; font-size: 0.85rem;">${lead.name}</div>
                        <div style="font-size: 0.7rem; color: #6c757d;">${this._getTimeAgo(lead.createdAt)}</div>
                    </div>
                </div>
                <button style="background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0 4px;" onclick="event.stopPropagation(); KanbanService.showCardMenu('${card.id}')">⋯</button>
            </div>
            <div style="font-size: 0.75rem; color: #495057; margin-bottom: 4px;">📞 ${lead.phone}</div>
            ${lead.city ? `<div style="font-size: 0.75rem; color: #6c757d; margin-bottom: 4px;">📍 ${lead.city}</div>` : ''}
            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">
                <span style="padding: 2px 8px; border-radius: 10px; font-size: 0.65rem; font-weight: 600; background: #e3f0e5; color: #2a5c3e;">🌿 ${lead.product || 'Other'}</span>
                ${lead.priority === 'Hot' ? '<span style="padding: 2px 8px; border-radius: 10px; font-size: 0.65rem; font-weight: 600; background: #fff3cd; color: #856404;">🔥 Hot</span>' : ''}
            </div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                <button style="flex: 1; padding: 6px; border: none; border-radius: 15px; font-size: 0.65rem; cursor: pointer; background: #e3f0e5; color: #1e7e34; font-weight: 600;" onclick="event.stopPropagation(); QuickActions.callLead('${lead.phone}')">📞</button>
                <button style="flex: 1; padding: 6px; border: none; border-radius: 15px; font-size: 0.65rem; cursor: pointer; background: #d4edda; color: #155724; font-weight: 600;" onclick="event.stopPropagation(); QuickActions.whatsappLead('${lead.phone}')">💬</button>
                <button style="flex: 1; padding: 6px; border: none; border-radius: 15px; font-size: 0.65rem; cursor: pointer; background: #fff3cd; color: #856404; font-weight: 600;" onclick="event.stopPropagation(); KanbanService.showCardMenu('${card.id}')">📝</button>
            </div>
        `;
        
        // Drag events
        cardElement.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.id);
            e.dataTransfer.effectAllowed = 'move';
            
            // Add dragging class
            cardElement.style.opacity = '0.5';
            cardElement.style.cursor = 'grabbing';
            
            // Notify listeners
            this._notifyListeners('onDragStart', { cardId: card.id });
        });
        
        cardElement.addEventListener('dragend', () => {
            cardElement.style.opacity = '1';
            cardElement.style.cursor = 'grab';
            
            // Notify listeners
            this._notifyListeners('onDragEnd', { cardId: card.id });
        });
        
        // Click to view details
        cardElement.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                this.showCardDetails(card.id);
            }
        });
        
        return cardElement;
    }
    
    // ============================================
    // DRAG & DROP
    // ============================================
    
    /**
     * Setup drag and drop
     * @private
     */
    _setupDragAndDrop() {
        if (!this.board) return;
        
        // Board-level drag events
        this.board.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        this.board.addEventListener('drop', (e) => {
            e.preventDefault();
            
            const cardId = e.dataTransfer.getData('text/plain');
            const targetColumn = e.target.closest('.kanban-column');
            
            if (cardId && targetColumn) {
                const columnId = targetColumn.dataset.columnId;
                this.moveCard(cardId, columnId);
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
        
        // Check if Sortable is available
        if (typeof Sortable !== 'undefined') {
            const sortable = new Sortable(cardsContainer, {
                group: 'kanban-cards',
                animation: this.boardConfig.animationDuration,
                delay: this.boardConfig.dragDelay,
                touchStartThreshold: this.boardConfig.touchDelay,
                ghostClass: 'kanban-ghost',
                dragClass: 'kanban-dragging',
                chosenClass: 'kanban-chosen',
                
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
                    
                    this._reorderCardInColumn(cardId, newIndex);
                    this._notifyListeners('onBoardChanged', {
                        type: 'card_reordered',
                        cardId,
                        columnId,
                        newIndex
                    });
                },
                
                onStart: (evt) => {
                    evt.item.style.transform = 'scale(1.05)';
                    evt.item.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
                    this._notifyListeners('onDragStart', { cardId: evt.item.dataset.cardId });
                },
                
                onEnd: (evt) => {
                    evt.item.style.transform = 'scale(1)';
                    evt.item.style.boxShadow = '0 2px 5px rgba(0,0,0,0.08)';
                    this._notifyListeners('onDragEnd', { cardId: evt.item.dataset.cardId });
                }
            });
            
            this.sortableInstances.set(columnId, sortable);
        }
    }
    
    // ============================================
    // REAL-TIME SYNC
    // ============================================
    
    /**
     * Setup real-time sync
     * @private
     */
    _setupRealTimeSync() {
        // Listen to lead changes
        const unsubscribe = LeadService.listenToLeads((changes) => {
            changes.forEach(change => {
                if (change.type === 'added') {
                    // Add new card
                    const columnId = this._getColumnIdByStatus(change.lead.status);
                    if (columnId) {
                        this.addCard(columnId, change.lead);
                    }
                } else if (change.type === 'modified') {
                    // Update existing card
                    this.updateCard(change.leadId, change.lead);
                } else if (change.type === 'removed') {
                    // Remove card
                    this.removeCard(change.leadId);
                }
            });
        });
    }
    
    /**
     * Update existing card
     * @param {string} cardId - Card ID
     * @param {Object} newData - New card data
     */
    updateCard(cardId, newData) {
        const card = this.cards.get(cardId);
        
        if (!card) return;
        
        // Update card data
        card.data = newData;
        
        // Check if status changed
        const newColumnId = this._getColumnIdByStatus(newData.status);
        
        if (newColumnId && newColumnId !== card.columnId) {
            // Move card to new column
            this.moveCard(cardId, newColumnId);
        } else {
            // Update card element
            if (card.element) {
                const newElement = this._createCardElement(card);
                card.element.replaceWith(newElement);
                card.element = newElement;
            }
        }
    }
    
    /**
     * Get column ID by status
     * @param {string} status - Lead status
     * @returns {string|null} Column ID
     * @private
     */
    _getColumnIdByStatus(status) {
        const column = this.columns.find(col => col.title === status);
        return column ? column.id : null;
    }
    
    // ============================================
    // LOAD CARDS
    // ============================================
    
    /**
     * Load all cards from Firebase
     * @returns {Promise<Object>} Load result
     */
    async loadAllCards() {
        try {
            // Get all leads
            const result = await LeadService.getLeads({
                pageSize: PAGINATION.MAX_LEADS_FETCH
            });
            
            if (result.success) {
                // Clear existing cards
                this.cards.clear();
                this.columns.forEach(col => col.cards = []);
                
                // Clear card containers
                this.columns.forEach(col => {
                    const container = this.board.querySelector(`[data-column-id="${col.id}"] .kanban-cards`);
                    if (container) {
                        container.innerHTML = '';
                    }
                });
                
                // Add cards to columns
                result.leads.forEach(lead => {
                    const columnId = this._getColumnIdByStatus(lead.status);
                    if (columnId) {
                        this.addCard(columnId, lead);
                    }
                });
                
                return {
                    success: true,
                    count: result.leads.length
                };
            }
        } catch (error) {
            console.error('❌ Card loading failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // ============================================
    // COLUMN COUNT & WIP
    // ============================================
    
    /**
     * Update column count
     * @param {string} columnId - Column ID
     * @private
     */
    _updateColumnCount(columnId) {
        const column = this.columns.find(col => col.id === columnId);
        if (!column) return;
        
        const countBadge = this.board.querySelector(`[data-column-id="${columnId}"] .kanban-count`);
        if (countBadge) {
            countBadge.textContent = column.cards.length;
        }
    }
    
    /**
     * Update WIP indicator
     * @param {string} columnId - Column ID
     * @private
     */
    _updateWIPIndicator(columnId) {
        const column = this.columns.find(col => col.id === columnId);
        if (!column || !column.wipLimit) return;
        
        const wipIndicator = this.board.querySelector(`[data-column-id="${columnId}"] .wip-indicator`);
        if (wipIndicator) {
            const remaining = column.wipLimit - column.cards.length;
            wipIndicator.textContent = `${column.cards.length}/${column.wipLimit} (${remaining} remaining)`;
            wipIndicator.style.color = remaining <= 5 ? '#dc3545' : remaining <= 10 ? '#ffc107' : '#6c757d';
        }
    }
    
    // ============================================
    // COLUMN COLLAPSE
    // ============================================
    
    /**
     * Toggle column collapse
     * @param {string} columnId - Column ID
     */
    toggleColumnCollapse(columnId) {
        const column = this.columns.find(col => col.id === columnId);
        if (!column) return;
        
        column.isCollapsed = !column.isCollapsed;
        
        const cardsContainer = this.board.querySelector(`[data-column-id="${columnId}"] .kanban-cards`);
        if (cardsContainer) {
            if (column.isCollapsed) {
                cardsContainer.style.display = 'none';
            } else {
                cardsContainer.style.display = 'flex';
            }
        }
        
        // Update column width
        const columnElement = this.columnElements.get(columnId);
        if (columnElement) {
            columnElement.style.width = column.isCollapsed ? '40px' : `${this.boardConfig.columnWidth}px`;
            columnElement.style.minWidth = column.isCollapsed ? '40px' : `${this.boardConfig.columnWidth}px`;
        }
    }
    
    // ============================================
    // UNDO/REDO
    // ============================================
    
    /**
     * Save undo state
     * @param {Object} state - Undo state
     * @private
     */
    _saveUndoState(state) {
        this.undoStack.push({
            ...state,
            timestamp: Date.now()
        });
        
        // Limit stack size
        if (this.undoStack.length > this.maxUndoStack) {
            this.undoStack.shift();
        }
        
        // Clear redo stack
        this.redoStack = [];
    }
    
    /**
     * Undo last action
     * @returns {Promise<Object>} Undo result
     */
    async undo() {
        try {
            if (this.undoStack.length === 0) {
                throw new Error('Nothing to undo');
            }
            
            const state = this.undoStack.pop();
            
            // Save to redo stack
            this.redoStack.push(state);
            
            // Perform undo
            if (state.type === 'move') {
                await this.moveCard(state.cardId, state.fromColumnId, state.fromIndex);
            }
            
            return {
                success: true,
                message: 'Undo successful'
            };
        } catch (error) {
            console.error('❌ Undo failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * Redo last undone action
     * @returns {Promise<Object>} Redo result
     */
    async redo() {
        try {
            if (this.redoStack.length === 0) {
                throw new Error('Nothing to redo');
            }
            
            const state = this.redoStack.pop();
            
            // Save to undo stack
            this.undoStack.push(state);
            
            // Perform redo
            if (state.type === 'move') {
                await this.moveCard(state.cardId, state.toColumnId, state.toIndex);
            }
            
            return {
                success: true,
                message: 'Redo successful'
            };
        } catch (error) {
            console.error('❌ Redo failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // ============================================
    // CARD DETAILS & MENU
    // ============================================
    
    /**
     * Show card details
     * @param {string} cardId - Card ID
     */
    showCardDetails(cardId) {
        const card = this.cards.get(cardId);
        if (!card) return;
        
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
                    <h2 style="margin: 0;">Lead Details</h2>
                    <button onclick="this.closest('div[style]').parentElement.remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>${card.data.name}</strong><br>
                    📞 ${card.data.phone}<br>
                    ${card.data.city ? '📍 ' + card.data.city + '<br>' : ''}
                    🌿 ${card.data.product || 'Other'}<br>
                    📢 ${card.data.source || 'Unknown'}<br>
                    📊 ${card.data.status || 'New'}<br>
                    ⏰ ${this._getTimeAgo(card.data.createdAt)}
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button onclick="QuickActions.callLead('${card.data.phone}')" style="flex: 1; padding: 10px; border: none; border-radius: 20px; background: #e3f0e5; color: #1e7e34; cursor: pointer; font-weight: 600;">📞 Call</button>
                    <button onclick="QuickActions.whatsappLead('${card.data.phone}')" style="flex: 1; padding: 10px; border: none; border-radius: 20px; background: #d4edda; color: #155724; cursor: pointer; font-weight: 600;">💬 WhatsApp</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    /**
     * Show card menu
     * @param {string} cardId - Card ID
     */
    showCardMenu(cardId) {
        const card = this.cards.get(cardId);
        if (!card) return;
        
        // Create menu
        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            padding: 8px;
            z-index: 2500;
            min-width: 180px;
            animation: scaleIn 0.2s ease;
        `;
        
        const menuItems = [
            { icon: '👁️', label: 'View Details', action: () => this.showCardDetails(cardId) },
            { icon: '📝', label: 'Add Note', action: () => NoteService.openNoteModal(cardId) },
            { icon: '⏰', label: 'Schedule Follow-up', action: () => FollowupService.openFollowupModal(cardId) },
            { icon: '📞', label: 'Call', action: () => QuickActions.callLead(card.data.phone) },
            { icon: '💬', label: 'WhatsApp', action: () => QuickActions.whatsappLead(card.data.phone) },
            { icon: '🗑️', label: 'Delete', action: () => this.removeCard(cardId), danger: true }
        ];
        
        menuItems.forEach(item => {
            const button = document.createElement('button');
            button.innerHTML = `${item.icon} ${item.label}`;
            button.style.cssText = `
                width: 100%;
                padding: 10px 12px;
                border: none;
                background: none;
                text-align: left;
                cursor: pointer;
                font-size: 0.85rem;
                border-radius: 8px;
                transition: background 0.2s;
                ${item.danger ? 'color: #dc3545;' : 'color: #1e3a2f;'}
            `;
            button.onmouseover = () => button.style.background = '#f8f9fa';
            button.onmouseout = () => button.style.background = 'none';
            button.onclick = () => {
                menu.remove();
                item.action();
            };
            menu.appendChild(button);
        });
        
        // Position menu near mouse
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        
        document.body.appendChild(menu);
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 0);
    }
    
    // ============================================
    // ANIMATIONS
    // ============================================
    
    /**
     * Animate card in
     * @param {HTMLElement} element - Card element
     * @private
     */
    _animateCardIn(element) {
        element.style.animation = 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }
    
    /**
     * Animate card out
     * @param {HTMLElement} element - Card element
     * @param {Function} callback - Callback after animation
     * @private
     */
    _animateCardOut(element, callback) {
        element.style.animation = 'scaleOut 0.3s ease';
        setTimeout(callback, 300);
    }
    
    /**
     * Animate element out
     * @param {HTMLElement} element - Element to animate
     * @param {Function} callback - Callback after animation
     * @private
     */
    _animateElementOut(element, callback) {
        element.style.animation = 'fadeOut 0.3s ease';
        setTimeout(callback, 300);
    }
    
    // ============================================
    // FIREBASE OPERATIONS
    // ============================================
    
    /**
     * Save column to Firestore
     * @param {Object} column - Column data
     * @private
     */
    async _saveColumnToFirestore(column) {
        try {
            const columnsCollection = FirebaseCore.getCollection('settings').doc('kanban_columns');
            await columnsCollection.set({
                columns: this.columns,
                updatedAt: FirebaseCore.getServerTimestamp()
            }, { merge: true });
        } catch (error) {
            console.warn('⚠️ Could not save column:', error);
        }
    }
    
    /**
     * Delete column from Firestore
     * @param {string} columnId - Column ID
     * @private
     */
    async _deleteColumnFromFirestore(columnId) {
        try {
            const columnsCollection = FirebaseCore.getCollection('settings').doc('kanban_columns');
            await columnsCollection.set({
                columns: this.columns,
                updatedAt: FirebaseCore.getServerTimestamp()
            }, { merge: true });
        } catch (error) {
            console.warn('⚠️ Could not delete column:', error);
        }
    }
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    /**
     * Generate column ID
     * @param {string} title - Column title
     * @returns {string} Column ID
     * @private
     */
    _generateColumnId(title) {
        return title.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36);
    }
    
    /**
     * Generate card ID
     * @returns {string} Card ID
     * @private
     */
    _generateCardId() {
        return 'CARD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    }
    
    /**
     * Get initials from name
     * @param {string} name - Full name
     * @returns {string} Initials
     * @private
     */
    _getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
    }
    
    /**
     * Get time ago
     * @param {Object} date - Date object
     * @returns {string} Time ago string
     * @private
     */
    _getTimeAgo(date) {
        if (!date) return '';
        
        const timestamp = date.toDate ? date.toDate() : new Date(date);
        const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
        return `${Math.floor(seconds / 2592000)}mo ago`;
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
    
    // ============================================
    // GETTERS
    // ============================================
    
    /**
     * Get all columns
     * @returns {Array} Columns array
     */
    getColumns() {
        return this.columns;
    }
    
    /**
     * Get column by ID
     * @param {string} columnId - Column ID
     * @returns {Object|null} Column object
     */
    getColumn(columnId) {
        return this.columns.find(col => col.id === columnId) || null;
    }
    
    /**
     * Get all cards
     * @returns {Map} Cards map
     */
    getCards() {
        return this.cards;
    }
    
    /**
     * Get card by ID
     * @param {string} cardId - Card ID
     * @returns {Object|null} Card object
     */
    getCard(cardId) {
        return this.cards.get(cardId) || null;
    }
    
    /**
     * Get column cards
     * @param {string} columnId - Column ID
     * @returns {Array} Cards array
     */
    getColumnCards(columnId) {
        const column = this.getColumn(columnId);
        return column ? column.cards : [];
    }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

const KanbanServiceInstance = new KanbanService();

// ============================================
// GLOBAL EXPORT
// ============================================

window.KanbanService = KanbanServiceInstance;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Initialize Kanban board (global helper)
 * @param {HTMLElement} container - Board container
 * @param {Object} options - Board options
 * @returns {Promise<Object>} Initialization result
 */
async function initKanbanBoard(container, options) {
    return await KanbanServiceInstance.initializeBoard(container, options);
}

/**
 * Add card to Kanban (global helper)
 * @param {string} columnId - Column ID
 * @param {Object} cardData - Card data
 * @returns {Object} Card object
 */
function addKanbanCard(columnId, cardData) {
    return KanbanServiceInstance.addCard(columnId, cardData);
}

/**
 * Move card in Kanban (global helper)
 * @param {string} cardId - Card ID
 * @param {string} newColumnId - New column ID
 * @returns {Promise<Object>} Move result
 */
async function moveKanbanCard(cardId, newColumnId) {
    return await KanbanServiceInstance.moveCard(cardId, newColumnId);
}

window.initKanbanBoard = initKanbanBoard;
window.addKanbanCard = addKanbanCard;
window.moveKanbanCard = moveKanbanCard;

// ============================================
// CSS ANIMATIONS (Inject)
// ============================================

const kanbanStyles = document.createElement('style');
kanbanStyles.textContent = `
    @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.8); }
        to { opacity: 1; transform: scale(1); }
    }
    
    @keyframes scaleOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.8); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    .kanban-ghost {
        opacity: 0.4;
        transform: scale(0.95);
    }
    
    .kanban-dragging {
        opacity: 0.8;
        transform: scale(1.05) rotate(2deg);
        box-shadow: 0 16px 40px rgba(0,0,0,0.2) !important;
        cursor: grabbing !important;
        z-index: 1000;
    }
    
    .kanban-chosen {
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }
    
    .kanban-card {
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
    }
    
    .kanban-card:active {
        cursor: grabbing;
    }
    
    .kanban-column {
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
    }
`;

document.head.appendChild(kanbanStyles);

console.log('✅ Kanban Service Loaded');

/**
 * ============================================================
 * AAHAR SHUDHI - LEAD CARD COMPONENT
 * ============================================================
 * @description Enterprise-grade lead card for Kanban board
 * @version 1.0.0
 * @priority HIGH - UI Component
 * 
 * Features:
 * - Dynamic card rendering
 * - Quick action buttons
 * - Status badges
 * - Timestamp display
 * - Priority indicators
 * - 3D tilt effect
 * - Responsive design
 * - Event handling
 * ============================================================
 */

class LeadCardComponent {
    constructor() {
        // Configuration
        this.config = {
            showAvatar: true,
            showTimestamp: true,
            showQuickActions: true,
            showProductTag: true,
            showPriorityTag: true,
            showSourceTag: false,
            showAgentInfo: true,
            enable3DTilt: true,
            tiltIntensity: 10,
            animationDuration: 300
        };
        
        // Event listeners
        this.eventListeners = {
            onCardClick: [],
            onCallClick: [],
            onWhatsAppClick: [],
            onNoteClick: [],
            onFollowupClick: [],
            onMenuClick: [],
            onCardRender: []
        };
        
        console.log('✅ Lead Card Component initialized');
    }
    
    // ============================================
    // CARD CREATION
    // ============================================
    
    /**
     * Create lead card element
     * @param {Object} lead - Lead data
     * @param {Object} options - Card options
     * @returns {HTMLElement} Card element
     */
    create(lead, options = {}) {
        const config = { ...this.config, ...options };
        
        // Create card container
        const card = document.createElement('div');
        card.className = 'lead-card';
        card.dataset.leadId = lead.id || lead.leadId;
        card.dataset.status = lead.status || 'New';
        card.style.cssText = `
            background: var(--white, #ffffff);
            border-radius: 12px;
            padding: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            overflow: hidden;
            user-select: none;
            will-change: transform;
        `;
        
        // Card header
        const header = this._createHeader(lead, config);
        card.appendChild(header);
        
        // Card contact info
        const contact = this._createContactInfo(lead);
        card.appendChild(contact);
        
        // Card tags
        if (config.showProductTag || config.showPriorityTag || config.showSourceTag) {
            const tags = this._createTags(lead, config);
            card.appendChild(tags);
        }
        
        // Card quick actions
        if (config.showQuickActions) {
            const actions = this._createQuickActions(lead);
            card.appendChild(actions);
        }
        
        // Card footer
        if (config.showAgentInfo) {
            const footer = this._createFooter(lead);
            card.appendChild(footer);
        }
        
        // Setup event handlers
        this._setupEventHandlers(card, lead, config);
        
        // Setup 3D tilt
        if (config.enable3DTilt && window.innerWidth > 768) {
            this._setup3DTilt(card, config);
        }
        
        // Notify listeners
        this._notifyListeners('onCardRender', { lead, element: card });
        
        return card;
    }
    
    /**
     * Create card header
     * @param {Object} lead - Lead data
     * @param {Object} config - Card config
     * @returns {HTMLElement} Header element
     * @private
     */
    _createHeader(lead, config) {
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
        `;
        
        // Left side - Avatar and Name
        const leftSide = document.createElement('div');
        leftSide.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            min-width: 0;
        `;
        
        // Avatar
        if (config.showAvatar) {
            const avatar = document.createElement('div');
            avatar.style.cssText = `
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: linear-gradient(135deg, #2a5c3e, #3d7a54);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 700;
                flex-shrink: 0;
            `;
            avatar.textContent = this._getInitials(lead.name);
            leftSide.appendChild(avatar);
        }
        
        // Name and time
        const nameContainer = document.createElement('div');
        nameContainer.style.cssText = `
            min-width: 0;
            flex: 1;
        `;
        
        const name = document.createElement('div');
        name.style.cssText = `
            font-weight: 600;
            font-size: 0.85rem;
            color: #1e3a2f;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        name.textContent = lead.name || 'Unknown';
        nameContainer.appendChild(name);
        
        if (config.showTimestamp) {
            const time = document.createElement('div');
            time.style.cssText = `
                font-size: 10px;
                color: #6c757d;
            `;
            time.textContent = this._getTimeAgo(lead.updatedAt || lead.createdAt);
            nameContainer.appendChild(time);
        }
        
        leftSide.appendChild(nameContainer);
        header.appendChild(leftSide);
        
        // Right side - Menu button
        const menuButton = document.createElement('button');
        menuButton.style.cssText = `
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1rem;
            padding: 2px 6px;
            border-radius: 4px;
            transition: background 0.2s ease;
            flex-shrink: 0;
            color: #6c757d;
        `;
        menuButton.textContent = '⋯';
        menuButton.onclick = (e) => {
            e.stopPropagation();
            this._notifyListeners('onMenuClick', { lead, event: e });
        };
        menuButton.onmouseover = () => menuButton.style.background = '#f0f0f0';
        menuButton.onmouseout = () => menuButton.style.background = 'none';
        header.appendChild(menuButton);
        
        return header;
    }
    
    /**
     * Create contact info section
     * @param {Object} lead - Lead data
     * @returns {HTMLElement} Contact info element
     * @private
     */
    _createContactInfo(lead) {
        const contact = document.createElement('div');
        contact.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 3px;
            margin-bottom: 8px;
        `;
        
        // Phone
        const phone = document.createElement('div');
        phone.style.cssText = `
            font-size: 0.75rem;
            color: #495057;
            font-weight: 500;
        `;
        phone.innerHTML = `📞 ${lead.phone || 'N/A'}`;
        contact.appendChild(phone);
        
        // City
        if (lead.city) {
            const city = document.createElement('div');
            city.style.cssText = `
                font-size: 0.7rem;
                color: #6c757d;
            `;
            city.innerHTML = `📍 ${lead.city}`;
            contact.appendChild(city);
        }
        
        return contact;
    }
    
    /**
     * Create tags section
     * @param {Object} lead - Lead data
     * @param {Object} config - Card config
     * @returns {HTMLElement} Tags element
     * @private
     */
    _createTags(lead, config) {
        const tags = document.createElement('div');
        tags.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-bottom: 8px;
        `;
        
        // Product tag
        if (config.showProductTag && lead.product) {
            const productTag = this._createTag(lead.product, '#e3f0e5', '#2a5c3e', '🌿');
            tags.appendChild(productTag);
        }
        
        // Priority tag
        if (config.showPriorityTag && lead.priority === 'Hot') {
            const priorityTag = this._createTag('Hot', '#fff3cd', '#856404', '🔥');
            tags.appendChild(priorityTag);
        }
        
        // Source tag
        if (config.showSourceTag && lead.source) {
            const sourceTag = this._createTag(lead.source, '#f8f9fa', '#6c757d', '📢');
            tags.appendChild(sourceTag);
        }
        
        return tags;
    }
    
    /**
     * Create tag element
     * @param {string} text - Tag text
     * @param {string} bgColor - Background color
     * @param {string} textColor - Text color
     * @param {string} icon - Tag icon
     * @returns {HTMLElement} Tag element
     * @private
     */
    _createTag(text, bgColor, textColor, icon = '') {
        const tag = document.createElement('span');
        tag.style.cssText = `
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.65rem;
            font-weight: 600;
            background: ${bgColor};
            color: ${textColor};
            white-space: nowrap;
        `;
        tag.textContent = icon ? `${icon} ${text}` : text;
        return tag;
    }
    
    /**
     * Create quick actions section
     * @param {Object} lead - Lead data
     * @returns {HTMLElement} Actions element
     * @private
     */
    _createQuickActions(lead) {
        const actions = document.createElement('div');
        actions.style.cssText = `
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #f0f0f0;
        `;
        
        // Call button
        const callBtn = this._createActionButton('📞', '#e3f0e5', '#1e7e34', 'Call');
        callBtn.onclick = (e) => {
            e.stopPropagation();
            this._notifyListeners('onCallClick', { lead, event: e });
        };
        actions.appendChild(callBtn);
        
        // WhatsApp button
        const whatsappBtn = this._createActionButton('💬', '#d4edda', '#155724', 'WhatsApp');
        whatsappBtn.onclick = (e) => {
            e.stopPropagation();
            this._notifyListeners('onWhatsAppClick', { lead, event: e });
        };
        actions.appendChild(whatsappBtn);
        
        // Note button
        const noteBtn = this._createActionButton('📝', '#fff3cd', '#856404', 'Note');
        noteBtn.onclick = (e) => {
            e.stopPropagation();
            this._notifyListeners('onNoteClick', { lead, event: e });
        };
        actions.appendChild(noteBtn);
        
        // Follow-up button
        const followupBtn = this._createActionButton('⏰', '#d1ecf1', '#0c5460', 'Follow-up');
        followupBtn.onclick = (e) => {
            e.stopPropagation();
            this._notifyListeners('onFollowupClick', { lead, event: e });
        };
        actions.appendChild(followupBtn);
        
        return actions;
    }
    
    /**
     * Create action button
     * @param {string} icon - Button icon
     * @param {string} bgColor - Background color
     * @param {string} textColor - Text color
     * @param {string} label - Button label
     * @returns {HTMLElement} Button element
     * @private
     */
    _createActionButton(icon, bgColor, textColor, label) {
        const button = document.createElement('button');
        button.style.cssText = `
            flex: 1;
            padding: 6px 4px;
            border: none;
            border-radius: 15px;
            font-size: 0.65rem;
            font-weight: 600;
            cursor: pointer;
            background: ${bgColor};
            color: ${textColor};
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
            font-family: inherit;
            min-width: 0;
        `;
        button.innerHTML = `${icon} <span style="display: none;">${label}</span>`;
        button.title = label;
        button.onmouseover = () => {
            button.style.transform = 'translateY(-1px)';
            button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        };
        button.onmouseout = () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = 'none';
        };
        button.onmousedown = () => {
            button.style.transform = 'scale(0.9)';
        };
        button.onmouseup = () => {
            button.style.transform = 'scale(1)';
        };
        return button;
    }
    
    /**
     * Create card footer
     * @param {Object} lead - Lead data
     * @returns {HTMLElement} Footer element
     * @private
     */
    _createFooter(lead) {
        const footer = document.createElement('div');
        footer.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #f0f0f0;
        `;
        
        // Agent name
        const agent = document.createElement('span');
        agent.style.cssText = `
            font-size: 0.65rem;
            color: #6c757d;
        `;
        agent.innerHTML = `👤 ${lead.assignedToName || 'Unassigned'}`;
        footer.appendChild(agent);
        
        // Status badge
        const statusColors = {
            'New': { bg: '#fff3cd', text: '#856404' },
            'Contacted': { bg: '#d1ecf1', text: '#0c5460' },
            'Follow-up': { bg: '#e7d9ff', text: '#4a3696' },
            'Interested': { bg: '#d4edda', text: '#155724' },
            'Not Interested': { bg: '#f8d7da', text: '#721c24' },
            'Closed': { bg: '#d6d8db', text: '#383d41' }
        };
        
        const colors = statusColors[lead.status] || { bg: '#f0f0f0', text: '#333' };
        
        const status = document.createElement('span');
        status.style.cssText = `
            font-size: 0.65rem;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 10px;
            background: ${colors.bg};
            color: ${colors.text};
        `;
        status.textContent = lead.status || 'New';
        footer.appendChild(status);
        
        return footer;
    }
    
    // ============================================
    // EVENT HANDLERS
    // ============================================
    
    /**
     * Setup event handlers
     * @param {HTMLElement} card - Card element
     * @param {Object} lead - Lead data
     * @param {Object} config - Card config
     * @private
     */
    _setupEventHandlers(card, lead, config) {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                this._notifyListeners('onCardClick', { lead, event: e });
            }
        });
    }
    
    /**
     * Setup 3D tilt effect
     * @param {HTMLElement} card - Card element
     * @param {Object} config - Card config
     * @private
     */
    _setup3DTilt(card, config) {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / config.tiltIntensity;
            const rotateY = (centerX - x) / config.tiltIntensity;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(5px)`;
            card.style.transition = 'transform 0.1s ease';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)';
            card.style.transition = 'transform 0.3s ease';
        });
    }
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    /**
     * Get initials from name
     * @param {string} name - Full name
     * @returns {string} Initials
     * @private
     */
    _getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }
    
    /**
     * Get time ago string
     * @param {Object} date - Date object
     * @returns {string} Time ago
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
        return `${Math.floor(seconds / 604800)}w ago`;
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

const LeadCardComponentInstance = new LeadCardComponent();

// ============================================
// GLOBAL EXPORT
// ============================================

window.LeadCard = LeadCardComponentInstance;

console.log('✅ Lead Card Component Loaded');

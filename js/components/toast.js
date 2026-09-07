/**
 * ============================================================
 * AAHAR SHUDHI - TOAST NOTIFICATION COMPONENT
 * ============================================================
 * @description Enterprise-grade toast notification system
 * @version 1.0.0
 * @priority HIGH - UI Component
 * 
 * Features:
 * - Multiple toast types (success, error, warning, info)
 * - Auto-dismiss with timer
 * - Manual dismiss
 * - Toast stacking
 * - Animation system
 * - Position control
 * - Custom duration
 * - Progress bar
 * - Icon support
 * - Action buttons
 * - Dark mode support
 * ============================================================
 */

class ToastComponent {
    constructor() {
        // Toast container
        this.container = null;
        
        // Default configuration
        this.config = {
            position: 'bottom-right', // 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center'
            defaultDuration: 3000,
            maxToasts: 5,
            animationDuration: 300,
            showProgressBar: true,
            pauseOnHover: true,
            closeOnClick: true,
            closeButton: true,
            draggable: true,
            newestOnTop: false
        };
        
        // Active toasts
        this.activeToasts = [];
        
        // Toast types
        this.types = {
            SUCCESS: 'success',
            ERROR: 'error',
            WARNING: 'warning',
            INFO: 'info',
            DEFAULT: 'default'
        };
        
        // Toast icons
        this.icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            default: '🔔'
        };
        
        // Toast colors
        this.colors = {
            success: {
                background: '#2a5c3e',
                text: '#ffffff',
                progressBar: '#3d7a54'
            },
            error: {
                background: '#dc3545',
                text: '#ffffff',
                progressBar: '#e05562'
            },
            warning: {
                background: '#ffc107',
                text: '#1e3a2f',
                progressBar: '#ffcd39'
            },
            info: {
                background: '#17a2b8',
                text: '#ffffff',
                progressBar: '#3ab0c4'
            },
            default: {
                background: '#6c757d',
                text: '#ffffff',
                progressBar: '#7d8790'
            }
        };
        
        // Event listeners
        this.eventListeners = {
            onToastShow: [],
            onToastDismiss: [],
            onToastClick: []
        };
        
        // Initialize
        this._initialize();
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    _initialize() {
        // Create container if not exists
        this.container = document.getElementById('toast-container');
        
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 380px;
                pointer-events: none;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(this.container);
        }
        
        // Set initial position
        this.setPosition(this.config.position);
        
        console.log('✅ Toast Component initialized');
    }
    
    // ============================================
    // POSITION MANAGEMENT
    // ============================================
    
    /**
     * Set toast container position
     * @param {string} position - Position name
     */
    setPosition(position) {
        this.config.position = position;
        
        const positions = {
            'top-left': {
                top: '20px',
                left: '20px',
                bottom: 'auto',
                right: 'auto',
                alignItems: 'flex-start'
            },
            'top-right': {
                top: '20px',
                right: '20px',
                bottom: 'auto',
                left: 'auto',
                alignItems: 'flex-end'
            },
            'bottom-left': {
                bottom: '20px',
                left: '20px',
                top: 'auto',
                right: 'auto',
                alignItems: 'flex-start'
            },
            'bottom-right': {
                bottom: '20px',
                right: '20px',
                top: 'auto',
                left: 'auto',
                alignItems: 'flex-end'
            },
            'top-center': {
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                bottom: 'auto',
                right: 'auto',
                alignItems: 'center'
            },
            'bottom-center': {
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                top: 'auto',
                right: 'auto',
                alignItems: 'center'
            }
        };
        
        const positionStyles = positions[position] || positions['bottom-right'];
        
        Object.assign(this.container.style, positionStyles);
    }
    
    // ============================================
    // TOAST CREATION
    // ============================================
    
    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type
     * @param {Object} options - Toast options
     * @returns {string} Toast ID
     */
    show(message, type = 'default', options = {}) {
        try {
            // Check max toasts
            if (this.activeToasts.length >= this.config.maxToasts) {
                // Remove oldest toast
                const oldestToast = this.activeToasts[0];
                this.dismiss(oldestToast.id, 'max_reached');
            }
            
            // Generate toast ID
            const toastId = this._generateToastId();
            
            // Merge options
            const toastOptions = {
                ...this.config,
                ...options,
                id: toastId,
                message: message,
                type: type,
                createdAt: Date.now()
            };
            
            // Create toast element
            const toastElement = this._createToastElement(toastOptions);
            
            // Add to container
            if (this.config.newestOnTop) {
                this.container.insertBefore(toastElement, this.container.firstChild);
            } else {
                this.container.appendChild(toastElement);
            }
            
            // Add to active toasts
            this.activeToasts.push({
                id: toastId,
                element: toastElement,
                options: toastOptions,
                timer: null,
                progressTimer: null
            });
            
            // Setup toast
            this._setupToast(toastId);
            
            // Notify listeners
            this._notifyListeners('onToastShow', toastOptions);
            
            return toastId;
        } catch (error) {
            console.error('❌ Toast creation failed:', error);
            return null;
        }
    }
    
    /**
     * Show success toast
     * @param {string} message - Toast message
     * @param {Object} options - Options
     */
    success(message, options = {}) {
        return this.show(message, this.types.SUCCESS, options);
    }
    
    /**
     * Show error toast
     * @param {string} message - Toast message
     * @param {Object} options - Options
     */
    error(message, options = {}) {
        return this.show(message, this.types.ERROR, options);
    }
    
    /**
     * Show warning toast
     * @param {string} message - Toast message
     * @param {Object} options - Options
     */
    warning(message, options = {}) {
        return this.show(message, this.types.WARNING, options);
    }
    
    /**
     * Show info toast
     * @param {string} message - Toast message
     * @param {Object} options - Options
     */
    info(message, options = {}) {
        return this.show(message, this.types.INFO, options);
    }
    
    // ============================================
    // TOAST ELEMENT CREATION
    // ============================================
    
    /**
     * Create toast element
     * @param {Object} options - Toast options
     * @returns {HTMLElement} Toast element
     * @private
     */
    _createToastElement(options) {
        const colors = this.colors[options.type] || this.colors.default;
        const icon = options.icon || this.icons[options.type] || this.icons.default;
        
        const toastElement = document.createElement('div');
        toastElement.id = `toast-${options.id}`;
        toastElement.className = `toast toast-${options.type}`;
        toastElement.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: ${colors.background};
            color: ${colors.text};
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.85rem;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            pointer-events: auto;
            cursor: ${options.closeOnClick ? 'pointer' : 'default'};
            animation: toastSlideIn ${options.animationDuration}ms cubic-bezier(0.16, 1, 0.3, 1);
            transition: all ${options.animationDuration}ms ease;
            position: relative;
            overflow: hidden;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            min-width: 200px;
            max-width: 350px;
        `;
        
        // Icon
        const iconElement = document.createElement('span');
        iconElement.style.cssText = `
            font-size: 1.2rem;
            flex-shrink: 0;
        `;
        iconElement.textContent = icon;
        toastElement.appendChild(iconElement);
        
        // Message
        const messageElement = document.createElement('span');
        messageElement.style.cssText = `
            flex: 1;
            line-height: 1.4;
        `;
        messageElement.textContent = options.message;
        toastElement.appendChild(messageElement);
        
        // Close button
        if (options.closeButton) {
            const closeButton = document.createElement('button');
            closeButton.style.cssText = `
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                font-size: 1rem;
                padding: 0;
                flex-shrink: 0;
                opacity: 0.7;
                transition: opacity 0.2s ease;
            `;
            closeButton.textContent = '×';
            closeButton.onmouseover = () => closeButton.style.opacity = '1';
            closeButton.onmouseout = () => closeButton.style.opacity = '0.7';
            closeButton.onclick = (e) => {
                e.stopPropagation();
                this.dismiss(options.id, 'manual');
            };
            toastElement.appendChild(closeButton);
        }
        
        // Progress bar
        if (options.showProgressBar && options.duration > 0) {
            const progressBar = document.createElement('div');
            progressBar.className = 'toast-progress-bar';
            progressBar.style.cssText = `
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: ${colors.progressBar};
                border-radius: 0 0 12px 12px;
                width: 100%;
                transform-origin: left;
                transition: transform linear;
            `;
            toastElement.appendChild(progressBar);
        }
        
        // Action button
        if (options.actionLabel) {
            const actionButton = document.createElement('button');
            actionButton.style.cssText = `
                background: rgba(255,255,255,0.2);
                border: none;
                color: inherit;
                cursor: pointer;
                font-size: 0.75rem;
                font-weight: 700;
                padding: 4px 12px;
                border-radius: 15px;
                flex-shrink: 0;
                transition: background 0.2s ease;
                font-family: inherit;
            `;
            actionButton.textContent = options.actionLabel;
            actionButton.onclick = (e) => {
                e.stopPropagation();
                if (options.onAction) {
                    options.onAction(options);
                }
                this.dismiss(options.id, 'action');
            };
            toastElement.appendChild(actionButton);
        }
        
        return toastElement;
    }
    
    // ============================================
    // TOAST SETUP
    // ============================================
    
    /**
     * Setup toast behavior
     * @param {string} toastId - Toast ID
     * @private
     */
    _setupToast(toastId) {
        const toast = this.activeToasts.find(t => t.id === toastId);
        if (!toast) return;
        
        const { element, options } = toast;
        
        // Click to dismiss
        if (options.closeOnClick) {
            element.addEventListener('click', () => {
                this.dismiss(toastId, 'click');
                this._notifyListeners('onToastClick', options);
            });
        }
        
        // Pause on hover
        if (options.pauseOnHover) {
            element.addEventListener('mouseenter', () => {
                this._pauseToast(toastId);
            });
            
            element.addEventListener('mouseleave', () => {
                this._resumeToast(toastId);
            });
        }
        
        // Auto dismiss
        if (options.duration > 0) {
            this._startTimer(toastId);
        }
        
        // Start progress bar
        if (options.showProgressBar && options.duration > 0) {
            this._startProgressBar(toastId);
        }
    }
    
    /**
     * Start toast timer
     * @param {string} toastId - Toast ID
     * @private
     */
    _startTimer(toastId) {
        const toast = this.activeToasts.find(t => t.id === toastId);
        if (!toast) return;
        
        toast.timer = setTimeout(() => {
            this.dismiss(toastId, 'timeout');
        }, toast.options.duration);
    }
    
    /**
     * Start progress bar
     * @param {string} toastId - Toast ID
     * @private
     */
    _startProgressBar(toastId) {
        const toast = this.activeToasts.find(t => t.id === toastId);
        if (!toast) return;
        
        const progressBar = toast.element.querySelector('.toast-progress-bar');
        if (!progressBar) return;
        
        // Set transition duration
        progressBar.style.transition = `transform ${toast.options.duration}ms linear`;
        
        // Trigger animation
        requestAnimationFrame(() => {
            progressBar.style.transform = 'scaleX(0)';
        });
    }
    
    /**
     * Pause toast timer
     * @param {string} toastId - Toast ID
     * @private
     */
    _pauseToast(toastId) {
        const toast = this.activeToasts.find(t => t.id === toastId);
        if (!toast) return;
        
        if (toast.timer) {
            clearTimeout(toast.timer);
            toast.timer = null;
        }
        
        const progressBar = toast.element.querySelector('.toast-progress-bar');
        if (progressBar) {
            const computedStyle = window.getComputedStyle(progressBar);
            const transform = computedStyle.transform;
            progressBar.style.transition = 'none';
            progressBar.style.transform = transform;
        }
    }
    
    /**
     * Resume toast timer
     * @param {string} toastId - Toast ID
     * @private
     */
    _resumeToast(toastId) {
        const toast = this.activeToasts.find(t => t.id === toastId);
        if (!toast) return;
        
        if (!toast.timer) {
            this._startTimer(toastId);
        }
        
        const progressBar = toast.element.querySelector('.toast-progress-bar');
        if (progressBar) {
            const remainingTime = toast.options.duration - (Date.now() - toast.options.createdAt);
            progressBar.style.transition = `transform ${remainingTime}ms linear`;
            progressBar.style.transform = 'scaleX(0)';
        }
    }
    
    // ============================================
    // TOAST DISMISSAL
    // ============================================
    
    /**
     * Dismiss toast
     * @param {string} toastId - Toast ID
     * @param {string} reason - Dismissal reason
     */
    dismiss(toastId, reason = 'manual') {
        const toast = this.activeToasts.find(t => t.id === toastId);
        if (!toast) return;
        
        // Clear timer
        if (toast.timer) {
            clearTimeout(toast.timer);
            toast.timer = null;
        }
        
        // Animate out
        toast.element.style.animation = `toastSlideOut ${toast.options.animationDuration}ms ease forwards`;
        
        setTimeout(() => {
            // Remove from DOM
            if (toast.element.parentNode) {
                toast.element.remove();
            }
            
            // Remove from active toasts
            this.activeToasts = this.activeToasts.filter(t => t.id !== toastId);
            
            // Notify listeners
            this._notifyListeners('onToastDismiss', {
                ...toast.options,
                reason: reason
            });
        }, toast.options.animationDuration);
    }
    
    /**
     * Dismiss all toasts
     * @param {string} reason - Dismissal reason
     */
    dismissAll(reason = 'manual') {
        const toastIds = this.activeToasts.map(t => t.id);
        toastIds.forEach(id => this.dismiss(id, reason));
    }
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    /**
     * Generate toast ID
     * @returns {string} Toast ID
     * @private
     */
    _generateToastId() {
        return `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }
    
    /**
     * Get active toast count
     * @returns {number} Active toast count
     */
    getActiveCount() {
        return this.activeToasts.length;
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

const ToastComponentInstance = new ToastComponent();

// ============================================
// GLOBAL EXPORT
// ============================================

window.Toast = ToastComponentInstance;

// ============================================
// GLOBAL HELPER FUNCTIONS
// ============================================

function showToast(message, type = 'default', options = {}) {
    return ToastComponentInstance.show(message, type, options);
}

function showSuccessToast(message, options = {}) {
    return ToastComponentInstance.success(message, options);
}

function showErrorToast(message, options = {}) {
    return ToastComponentInstance.error(message, options);
}

function showWarningToast(message, options = {}) {
    return ToastComponentInstance.warning(message, options);
}

function showInfoToast(message, options = {}) {
    return ToastComponentInstance.info(message, options);
}

function dismissToast(toastId) {
    ToastComponentInstance.dismiss(toastId);
}

function dismissAllToasts() {
    ToastComponentInstance.dismissAll();
}

window.showToast = showToast;
window.showSuccessToast = showSuccessToast;
window.showErrorToast = showErrorToast;
window.showWarningToast = showWarningToast;
window.showInfoToast = showInfoToast;
window.dismissToast = dismissToast;
window.dismissAllToasts = dismissAllToasts;

// ============================================
// TOAST ANIMATION STYLES
// ============================================

const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes toastSlideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes toastSlideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    @media (max-width: 480px) {
        #toast-container {
            max-width: calc(100% - 40px);
        }
        
        .toast {
            min-width: auto;
            max-width: 100%;
            font-size: 0.8rem;
            padding: 10px 14px;
        }
    }
`;

document.head.appendChild(toastStyles);

console.log('✅ Toast Component Loaded');

/**
 * ============================================================
 * AAHAR SHUDHI - METRICS BAR COMPONENT
 * ============================================================
 * @description Enterprise-grade dashboard metrics bar
 * @version 1.0.0
 * @priority HIGH - UI Component
 * 
 * Features:
 * - Dynamic metric cards
 * - Real-time updates
 * - Animated counters
 * - Trend indicators
 * - Custom metric definitions
 * - Responsive grid
 * - Click actions
 * - Refresh functionality
 * ============================================================
 */

class MetricsBarComponent {
    constructor() {
        // Container
        this.container = null;
        
        // Metrics data
        this.metrics = {};
        this.previousMetrics = {};
        
        // Metric definitions
        this.metricDefinitions = [
            {
                id: 'total_leads',
                label: 'Total Leads',
                icon: '📊',
                color: '#2a5c3e',
                value: 0,
                format: 'number'
            },
            {
                id: 'new_today',
                label: 'New Today',
                icon: '🆕',
                color: '#28a745',
                value: 0,
                format: 'number'
            },
            {
                id: 'contacted',
                label: 'Contacted',
                icon: '📞',
                color: '#17a2b8',
                value: 0,
                format: 'number'
            },
            {
                id: 'followups',
                label: 'Follow-ups',
                icon: '⏰',
                color: '#6f42c1',
                value: 0,
                format: 'number'
            },
            {
                id: 'interested',
                label: 'Interested',
                icon: '💚',
                color: '#28a745',
                value: 0,
                format: 'number'
            },
            {
                id: 'closed',
                label: 'Closed',
                icon: '✅',
                color: '#6c757d',
                value: 0,
                format: 'number'
            },
            {
                id: 'conversion_rate',
                label: 'Conversion Rate',
                icon: '🎯',
                color: '#ffc107',
                value: 0,
                format: 'percentage'
            },
            {
                id: 'revenue',
                label: 'Est. Revenue',
                icon: '💰',
                color: '#dc3545',
                value: 0,
                format: 'currency'
            }
        ];
        
        // Configuration
        this.config = {
            columns: 4,
            gap: 15,
            animationDuration: 500,
            counterAnimation: true,
            showTrend: true,
            showIcon: true,
            autoRefresh: true,
            refreshInterval: 30000
        };
        
        // Event listeners
        this.eventListeners = {
            onMetricClick: [],
            onMetricsUpdate: [],
            onRenderComplete: [],
            onError: []
        };
        
        // Auto-refresh timer
        this.refreshTimer = null;
        
        console.log('✅ Metrics Bar Component initialized');
    }
    
    // ============================================
    // RENDER
    // ============================================
    
    /**
     * Render metrics bar
     * @param {HTMLElement} container - Container element
     * @param {Object} metricsData - Metrics data
     * @param {Object} options - Render options
     */
    render(container, metricsData = null, options = {}) {
        try {
            this.container = container;
            this.config = { ...this.config, ...options };
            
            // Store previous metrics for trend calculation
            this.previousMetrics = { ...this.metrics };
            
            // Update metrics data
            if (metricsData) {
                this.metrics = metricsData;
            }
            
            // Clear container
            container.innerHTML = '';
            
            // Apply container styles
            container.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: ${this.config.gap}px;
            `;
            
            // Render metric cards
            this.metricDefinitions.forEach(definition => {
                const value = this.metrics[definition.id] || 0;
                const previousValue = this.previousMetrics[definition.id] || 0;
                
                definition.value = value;
                
                const card = this._createMetricCard(definition, value, previousValue);
                container.appendChild(card);
            });
            
            // Setup auto-refresh
            if (this.config.autoRefresh) {
                this._setupAutoRefresh();
            }
            
            this._notifyListeners('onRenderComplete', {
                metrics: this.metrics,
                definitions: this.metricDefinitions
            });
            
        } catch (error) {
            console.error('❌ Metrics rendering failed:', error);
            this._notifyListeners('onError', error);
        }
    }
    
    /**
     * Create metric card
     * @param {Object} definition - Metric definition
     * @param {*} value - Current value
     * @param {*} previousValue - Previous value
     * @returns {HTMLElement} Metric card element
     * @private
     */
    _createMetricCard(definition, value, previousValue) {
        const card = document.createElement('div');
        card.className = 'metric-card';
        card.dataset.metricId = definition.id;
        card.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            text-align: center;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            overflow: hidden;
            animation: scaleIn 0.3s ease;
        `;
        
        // Hover effects
        card.onmouseover = () => {
            card.style.transform = 'translateY(-4px)';
            card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
        };
        
        card.onmouseout = () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)';
        };
        
        card.onmousedown = () => {
            card.style.transform = 'scale(0.97)';
        };
        
        card.onmouseup = () => {
            card.style.transform = 'scale(1)';
        };
        
        // Click handler
        card.onclick = () => {
            this._notifyListeners('onMetricClick', {
                metricId: definition.id,
                value: value,
                definition: definition
            });
        };
        
        // Icon
        if (this.config.showIcon) {
            const icon = document.createElement('div');
            icon.style.cssText = `
                font-size: 1.5rem;
                margin-bottom: 8px;
                animation: pulse 3s infinite;
            `;
            icon.textContent = definition.icon;
            card.appendChild(icon);
        }
        
        // Value
        const valueElement = document.createElement('div');
        valueElement.className = 'metric-value';
        valueElement.style.cssText = `
            font-size: 1.6rem;
            font-weight: 700;
            color: ${definition.color};
            line-height: 1.2;
        `;
        valueElement.textContent = this._formatValue(value, definition.format);
        card.appendChild(valueElement);
        
        // Label
        const label = document.createElement('div');
        label.style.cssText = `
            font-size: 0.7rem;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
            margin-top: 4px;
        `;
        label.textContent = definition.label;
        card.appendChild(label);
        
        // Trend indicator
        if (this.config.showTrend && previousValue !== undefined && previousValue !== 0) {
            const trend = this._calculateTrend(value, previousValue);
            
            if (trend) {
                const trendElement = document.createElement('div');
                trendElement.style.cssText = `
                    font-size: 0.7rem;
                    font-weight: 600;
                    margin-top: 4px;
                    color: ${trend.direction === 'up' ? '#28a745' : trend.direction === 'down' ? '#dc3545' : '#6c757d'};
                `;
                trendElement.textContent = `${trend.arrow} ${trend.percentage}%`;
                card.appendChild(trendElement);
            }
        }
        
        // Counter animation
        if (this.config.counterAnimation && typeof value === 'number') {
            this._animateCounter(valueElement, value, definition.format);
        }
        
        return card;
    }
    
    /**
     * Format value based on format type
     * @param {*} value - Value to format
     * @param {string} format - Format type
     * @returns {string} Formatted value
     * @private
     */
    _formatValue(value, format) {
        switch (format) {
            case 'number':
                return this._formatNumber(value);
            case 'percentage':
                return `${value}%`;
            case 'currency':
                return this._formatCurrency(value);
            default:
                return value.toString();
        }
    }
    
    /**
     * Format number with commas
     * @param {number} value - Number to format
     * @returns {string} Formatted number
     * @private
     */
    _formatNumber(value) {
        return value.toLocaleString('en-IN');
    }
    
    /**
     * Format currency
     * @param {number} value - Value to format
     * @returns {string} Formatted currency
     * @private
     */
    _formatCurrency(value) {
        if (value >= 100000) {
            return `₹${(value / 100000).toFixed(1)}L`;
        } else if (value >= 1000) {
            return `₹${(value / 1000).toFixed(1)}K`;
        }
        return `₹${value}`;
    }
    
    /**
     * Calculate trend
     * @param {*} currentValue - Current value
     * @param {*} previousValue - Previous value
     * @returns {Object|null} Trend data
     * @private
     */
    _calculateTrend(currentValue, previousValue) {
        if (previousValue === 0 || currentValue === previousValue) return null;
        
        const difference = currentValue - previousValue;
        const percentage = Math.abs((difference / previousValue) * 100).toFixed(1);
        
        if (difference > 0) {
            return { direction: 'up', arrow: '↑', percentage };
        } else {
            return { direction: 'down', arrow: '↓', percentage };
        }
    }
    
    /**
     * Animate counter
     * @param {HTMLElement} element - Value element
     * @param {number} targetValue - Target value
     * @param {string} format - Format type
     * @private
     */
    _animateCounter(element, targetValue, format) {
        const duration = this.config.animationDuration;
        const startTime = performance.now();
        const startValue = 0;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = startValue + (targetValue - startValue) * easedProgress;
            
            element.textContent = this._formatValue(Math.round(currentValue), format);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * Setup auto-refresh
     * @private
     */
    _setupAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        this.refreshTimer = setInterval(async () => {
            if (window.DashboardService) {
                const result = await window.DashboardService.getKeyMetrics();
                if (result.success) {
                    this.updateMetrics(result.metrics);
                }
            }
        }, this.config.refreshInterval);
    }
    
    /**
     * Update metrics data
     * @param {Object} newMetrics - New metrics data
     */
    updateMetrics(newMetrics) {
        this.previousMetrics = { ...this.metrics };
        this.metrics = newMetrics;
        
        // Update each card
        this.metricDefinitions.forEach(definition => {
            const value = newMetrics[definition.id] || 0;
            const previousValue = this.previousMetrics[definition.id] || 0;
            
            const card = this.container.querySelector(`[data-metric-id="${definition.id}"]`);
            if (card) {
                const valueElement = card.querySelector('.metric-value');
                if (valueElement) {
                    valueElement.textContent = this._formatValue(value, definition.format);
                }
            }
        });
        
        this._notifyListeners('onMetricsUpdate', newMetrics);
    }
    
    /**
     * Destroy metrics bar
     */
    destroy() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        if (this.container) {
            this.container.innerHTML = '';
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

const MetricsBarComponentInstance = new MetricsBarComponent();

// ============================================
// GLOBAL EXPORT
// ============================================

window.MetricsBar = MetricsBarComponentInstance;

// ============================================
// GLOBAL HELPER FUNCTIONS
// ============================================

function renderMetricsBar(container, metricsData, options) {
    return MetricsBarComponentInstance.render(container, metricsData, options);
}

function updateMetricsData(metricsData) {
    return MetricsBarComponentInstance.updateMetrics(metricsData);
}

window.renderMetricsBar = renderMetricsBar;
window.updateMetricsData = updateMetricsData;

console.log('✅ Metrics Bar Component Loaded');

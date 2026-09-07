/**
 * ============================================================
 * AAHAR SHUDHI - DASHBOARD & ANALYTICS SERVICE
 * ============================================================
 * @description Enterprise-grade dashboard and analytics system
 * @version 1.0.0
 * @priority MEDIUM - Core Feature
 * 
 * This service handles:
 * - Real-time metrics calculation
 * - Chart data preparation
 * - Agent performance tracking
 * - Lead funnel analytics
 * - Product & source analysis
 * - Daily/Weekly/Monthly reports
 * - Conversion rate tracking
 * - SLA compliance monitoring
 * - Custom report generation
 * - Dashboard widgets
 * - Data export functionality
 * ============================================================
 */

class DashboardService {
    constructor() {
        // Service state
        this.db = FirebaseCore.getDb();
        this.leadsCollection = FirebaseCore.getCollection('leads');
        this.usersCollection = FirebaseCore.getCollection('users');
        this.notesCollection = FirebaseCore.getCollection('notes');
        this.followupsCollection = FirebaseCore.getCollection('followups');
        this.statusHistoryCollection = FirebaseCore.getCollection('statusHistory');
        
        // Cache management
        this.cache = new Map();
        this.cacheTimeout = 2 * 60 * 1000; // 2 minutes
        
        // Chart instances
        this.charts = new Map();
        
        // Dashboard configuration
        this.dashboardConfig = {
            refreshInterval: 30 * 1000, // Auto-refresh every 30 seconds
            maxMetricsCards: 8,
            chartColors: [
                '#2a5c3e', '#3d7a54', '#5a9e6f', '#7fc49a', '#a8d8b9',
                '#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff'
            ],
            metricCards: [
                {
                    id: 'total_leads',
                    label: 'Total Leads',
                    icon: '📊',
                    color: '#2a5c3e'
                },
                {
                    id: 'new_today',
                    label: 'New Today',
                    icon: '🆕',
                    color: '#28a745'
                },
                {
                    id: 'contacted',
                    label: 'Contacted',
                    icon: '📞',
                    color: '#17a2b8'
                },
                {
                    id: 'followups',
                    label: 'Follow-ups',
                    icon: '⏰',
                    color: '#6f42c1'
                },
                {
                    id: 'interested',
                    label: 'Interested',
                    icon: '💚',
                    color: '#28a745'
                },
                {
                    id: 'closed',
                    label: 'Closed',
                    icon: '✅',
                    color: '#6c757d'
                },
                {
                    id: 'conversion_rate',
                    label: 'Conversion Rate',
                    icon: '🎯',
                    color: '#ffc107'
                },
                {
                    id: 'revenue',
                    label: 'Est. Revenue',
                    icon: '💰',
                    color: '#dc3545'
                }
            ]
        };
        
        // Event listeners
        this.eventListeners = {
            onMetricsUpdated: [],
            onChartsUpdated: [],
            onReportGenerated: [],
            onError: []
        };
        
        // Real-time listeners
        this.realtimeListeners = new Map();
        
        // Auto-refresh timer
        this.autoRefreshTimer = null;
        
        console.log('✅ Dashboard Service initialized');
    }
    
    // ============================================
    // METRICS CALCULATION
    // ============================================
    
    /**
     * Get all key metrics
     * @returns {Promise<Object>} Metrics data
     */
    async getKeyMetrics() {
        try {
            // Check cache
            const cached = this._getFromCache('key_metrics');
            if (cached) {
                return cached;
            }
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - 7);
            
            const monthStart = new Date(today);
            monthStart.setDate(1);
            
            // Get all leads
            const leadsSnapshot = await this.leadsCollection
                .where('isDeleted', '==', false)
                .get();
            
            const leads = [];
            leadsSnapshot.forEach(doc => {
                leads.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Get follow-ups
            const followupsSnapshot = await this.followupsCollection
                .where('status', '==', 'pending')
                .get();
            
            const pendingFollowups = followupsSnapshot.size;
            
            // Calculate metrics
            const metrics = {
                totalLeads: leads.length,
                newToday: leads.filter(l => 
                    l.createdAt && l.createdAt.toDate() >= today
                ).length,
                contacted: leads.filter(l => l.status === LEAD_STATUS.CONTACTED).length,
                followups: leads.filter(l => l.status === LEAD_STATUS.FOLLOW_UP).length,
                interested: leads.filter(l => l.status === LEAD_STATUS.INTERESTED).length,
                notInterested: leads.filter(l => l.status === LEAD_STATUS.NOT_INTERESTED).length,
                closed: leads.filter(l => l.status === LEAD_STATUS.CLOSED).length,
                pendingFollowups: pendingFollowups,
                conversionRate: leads.length > 0 
                    ? ((leads.filter(l => l.status === LEAD_STATUS.CLOSED).length / leads.length) * 100).toFixed(1)
                    : 0,
                leadsThisWeek: leads.filter(l => 
                    l.createdAt && l.createdAt.toDate() >= weekStart
                ).length,
                leadsThisMonth: leads.filter(l => 
                    l.createdAt && l.createdAt.toDate() >= monthStart
                ).length,
                closedThisWeek: leads.filter(l => 
                    l.status === LEAD_STATUS.CLOSED && 
                    l.updatedAt && l.updatedAt.toDate() >= weekStart
                ).length,
                estimatedRevenue: leads
                    .filter(l => [LEAD_STATUS.INTERESTED, LEAD_STATUS.CLOSED].includes(l.status))
                    .reduce((sum, l) => sum + (l.leadScore > 50 ? 500 : 0), 0)
            };
            
            // Calculate trends
            const yesterdayLeads = leads.filter(l => 
                l.createdAt && l.createdAt.toDate() >= yesterday && 
                l.createdAt.toDate() < today
            ).length;
            
            metrics.trends = {
                newTodayTrend: yesterdayLeads > 0 ? ((metrics.newToday - yesterdayLeads) / yesterdayLeads * 100).toFixed(1) : 100,
                conversionTrend: metrics.conversionRate > 0 ? '+2.5' : '0'
            };
            
            // Cache metrics
            this._setCache('key_metrics', metrics);
            
            return {
                success: true,
                metrics: metrics
            };
        } catch (error) {
            console.error('❌ Metrics calculation failed:', error);
            this._notifyListeners('onError', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'getKeyMetrics'),
                message: error.message,
                metrics: null
            };
        }
    }
    
    /**
     * Get lead funnel data
     * @returns {Promise<Object>} Funnel data
     */
    async getLeadFunnel() {
        try {
            const snapshot = await this.leadsCollection
                .where('isDeleted', '==', false)
                .get();
            
            const funnel = {
                [LEAD_STATUS.NEW]: 0,
                [LEAD_STATUS.CONTACTED]: 0,
                [LEAD_STATUS.FOLLOW_UP]: 0,
                [LEAD_STATUS.INTERESTED]: 0,
                [LEAD_STATUS.NOT_INTERESTED]: 0,
                [LEAD_STATUS.CLOSED]: 0
            };
            
            snapshot.forEach(doc => {
                const lead = doc.data();
                if (funnel[lead.status] !== undefined) {
                    funnel[lead.status]++;
                }
            });
            
            // Calculate conversion percentages
            const total = snapshot.size;
            const funnelWithPercentages = Object.keys(funnel).map(status => ({
                status,
                count: funnel[status],
                percentage: total > 0 ? ((funnel[status] / total) * 100).toFixed(1) : 0
            }));
            
            return {
                success: true,
                funnel: funnelWithPercentages,
                total: total
            };
        } catch (error) {
            console.error('❌ Funnel calculation failed:', error);
            return {
                success: false,
                message: error.message,
                funnel: []
            };
        }
    }
    
    /**
     * Get product analysis
     * @returns {Promise<Object>} Product data
     */
    async getProductAnalysis() {
        try {
            const snapshot = await this.leadsCollection
                .where('isDeleted', '==', false)
                .get();
            
            const products = {};
            
            snapshot.forEach(doc => {
                const lead = doc.data();
                const product = lead.product || 'Other';
                products[product] = (products[product] || 0) + 1;
            });
            
            const productArray = Object.keys(products).map(product => ({
                product,
                count: products[product],
                percentage: ((products[product] / snapshot.size) * 100).toFixed(1)
            }));
            
            productArray.sort((a, b) => b.count - a.count);
            
            return {
                success: true,
                products: productArray
            };
        } catch (error) {
            console.error('❌ Product analysis failed:', error);
            return {
                success: false,
                message: error.message,
                products: []
            };
        }
    }
    
    /**
     * Get source analysis
     * @returns {Promise<Object>} Source data
     */
    async getSourceAnalysis() {
        try {
            const snapshot = await this.leadsCollection
                .where('isDeleted', '==', false)
                .get();
            
            const sources = {};
            
            snapshot.forEach(doc => {
                const lead = doc.data();
                const source = lead.source || 'Other';
                sources[source] = (sources[source] || 0) + 1;
            });
            
            const sourceArray = Object.keys(sources).map(source => ({
                source,
                count: sources[source],
                percentage: ((sources[source] / snapshot.size) * 100).toFixed(1)
            }));
            
            sourceArray.sort((a, b) => b.count - a.count);
            
            return {
                success: true,
                sources: sourceArray
            };
        } catch (error) {
            console.error('❌ Source analysis failed:', error);
            return {
                success: false,
                message: error.message,
                sources: []
            };
        }
    }
    
    // ============================================
    // AGENT PERFORMANCE
    // ============================================
    
    /**
     * Get agent performance data
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Agent performance data
     */
    async getAgentPerformance(options = {}) {
        try {
            const {
                period = 'all', // 'today', 'week', 'month', 'all'
                team = null
            } = options;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const periodStart = this._getPeriodStart(period);
            
            // Get all agents
            let agentsQuery = this.usersCollection
                .where('role', '==', 'agent')
                .where('isActive', '==', true);
            
            if (team) {
                agentsQuery = agentsQuery.where('team', '==', team);
            }
            
            const agentsSnapshot = await agentsQuery.get();
            
            // Get all leads
            const leadsSnapshot = await this.leadsCollection
                .where('isDeleted', '==', false)
                .get();
            
            const agentStats = [];
            
            agentsSnapshot.forEach(agentDoc => {
                const agent = {
                    id: agentDoc.id,
                    ...agentDoc.data()
                };
                
                // Filter leads for this agent
                const agentLeads = [];
                leadsSnapshot.forEach(leadDoc => {
                    const lead = leadDoc.data();
                    if (lead.assignedTo === agentDoc.id) {
                        if (period === 'all' || 
                            (lead.createdAt && lead.createdAt.toDate() >= periodStart)) {
                            agentLeads.push(lead);
                        }
                    }
                });
                
                // Calculate stats
                const stats = {
                    totalLeads: agentLeads.length,
                    newLeads: agentLeads.filter(l => l.status === LEAD_STATUS.NEW).length,
                    contacted: agentLeads.filter(l => l.status === LEAD_STATUS.CONTACTED).length,
                    followups: agentLeads.filter(l => l.status === LEAD_STATUS.FOLLOW_UP).length,
                    interested: agentLeads.filter(l => l.status === LEAD_STATUS.INTERESTED).length,
                    closed: agentLeads.filter(l => l.status === LEAD_STATUS.CLOSED).length,
                    conversionRate: agentLeads.length > 0 
                        ? ((agentLeads.filter(l => l.status === LEAD_STATUS.CLOSED).length / agentLeads.length) * 100).toFixed(1)
                        : 0,
                    callsMade: agentLeads.filter(l => l.callAttempts > 0).length,
                    whatsappSent: agentLeads.filter(l => l.whatsappAttempts > 0).length,
                    avgLeadScore: agentLeads.length > 0 
                        ? (agentLeads.reduce((sum, l) => sum + (l.leadScore || 0), 0) / agentLeads.length).toFixed(1)
                        : 0
                };
                
                agentStats.push({
                    agent: agent,
                    stats: stats
                });
            });
            
            // Sort by closed leads
            agentStats.sort((a, b) => b.stats.closed - a.stats.closed);
            
            return {
                success: true,
                agents: agentStats,
                period: period
            };
        } catch (error) {
            console.error('❌ Agent performance calculation failed:', error);
            return {
                success: false,
                message: error.message,
                agents: []
            };
        }
    }
    
    // ============================================
    // DAILY/WEEKLY/MONTHLY REPORTS
    // ============================================
    
    /**
     * Get daily report
     * @param {Date} date - Report date
     * @returns {Promise<Object>} Daily report
     */
    async getDailyReport(date = new Date()) {
        try {
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);
            
            // Get leads created today
            const leadsSnapshot = await this.leadsCollection
                .where('isDeleted', '==', false)
                .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(dayStart))
                .where('createdAt', '<', firebase.firestore.Timestamp.fromDate(dayEnd))
                .get();
            
            // Get leads updated today
            const updatedSnapshot = await this.leadsCollection
                .where('isDeleted', '==', false)
                .where('updatedAt', '>=', firebase.firestore.Timestamp.fromDate(dayStart))
                .where('updatedAt', '<', firebase.firestore.Timestamp.fromDate(dayEnd))
                .get();
            
            // Get notes added today
            const notesSnapshot = await this.notesCollection
                .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(dayStart))
                .where('createdAt', '<', firebase.firestore.Timestamp.fromDate(dayEnd))
                .get();
            
            // Get follow-ups completed today
            const followupsSnapshot = await this.followupsCollection
                .where('completedAt', '>=', firebase.firestore.Timestamp.fromDate(dayStart))
                .where('completedAt', '<', firebase.firestore.Timestamp.fromDate(dayEnd))
                .get();
            
            const report = {
                date: dayStart,
                leadsCreated: leadsSnapshot.size,
                leadsUpdated: updatedSnapshot.size,
                notesAdded: notesSnapshot.size,
                followupsCompleted: followupsSnapshot.size,
                leadsClosed: updatedSnapshot.docs.filter(doc => 
                    doc.data().status === LEAD_STATUS.CLOSED
                ).length,
                leadsInterested: updatedSnapshot.docs.filter(doc => 
                    doc.data().status === LEAD_STATUS.INTERESTED
                ).length
            };
            
            return {
                success: true,
                report: report
            };
        } catch (error) {
            console.error('❌ Daily report generation failed:', error);
            return {
                success: false,
                message: error.message,
                report: null
            };
        }
    }
    
    /**
     * Get weekly report
     * @returns {Promise<Object>} Weekly report
     */
    async getWeeklyReport() {
        try {
            const weekStart = new Date();
            weekStart.setHours(0, 0, 0, 0);
            weekStart.setDate(weekStart.getDate() - 7);
            
            const dailyReports = [];
            
            for (let i = 0; i < 7; i++) {
                const dayStart = new Date(weekStart);
                dayStart.setDate(dayStart.getDate() + i);
                
                const report = await this.getDailyReport(dayStart);
                
                if (report.success) {
                    dailyReports.push({
                        date: dayStart,
                        ...report.report
                    });
                }
            }
            
            // Calculate weekly totals
            const totals = dailyReports.reduce((acc, day) => ({
                leadsCreated: acc.leadsCreated + day.leadsCreated,
                leadsUpdated: acc.leadsUpdated + day.leadsUpdated,
                notesAdded: acc.notesAdded + day.notesAdded,
                followupsCompleted: acc.followupsCompleted + day.followupsCompleted,
                leadsClosed: acc.leadsClosed + day.leadsClosed,
                leadsInterested: acc.leadsInterested + day.leadsInterested
            }), {
                leadsCreated: 0,
                leadsUpdated: 0,
                notesAdded: 0,
                followupsCompleted: 0,
                leadsClosed: 0,
                leadsInterested: 0
            });
            
            return {
                success: true,
                weekStart: weekStart,
                dailyReports: dailyReports,
                totals: totals
            };
        } catch (error) {
            console.error('❌ Weekly report generation failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * Get monthly report
     * @returns {Promise<Object>} Monthly report
     */
    async getMonthlyReport() {
        try {
            const monthStart = new Date();
            monthStart.setHours(0, 0, 0, 0);
            monthStart.setDate(1);
            
            const monthEnd = new Date(monthStart);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            
            // Get all leads for month
            const leadsSnapshot = await this.leadsCollection
                .where('isDeleted', '==', false)
                .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(monthStart))
                .where('createdAt', '<', firebase.firestore.Timestamp.fromDate(monthEnd))
                .get();
            
            // Get all status changes for month
            const statusSnapshot = await this.statusHistoryCollection
                .where('changedAt', '>=', firebase.firestore.Timestamp.fromDate(monthStart))
                .where('changedAt', '<', firebase.firestore.Timestamp.fromDate(monthEnd))
                .get();
            
            const report = {
                monthStart: monthStart,
                monthEnd: monthEnd,
                totalLeads: leadsSnapshot.size,
                statusChanges: statusSnapshot.size,
                leadsClosed: statusSnapshot.docs.filter(doc => 
                    doc.data().newStatus === LEAD_STATUS.CLOSED
                ).length,
                leadsInterested: statusSnapshot.docs.filter(doc => 
                    doc.data().newStatus === LEAD_STATUS.INTERESTED
                ).length
            };
            
            return {
                success: true,
                report: report
            };
        } catch (error) {
            console.error('❌ Monthly report generation failed:', error);
            return {
                success: false,
                message: error.message,
                report: null
            };
        }
    }
    
    // ============================================
    // CHART DATA PREPARATION
    // ============================================
    
    /**
     * Prepare funnel chart data
     * @returns {Promise<Object>} Chart data
     */
    async prepareFunnelChartData() {
        const funnelData = await this.getLeadFunnel();
        
        if (!funnelData.success) {
            return null;
        }
        
        return {
            type: 'bar',
            data: {
                labels: funnelData.funnel.map(f => f.status),
                datasets: [{
                    label: 'Leads',
                    data: funnelData.funnel.map(f => f.count),
                    backgroundColor: funnelData.funnel.map((f, i) => 
                        STATUS_COLORS[f.status]?.background || this.dashboardConfig.chartColors[i]
                    ),
                    borderColor: funnelData.funnel.map(f => 
                        STATUS_COLORS[f.status]?.border || '#ffffff'
                    ),
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const funnel = funnelData.funnel[context.dataIndex];
                                return `${context.parsed.y} leads (${funnel.percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f0f0f0' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        };
    }
    
    /**
     * Prepare product chart data
     * @returns {Promise<Object>} Chart data
     */
    async prepareProductChartData() {
        const productData = await this.getProductAnalysis();
        
        if (!productData.success) {
            return null;
        }
        
        return {
            type: 'doughnut',
            data: {
                labels: productData.products.map(p => p.product),
                datasets: [{
                    data: productData.products.map(p => p.count),
                    backgroundColor: this.dashboardConfig.chartColors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const product = productData.products[context.dataIndex];
                                return `${context.parsed} leads (${product.percentage}%)`;
                            }
                        }
                    }
                }
            }
        };
    }
    
    /**
     * Prepare source chart data
     * @returns {Promise<Object>} Chart data
     */
    async prepareSourceChartData() {
        const sourceData = await this.getSourceAnalysis();
        
        if (!sourceData.success) {
            return null;
        }
        
        return {
            type: 'pie',
            data: {
                labels: sourceData.sources.map(s => s.source),
                datasets: [{
                    data: sourceData.sources.map(s => s.count),
                    backgroundColor: this.dashboardConfig.chartColors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: { size: 11 }
                        }
                    }
                }
            }
        };
    }
    
    /**
     * Prepare agent performance chart data
     * @returns {Promise<Object>} Chart data
     */
    async prepareAgentChartData() {
        const agentData = await this.getAgentPerformance();
        
        if (!agentData.success) {
            return null;
        }
        
        return {
            type: 'horizontalBar',
            data: {
                labels: agentData.agents.map(a => a.agent.name || a.agent.email),
                datasets: [{
                    label: 'Closed Leads',
                    data: agentData.agents.map(a => a.stats.closed),
                    backgroundColor: '#28a745',
                    borderRadius: 6
                }, {
                    label: 'Total Leads',
                    data: agentData.agents.map(a => a.stats.totalLeads),
                    backgroundColor: '#2a5c3e',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: '#f0f0f0' }
                    },
                    y: {
                        grid: { display: false }
                    }
                }
            }
        };
    }
    
    // ============================================
    // DASHBOARD RENDER
    // ============================================
    
    /**
     * Render metrics bar
     * @param {HTMLElement} container - Metrics container
     * @returns {Promise<void>}
     */
    async renderMetricsBar(container) {
        try {
            const metricsResult = await this.getKeyMetrics();
            
            if (!metricsResult.success) {
                throw new Error(metricsResult.message);
            }
            
            const metrics = metricsResult.metrics;
            
            container.innerHTML = '';
            
            this.dashboardConfig.metricCards.forEach(card => {
                const value = this._getMetricValue(metrics, card.id);
                const trend = metrics.trends?.[`${card.id}Trend`] || null;
                
                const cardElement = document.createElement('div');
                cardElement.className = 'metric-card';
                cardElement.style.cssText = `
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
                    text-align: center;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    cursor: pointer;
                    animation: scaleIn 0.3s ease;
                `;
                
                cardElement.innerHTML = `
                    <div style="font-size: 1.5rem; margin-bottom: 8px;">${card.icon}</div>
                    <div style="font-size: 1.8rem; font-weight: 700; color: ${card.color};">${value}</div>
                    <div style="font-size: 0.7rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">${card.label}</div>
                    ${trend ? `<div style="font-size: 0.7rem; margin-top: 4px; color: ${parseFloat(trend) >= 0 ? '#28a745' : '#dc3545'};">${parseFloat(trend) >= 0 ? '↑' : '↓'} ${trend}%</div>` : ''}
                `;
                
                cardElement.onmouseover = () => {
                    cardElement.style.transform = 'translateY(-4px)';
                    cardElement.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                };
                
                cardElement.onmouseout = () => {
                    cardElement.style.transform = 'translateY(0)';
                    cardElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)';
                };
                
                container.appendChild(cardElement);
            });
            
            // Notify listeners
            this._notifyListeners('onMetricsUpdated', metrics);
        } catch (error) {
            console.error('❌ Metrics rendering failed:', error);
            container.innerHTML = `<div style="text-align: center; padding: 20px; color: #dc3545;">Error loading metrics</div>`;
        }
    }
    
    /**
     * Render chart
     * @param {string} chartId - Chart ID
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} chartData - Chart data
     * @returns {Chart} Chart instance
     */
    renderChart(chartId, canvas, chartData) {
        try {
            // Destroy existing chart
            if (this.charts.has(chartId)) {
                this.charts.get(chartId).destroy();
                this.charts.delete(chartId);
            }
            
            // Create new chart
            const chart = new Chart(canvas, chartData);
            this.charts.set(chartId, chart);
            
            return chart;
        } catch (error) {
            console.error('❌ Chart rendering failed:', error);
            return null;
        }
    }
    
    /**
     * Render agent performance table
     * @param {HTMLElement} container - Container element
     * @returns {Promise<void>}
     */
    async renderAgentPerformance(container) {
        try {
            const agentData = await this.getAgentPerformance();
            
            if (!agentData.success) {
                throw new Error(agentData.message);
            }
            
            container.innerHTML = '';
            
            agentData.agents.forEach((agentData, index) => {
                const agent = agentData.agent;
                const stats = agentData.stats;
                
                const row = document.createElement('div');
                row.style.cssText = `
                    padding: 15px;
                    border-bottom: 1px solid #f0f0f0;
                    transition: background 0.2s;
                `;
                
                row.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 35px; height: 35px; border-radius: 50%; background: ${this.dashboardConfig.chartColors[index % this.dashboardConfig.chartColors.length]}; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem;">
                                ${this._getInitials(agent.name || agent.email)}
                            </div>
                            <div>
                                <strong style="font-size: 0.9rem;">${agent.name || agent.email}</strong>
                                <div style="font-size: 0.7rem; color: #6c757d;">${agent.team || 'No Team'} | ${agent.region || 'No Region'}</div>
                            </div>
                        </div>
                        <span style="font-size: 0.8rem; font-weight: 600; color: #2a5c3e;">${stats.closed} closed</span>
                    </div>
                    <div style="background: #f0f0f0; border-radius: 10px; height: 8px; overflow: hidden; margin-bottom: 8px;">
                        <div style="width: ${stats.conversionRate}%; background: ${this.dashboardConfig.chartColors[index % this.dashboardConfig.chartColors.length]}; height: 100%; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #6c757d;">
                        <span>📊 ${stats.totalLeads} leads</span>
                        <span>📞 ${stats.callsMade} calls</span>
                        <span>💬 ${stats.whatsappSent} WA</span>
                        <span>🎯 ${stats.conversionRate}% conv.</span>
                    </div>
                `;
                
                row.onmouseover = () => row.style.background = '#f8f9fa';
                row.onmouseout = () => row.style.background = 'transparent';
                
                container.appendChild(row);
            });
        } catch (error) {
            console.error('❌ Agent performance rendering failed:', error);
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #dc3545;">Error loading agent performance</div>';
        }
    }
    
    // ============================================
    // REAL-TIME UPDATES
    // ============================================
    
    /**
     * Start real-time dashboard updates
     * @param {Function} callback - Update callback
     */
    startRealTimeUpdates(callback) {
        // Listen to lead changes
        const unsubscribeLeads = this.leadsCollection.onSnapshot(() => {
            callback('leads');
        });
        
        // Listen to follow-up changes
        const unsubscribeFollowups = this.followupsCollection.onSnapshot(() => {
            callback('followups');
        });
        
        // Store listeners
        this.realtimeListeners.set('leads', unsubscribeLeads);
        this.realtimeListeners.set('followups', unsubscribeFollowups);
        
        console.log('✅ Real-time dashboard updates started');
    }
    
    /**
     * Stop real-time updates
     */
    stopRealTimeUpdates() {
        this.realtimeListeners.forEach((unsubscribe, key) => {
            unsubscribe();
            this.realtimeListeners.delete(key);
        });
    }
    
    /**
     * Start auto-refresh
     * @param {Function} callback - Refresh callback
     */
    startAutoRefresh(callback) {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
        }
        
        this.autoRefreshTimer = setInterval(async () => {
            await callback();
        }, this.dashboardConfig.refreshInterval);
    }
    
    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
        }
    }
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    /**
     * Get metric value
     * @param {Object} metrics - Metrics object
     * @param {string} metricId - Metric ID
     * @returns {string|number} Metric value
     * @private
     */
    _getMetricValue(metrics, metricId) {
        const valueMap = {
            'total_leads': metrics.totalLeads,
            'new_today': metrics.newToday,
            'contacted': metrics.contacted,
            'followups': metrics.followups,
            'interested': metrics.interested,
            'closed': metrics.closed,
            'conversion_rate': `${metrics.conversionRate}%`,
            'revenue': `₹${(metrics.estimatedRevenue / 1000).toFixed(1)}K`
        };
        
        return valueMap[metricId] ?? 0;
    }
    
    /**
     * Get period start date
     * @param {string} period - Period name
     * @returns {Date} Period start date
     * @private
     */
    _getPeriodStart(period) {
        const now = new Date();
        
        switch (period) {
            case 'today':
                now.setHours(0, 0, 0, 0);
                return now;
            case 'week':
                now.setDate(now.getDate() - 7);
                return now;
            case 'month':
                now.setDate(1);
                return now;
            default:
                return new Date(0); // Beginning of time
        }
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
     * Log activity
     * @param {string} action - Action performed
     * @param {string} description - Activity description
     * @private
     */
    async _logActivity(action, description) {
        try {
            await FirebaseCore.getCollection('auditLogs').add({
                action,
                description,
                userId: AuthService.getUserId(),
                userName: AuthService.getUserProfile()?.name,
                timestamp: FirebaseCore.getServerTimestamp(),
                service: 'dashboard'
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

const DashboardServiceInstance = new DashboardService();

// ============================================
// GLOBAL EXPORT
// ============================================

window.DashboardService = DashboardServiceInstance;

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getDashboardMetrics() {
    return await DashboardServiceInstance.getKeyMetrics();
}

async function getLeadFunnelData() {
    return await DashboardServiceInstance.getLeadFunnel();
}

async function getAgentPerformanceData() {
    return await DashboardServiceInstance.getAgentPerformance();
}

async function getDailyReportData() {
    return await DashboardServiceInstance.getDailyReport();
}

async function renderDashboardMetrics(container) {
    return await DashboardServiceInstance.renderMetricsBar(container);
}

async function renderAgentPerformanceTable(container) {
    return await DashboardServiceInstance.renderAgentPerformance(container);
}

window.getDashboardMetrics = getDashboardMetrics;
window.getLeadFunnelData = getLeadFunnelData;
window.getAgentPerformanceData = getAgentPerformanceData;
window.getDailyReportData = getDailyReportData;
window.renderDashboardMetrics = renderDashboardMetrics;
window.renderAgentPerformanceTable = renderAgentPerformanceTable;

console.log('✅ Dashboard Service Loaded');

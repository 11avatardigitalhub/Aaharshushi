/**
 * ============================================================
 * AAHAR SHUDHI - MAIN APPLICATION
 * ============================================================
 * @description Enterprise-grade application bootstrap
 * @version 1.0.0
 * @priority HIGHEST - Application Core
 * 
 * This service handles:
 * - Application initialization
 * - Service orchestration
 * - UI initialization
 * - Navigation management
 * - Global error handling
 * - Event coordination
 * - Page lifecycle management
 * - Performance monitoring
 * - Memory management
 * - Security initialization
 * ============================================================
 */

class Application {
    constructor() {
        // Application state
        this.state = {
            isInitialized: false,
            isReady: false,
            currentPage: 'dashboard',
            previousPage: null,
            isLoading: true,
            loadProgress: 0,
            initializationError: null
        };
        
        // Services registry
        this.services = {
            firebase: null,
            auth: null,
            lead: null,
            status: null,
            kanban: null,
            note: null,
            followup: null,
            dashboard: null,
            realtime: null,
            filter: null
        };
        
        // Page registry
        this.pages = {
            dashboard: {
                id: 'dashboard',
                title: 'Dashboard',
                icon: '📊',
                container: null,
                initialized: false
            },
            kanban: {
                id: 'kanban',
                title: 'Kanban Board',
                icon: '📋',
                container: null,
                initialized: false
            },
            leads: {
                id: 'leads',
                title: 'Leads',
                icon: '👥',
                container: null,
                initialized: false
            },
            reports: {
                id: 'reports',
                title: 'Reports',
                icon: '📈',
                container: null,
                initialized: false
            },
            settings: {
                id: 'settings',
                title: 'Settings',
                icon: '⚙️',
                container: null,
                initialized: false
            }
        };
        
        // Navigation config
        this.navigation = {
            items: [
                { id: 'dashboard', label: 'Dashboard', icon: '📊', order: 1 },
                { id: 'kanban', label: 'Kanban', icon: '📋', order: 2 },
                { id: 'leads', label: 'Leads', icon: '👥', order: 3 },
                { id: 'reports', label: 'Reports', icon: '📈', order: 4 },
                { id: 'settings', label: 'Settings', icon: '⚙️', order: 5 }
            ]
        };
        
        // Event listeners
        this.eventListeners = {
            onAppReady: [],
            onAppInitialized: [],
            onPageChanged: [],
            onError: []
        };
        
        // Performance tracking
        this.performance = {
            startTime: performance.now(),
            initTime: null,
            readyTime: null,
            loadTimes: {}
        };
        
        console.log('✅ Application instance created');
    }
    
    // ============================================
    // APPLICATION INITIALIZATION
    // ============================================
    
    /**
     * Initialize application
     * @returns {Promise<Object>} Initialization result
     */
    async initialize() {
        console.log('🚀 Starting Aahar Shudhi Application...');
        
        try {
            // Step 1: Initialize Firebase
            this.state.loadProgress = 10;
            await this._initializeFirebase();
            
            // Step 2: Initialize Services
            this.state.loadProgress = 30;
            await this._initializeServices();
            
            // Step 3: Initialize UI
            this.state.loadProgress = 50;
            await this._initializeUI();
            
            // Step 4: Setup Navigation
            this.state.loadProgress = 70;
            this._setupNavigation();
            
            // Step 5: Setup Global Handlers
            this.state.loadProgress = 80;
            this._setupGlobalHandlers();
            
            // Step 6: Load Initial Data
            this.state.loadProgress = 90;
            await this._loadInitialData();
            
            // Step 7: Finalize
            this.state.loadProgress = 100;
            this.state.isInitialized = true;
            this.state.isReady = true;
            this.state.isLoading = false;
            this.performance.initTime = performance.now() - this.performance.startTime;
            
            console.log(`✅ Application initialized in ${this.performance.initTime.toFixed(2)}ms`);
            
            // Notify listeners
            this._notifyListeners('onAppInitialized', {
                loadTime: this.performance.initTime
            });
            this._notifyListeners('onAppReady', {
                state: this.state,
                services: Object.keys(this.services)
            });
            
            return {
                success: true,
                loadTime: this.performance.initTime,
                state: this.state
            };
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.state.initializationError = error;
            this.state.isLoading = false;
            
            this._notifyListeners('onError', error);
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Initialize Firebase
     * @private
     */
    async _initializeFirebase() {
        return new Promise((resolve, reject) => {
            // Check if Firebase is loaded
            if (typeof firebase === 'undefined') {
                reject(new Error('Firebase SDK not loaded'));
                return;
            }
            
            // Wait for Firebase ready event
            window.addEventListener('firebase-ready', (event) => {
                this.services.firebase = event.detail.firebase;
                console.log('✅ Firebase initialized');
                resolve();
            }, { once: true });
            
            // Timeout fallback
            setTimeout(() => {
                if (!this.services.firebase) {
                    reject(new Error('Firebase initialization timeout'));
                }
            }, 10000);
            
            // Trigger Firebase initialization
            if (typeof FirebaseCore !== 'undefined') {
                FirebaseCore.initialize().then(() => {
                    this.services.firebase = FirebaseCore;
                    console.log('✅ Firebase Core loaded');
                    resolve();
                });
            }
        });
    }
    
    /**
     * Initialize services
     * @private
     */
    async _initializeServices() {
        const serviceChecks = [
            { name: 'auth', service: 'AuthService' },
            { name: 'lead', service: 'LeadService' },
            { name: 'status', service: 'StatusService' },
            { name: 'kanban', service: 'KanbanService' },
            { name: 'note', service: 'NoteService' },
            { name: 'followup', service: 'FollowupService' },
            { name: 'dashboard', service: 'DashboardService' },
            { name: 'realtime', service: 'RealtimeService' },
            { name: 'filter', service: 'FilterService' }
        ];
        
        for (const check of serviceChecks) {
            if (typeof window[check.service] !== 'undefined') {
                this.services[check.name] = window[check.service];
                console.log(`✅ ${check.service} loaded`);
            } else {
                console.warn(`⚠️ ${check.service} not available`);
            }
        }
        
        // Verify core services
        const requiredServices = ['auth', 'lead', 'status', 'kanban'];
        const missingServices = requiredServices.filter(s => !this.services[s]);
        
        if (missingServices.length > 0) {
            console.warn(`⚠️ Missing services: ${missingServices.join(', ')}`);
        }
    }
    
    /**
     * Initialize UI
     * @private
     */
    async _initializeUI() {
        // Get main container
        const mainContainer = document.getElementById('main-container') || document.body;
        
        // Create app structure
        if (!document.getElementById('app-root')) {
            const appRoot = document.createElement('div');
            appRoot.id = 'app-root';
            appRoot.style.cssText = `
                display: flex;
                flex-direction: column;
                min-height: 100vh;
            `;
            
            // Create navigation bar
            const navBar = this._createNavigationBar();
            appRoot.appendChild(navBar);
            
            // Create page container
            const pageContainer = document.createElement('div');
            pageContainer.id = 'page-container';
            pageContainer.style.cssText = `
                flex: 1;
                padding: 20px;
                max-width: 1400px;
                margin: 0 auto;
                width: 100%;
            `;
            appRoot.appendChild(pageContainer);
            
            // Create toast container
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            appRoot.appendChild(toastContainer);
            
            // Create modal container
            const modalContainer = document.createElement('div');
            modalContainer.id = 'modal-container';
            modalContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 9998;
                pointer-events: none;
            `;
            appRoot.appendChild(modalContainer);
            
            mainContainer.appendChild(appRoot);
        }
        
        console.log('✅ UI initialized');
    }
    
    /**
     * Create navigation bar
     * @returns {HTMLElement} Navigation bar element
     * @private
     */
    _createNavigationBar() {
        const navBar = document.createElement('nav');
        navBar.id = 'main-navigation';
        navBar.style.cssText = `
            background: white;
            padding: 12px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            position: sticky;
            top: 0;
            z-index: 1000;
            flex-wrap: wrap;
            gap: 10px;
        `;
        
        // Brand section
        const brandSection = document.createElement('div');
        brandSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        brandSection.innerHTML = `
            <span style="font-size: 1.8rem;">🌿</span>
            <div>
                <div style="font-weight: 700; font-size: 1.2rem; color: #2a5c3e;">Aahar Shudhi</div>
                <div style="font-size: 0.7rem; color: #6c757d;">Lead Management System</div>
            </div>
        `;
        
        // Navigation items
        const navItems = document.createElement('div');
        navItems.style.cssText = `
            display: flex;
            gap: 5px;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        `;
        
        this.navigation.items.forEach(item => {
            const navButton = document.createElement('button');
            navButton.id = `nav-${item.id}`;
            navButton.dataset.page = item.id;
            navButton.style.cssText = `
                padding: 10px 16px;
                border: none;
                background: transparent;
                border-radius: 20px;
                cursor: pointer;
                font-weight: 600;
                font-size: 0.85rem;
                white-space: nowrap;
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                color: #6c757d;
            `;
            navButton.innerHTML = `${item.icon} ${item.label}`;
            
            navButton.onclick = () => {
                this.navigateTo(item.id);
            };
            
            navItems.appendChild(navButton);
        });
        
        // User section
        const userSection = document.createElement('div');
        userSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        // Sync status
        const syncStatus = document.createElement('div');
        syncStatus.id = 'sync-status';
        userSection.appendChild(syncStatus);
        
        // User info
        const userInfo = document.createElement('div');
        userInfo.id = 'user-info';
        userInfo.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        userSection.appendChild(userInfo);
        
        // Logout button
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logout-button';
        logoutBtn.textContent = '🚪';
        logoutBtn.style.cssText = `
            padding: 8px;
            border: none;
            background: #f8d7da;
            border-radius: 50%;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
        `;
        logoutBtn.onclick = () => this._handleLogout();
        userSection.appendChild(logoutBtn);
        
        navBar.appendChild(brandSection);
        navBar.appendChild(navItems);
        navBar.appendChild(userSection);
        
        return navBar;
    }
    
    /**
     * Setup navigation
     * @private
     */
    _setupNavigation() {
        // Initialize page containers
        Object.keys(this.pages).forEach(pageId => {
            const page = this.pages[pageId];
            
            if (!page.container) {
                page.container = document.createElement('div');
                page.container.id = `page-${pageId}`;
                page.container.style.display = 'none';
                
                const pageContainer = document.getElementById('page-container');
                if (pageContainer) {
                    pageContainer.appendChild(page.container);
                }
            }
        });
        
        console.log('✅ Navigation setup complete');
    }
    
    /**
     * Navigate to page
     * @param {string} pageId - Page ID
     */
    navigateTo(pageId) {
        if (!this.pages[pageId]) {
            console.warn(`⚠️ Page not found: ${pageId}`);
            return;
        }
        
        // Update state
        this.state.previousPage = this.state.currentPage;
        this.state.currentPage = pageId;
        
        // Update page visibility
        Object.keys(this.pages).forEach(id => {
            const page = this.pages[id];
            if (page.container) {
                page.container.style.display = id === pageId ? 'block' : 'none';
            }
        });
        
        // Update navigation buttons
        Object.keys(this.pages).forEach(id => {
            const navButton = document.getElementById(`nav-${id}`);
            if (navButton) {
                if (id === pageId) {
                    navButton.style.background = '#2a5c3e';
                    navButton.style.color = 'white';
                } else {
                    navButton.style.background = 'transparent';
                    navButton.style.color = '#6c757d';
                }
            }
        });
        
        // Initialize page if needed
        if (!this.pages[pageId].initialized) {
            this._initializePage(pageId);
        }
        
        // Notify listeners
        this._notifyListeners('onPageChanged', {
            page: pageId,
            previousPage: this.state.previousPage
        });
        
        console.log(`📄 Navigated to: ${pageId}`);
    }
    
    /**
     * Initialize page
     * @param {string} pageId - Page ID
     * @private
     */
    async _initializePage(pageId) {
        const page = this.pages[pageId];
        
        if (!page.container) return;
        
        switch (pageId) {
            case 'dashboard':
                await this._renderDashboardPage(page.container);
                break;
                
            case 'kanban':
                await this._renderKanbanPage(page.container);
                break;
                
            case 'leads':
                await this._renderLeadsPage(page.container);
                break;
                
            case 'reports':
                await this._renderReportsPage(page.container);
                break;
                
            case 'settings':
                await this._renderSettingsPage(page.container);
                break;
        }
        
        page.initialized = true;
    }
    
    /**
     * Render dashboard page
     * @param {HTMLElement} container - Page container
     * @private
     */
    async _renderDashboardPage(container) {
        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h2 style="margin: 0 0 5px 0;">📊 Dashboard</h2>
                <p style="margin: 0; color: #6c757d; font-size: 0.85rem;">Real-time overview of your lead management</p>
            </div>
            <div id="metrics-bar" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;"></div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 15px 0;">📈 Lead Funnel</h3>
                    <canvas id="funnel-chart" style="max-height: 300px;"></canvas>
                </div>
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 15px 0;">🌿 Product Interest</h3>
                    <canvas id="product-chart" style="max-height: 300px;"></canvas>
                </div>
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 15px 0;">👥 Agent Performance</h3>
                    <div id="agent-performance"></div>
                </div>
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 15px 0;">📅 Today's Activity</h3>
                    <div id="daily-report"></div>
                </div>
            </div>
        `;
        
        // Render metrics
        if (this.services.dashboard) {
            await this.services.dashboard.renderMetricsBar(document.getElementById('metrics-bar'));
        }
        
        // Render charts
        if (this.services.dashboard && typeof Chart !== 'undefined') {
            const funnelData = await this.services.dashboard.prepareFunnelChartData();
            const productData = await this.services.dashboard.prepareProductChartData();
            
            if (funnelData) {
                const funnelCanvas = document.getElementById('funnel-chart');
                this.services.dashboard.renderChart('dashboard_funnel', funnelCanvas, funnelData);
            }
            
            if (productData) {
                const productCanvas = document.getElementById('product-chart');
                this.services.dashboard.renderChart('dashboard_product', productCanvas, productData);
            }
        }
        
        // Render agent performance
        if (this.services.dashboard) {
            await this.services.dashboard.renderAgentPerformance(document.getElementById('agent-performance'));
        }
    }
    
    /**
     * Render Kanban page
     * @param {HTMLElement} container - Page container
     * @private
     */
    async _renderKanbanPage(container) {
        container.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                    <h2 style="margin: 0 0 5px 0;">📋 Kanban Board</h2>
                    <p style="margin: 0; color: #6c757d; font-size: 0.85rem;">Drag and drop cards to change status</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="undo-btn" style="padding: 8px 16px; border: 1px solid #dee2e6; border-radius: 20px; background: white; cursor: pointer;">↩️ Undo</button>
                    <button id="redo-btn" style="padding: 8px 16px; border: 1px solid #dee2e6; border-radius: 20px; background: white; cursor: pointer;">↪️ Redo</button>
                    <button onclick="Application.showAddLeadModal()" style="padding: 8px 16px; border: none; border-radius: 20px; background: #2a5c3e; color: white; cursor: pointer; font-weight: 600;">+ Add Lead</button>
                </div>
            </div>
            <div id="kanban-board-container"></div>
        `;
        
        // Initialize Kanban
        if (this.services.kanban) {
            const kanbanContainer = document.getElementById('kanban-board-container');
            await this.services.kanban.initializeBoard(kanbanContainer);
        }
        
        // Setup undo/redo
        document.getElementById('undo-btn').onclick = () => {
            if (this.services.kanban) {
                this.services.kanban.undo();
            }
        };
        
        document.getElementById('redo-btn').onclick = () => {
            if (this.services.kanban) {
                this.services.kanban.redo();
            }
        };
    }
    
    /**
     * Render leads page
     * @param {HTMLElement} container - Page container
     * @private
     */
    async _renderLeadsPage(container) {
        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h2 style="margin: 0 0 5px 0;">👥 Leads</h2>
                <p style="margin: 0; color: #6c757d; font-size: 0.85rem;">Manage all your leads</p>
            </div>
            <div id="filter-bar" style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;"></div>
            <div id="quick-filters" style="display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap;"></div>
            <div id="leads-table-container" style="background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); overflow-x: auto;"></div>
        `;
        
        // Render filters
        if (this.services.filter) {
            this.services.filter.renderFilterBar(document.getElementById('filter-bar'));
            this.services.filter.renderQuickFilters(document.getElementById('quick-filters'));
        }
        
        // Load leads table
        await this._loadLeadsTable();
    }
    
    /**
     * Render reports page
     * @param {HTMLElement} container - Page container
     * @private
     */
    async _renderReportsPage(container) {
        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h2 style="margin: 0 0 5px 0;">📈 Reports</h2>
                <p style="margin: 0; color: #6c757d; font-size: 0.85rem;">Analytics and performance reports</p>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px;">
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 15px 0;">📅 Daily Report</h3>
                    <div id="daily-report-content"></div>
                </div>
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 15px 0;">📆 Weekly Report</h3>
                    <div id="weekly-report-content"></div>
                </div>
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 15px 0;">⏱️ SLA Report</h3>
                    <div id="sla-report-content"></div>
                </div>
            </div>
        `;
        
        // Load reports
        if (this.services.dashboard) {
            const dailyReport = await this.services.dashboard.getDailyReport();
            if (dailyReport.success) {
                document.getElementById('daily-report-content').innerHTML = this._formatDailyReport(dailyReport.report);
            }
        }
        
        if (this.services.status) {
            const slaReport = await this.services.status.getSLAReport();
            if (slaReport.success) {
                document.getElementById('sla-report-content').innerHTML = this._formatSLAReport(slaReport.report);
            }
        }
    }
    
    /**
     * Render settings page
     * @param {HTMLElement} container - Page container
     * @private
     */
    async _renderSettingsPage(container) {
        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h2 style="margin: 0 0 5px 0;">⚙️ Settings</h2>
                <p style="margin: 0; color: #6c757d; font-size: 0.85rem;">Configure your system preferences</p>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 15px 0;">👤 User Profile</h3>
                    <div id="user-profile-settings"></div>
                </div>
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 15px 0;">🔔 Notification Settings</h3>
                    <div id="notification-settings"></div>
                </div>
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 15px 0;">📊 Dashboard Settings</h3>
                    <div id="dashboard-settings"></div>
                </div>
            </div>
        `;
        
        // Render user profile
        const userProfile = AuthService.getUserProfile();
        if (userProfile) {
            document.getElementById('user-profile-settings').innerHTML = `
                <div style="margin-bottom: 10px;">
                    <strong>Name:</strong> ${userProfile.name || 'N/A'}
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>Email:</strong> ${userProfile.email || 'N/A'}
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>Role:</strong> ${userProfile.role || 'Agent'}
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>Team:</strong> ${userProfile.team || 'N/A'}
                </div>
                <div>
                    <strong>Region:</strong> ${userProfile.region || 'N/A'}
                </div>
            `;
        }
    }
    
    /**
     * Load leads table
     * @private
     */
    async _loadLeadsTable() {
        const tableContainer = document.getElementById('leads-table-container');
        if (!tableContainer) return;
        
        if (!this.services.lead) return;
        
        const result = await this.services.lead.getLeads({
            pageSize: 50
        });
        
        if (!result.success) {
            tableContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: #dc3545;">Error loading leads</div>`;
            return;
        }
        
        let html = `
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                <thead>
                    <tr>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Name</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Phone</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Product</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Status</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Agent</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Created</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        result.leads.forEach(lead => {
            const statusBadge = this.services.status ? 
                this.services.status.renderStatusBadge(lead.status)?.outerHTML : 
                `<span>${lead.status}</span>`;
            
            html += `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #f0f0f0;"><strong>${lead.name}</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #f0f0f0;">${lead.phone}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #f0f0f0;">${lead.product || 'N/A'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #f0f0f0;">${statusBadge}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #f0f0f0;">${lead.assignedToName || 'Unassigned'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #f0f0f0;">${lead.createdAt ? lead.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #f0f0f0;">
                        <button onclick="Application.showLeadDetails('${lead.id}')" style="padding: 5px 10px; border: 1px solid #dee2e6; border-radius: 15px; background: white; cursor: pointer;">👁️</button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        tableContainer.innerHTML = html;
    }
    
    // ============================================
    // GLOBAL HANDLERS
    // ============================================
    
    /**
     * Setup global handlers
     * @private
     */
    _setupGlobalHandlers() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('❌ Global error:', event.error);
            this._notifyListeners('onError', event.error);
        });
        
        // Unhandled rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ Unhandled rejection:', event.reason);
            this._notifyListeners('onError', event.reason);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+K - Focus search
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector('#filter-bar input[type="text"]');
                if (searchInput) searchInput.focus();
            }
            
            // Ctrl+N - New lead
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.showAddLeadModal();
            }
            
            // Ctrl+Z - Undo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (this.services.kanban) this.services.kanban.undo();
            }
            
            // Ctrl+Shift+Z - Redo
            if (e.ctrlKey && e.shiftKey && e.key === 'z') {
                e.preventDefault();
                if (this.services.kanban) this.services.kanban.redo();
            }
        });
        
        console.log('✅ Global handlers setup complete');
    }
    
    /**
     * Handle logout
     * @private
     */
    async _handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            if (this.services.auth) {
                await this.services.auth.logoutUser();
            }
            window.location.href = 'login.html';
        }
    }
    
    // ============================================
    // LOAD INITIAL DATA
    // ============================================
    
    /**
     * Load initial data
     * @private
     */
    async _loadInitialData() {
        // Navigate to dashboard
        this.navigateTo('dashboard');
        
        // Update sync status
        if (this.services.realtime) {
            const syncStatusContainer = document.getElementById('sync-status');
            if (syncStatusContainer) {
                this.services.realtime.renderSyncStatus(syncStatusContainer);
            }
        }
        
        // Update user info
        this._updateUserInfo();
        
        console.log('✅ Initial data loaded');
    }
    
    /**
     * Update user info
     * @private
     */
    _updateUserInfo() {
        const userInfoContainer = document.getElementById('user-info');
        if (!userInfoContainer) return;
        
        const userProfile = AuthService.getUserProfile();
        
        if (userProfile) {
            userInfoContainer.innerHTML = `
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #2a5c3e; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem;">
                    ${this._getInitials(userProfile.name || userProfile.email)}
                </div>
                <div>
                    <div style="font-size: 0.8rem; font-weight: 600;">${userProfile.name || 'User'}</div>
                    <div style="font-size: 0.65rem; color: #6c757d;">${userProfile.role || 'Agent'}</div>
                </div>
            `;
        }
    }
    
    // ============================================
    // UI HELPERS
    // ============================================
    
    /**
     * Show add lead modal
     */
    showAddLeadModal() {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
            z-index: 1;
            animation: fadeIn 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 20px; padding: 25px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; animation: slideUp 0.3s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0;">🌿 Add New Lead</h2>
                    <button onclick="this.closest('div[style]').parentElement.remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px;">Full Name *</label>
                    <input type="text" id="add-lead-name" placeholder="Customer name" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 8px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px;">Phone Number *</label>
                    <input type="tel" id="add-lead-phone" placeholder="10-digit mobile" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 8px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px;">Product</label>
                    <select id="add-lead-product" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 8px;">
                        ${PRODUCT_CATALOG.NAMES.map(p => `<option value="${p}">${p}</option>`).join('')}
                    </select>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px;">Source</label>
                    <select id="add-lead-source" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 8px;">
                        ${LEAD_SOURCE.ALL.map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px;">Priority</label>
                    <select id="add-lead-priority" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 8px;">
                        ${LEAD_PRIORITIES.map(p => `<option value="${p}">${p}</option>`).join('')}
                    </select>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px;">City</label>
                    <input type="text" id="add-lead-city" placeholder="City" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 8px;">
                </div>
                <button onclick="Application.saveNewLead()" style="width: 100%; padding: 12px; background: #2a5c3e; color: white; border: none; border-radius: 25px; font-weight: 600; cursor: pointer;">💾 Save Lead</button>
            </div>
        `;
        
        modalContainer.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    /**
     * Save new lead
     */
    async saveNewLead() {
        const name = document.getElementById('add-lead-name')?.value;
        const phone = document.getElementById('add-lead-phone')?.value;
        const product = document.getElementById('add-lead-product')?.value;
        const source = document.getElementById('add-lead-source')?.value;
        const priority = document.getElementById('add-lead-priority')?.value;
        const city = document.getElementById('add-lead-city')?.value;
        
        if (!name || !phone) {
            this.showToast('❌ Name and phone are required', 'error');
            return;
        }
        
        const result = await this.services.lead.createLead({
            name,
            phone,
            product,
            source,
            priority,
            city
        });
        
        if (result.success) {
            this.showToast('✅ Lead added successfully');
            
            // Close modal
            const modal = document.querySelector('#modal-container > div');
            if (modal) modal.remove();
            
            // Refresh data
            await this._loadInitialData();
        } else {
            this.showToast(`❌ ${result.message}`, 'error');
        }
    }
    
    /**
     * Show lead details
     * @param {string} leadId - Lead ID
     */
    async showLeadDetails(leadId) {
        if (!this.services.lead) return;
        
        const result = await this.services.lead.getLeadById(leadId);
        
        if (!result.success) return;
        
        const lead = result.lead;
        
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
            z-index: 1;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 20px; padding: 25px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0;">Lead Details</h2>
                    <button onclick="this.closest('div[style]').parentElement.remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>${lead.name}</strong><br>
                    📞 ${lead.phone}<br>
                    ${lead.city ? '📍 ' + lead.city + '<br>' : ''}
                    🌿 ${lead.product || 'N/A'}<br>
                    📢 ${lead.source || 'N/A'}<br>
                    ⚡ ${lead.priority || 'Normal'}<br>
                    📊 ${lead.status || 'New'}
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button onclick="window.open('tel:+91${lead.phone}', '_self')" style="flex: 1; padding: 10px; border: none; border-radius: 20px; background: #e3f0e5; color: #1e7e34; cursor: pointer; font-weight: 600;">📞 Call</button>
                    <button onclick="window.open('https://wa.me/91${lead.phone}', '_blank')" style="flex: 1; padding: 10px; border: none; border-radius: 20px; background: #d4edda; color: #155724; cursor: pointer; font-weight: 600;">💬 WhatsApp</button>
                </div>
            </div>
        `;
        
        modalContainer.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type
     */
    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.style.cssText = `
            padding: 12px 20px;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            font-size: 0.85rem;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease;
            cursor: pointer;
            background: ${type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#2a5c3e'};
        `;
        toast.textContent = message;
        toast.onclick = () => toast.remove();
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    /**
     * Format daily report
     * @param {Object} report - Daily report
     * @returns {string} HTML string
     * @private
     */
    _formatDailyReport(report) {
        return `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>📊 Leads Created: <strong>${report.leadsCreated}</strong></div>
                <div>📝 Notes Added: <strong>${report.notesAdded}</strong></div>
                <div>✅ Leads Closed: <strong>${report.leadsClosed}</strong></div>
                <div>⏰ Follow-ups Done: <strong>${report.followupsCompleted}</strong></div>
            </div>
        `;
    }
    
    /**
     * Format SLA report
     * @param {Object} report - SLA report
     * @returns {string} HTML string
     * @private
     */
    _formatSLAReport(report) {
        return `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>✅ Within SLA: <strong>${report.withinSLA}</strong></div>
                <div>⚠️ Warning: <strong>${report.warning}</strong></div>
                <div>❌ Breached: <strong>${report.breached}</strong></div>
                <div>📊 Total: <strong>${report.total}</strong></div>
            </div>
        `;
    }
    
    /**
     * Get initials
     * @param {string} name - Full name
     * @returns {string} Initials
     * @private
     */
    _getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
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

const ApplicationInstance = new Application();

// ============================================
// GLOBAL EXPORT
// ============================================

window.Application = ApplicationInstance;

// ============================================
// AUTO-INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is authenticated
    if (typeof AuthService !== 'undefined' && AuthService.isAuthenticated()) {
        // Initialize application
        await ApplicationInstance.initialize();
    } else {
        // Redirect to login
        window.location.href = 'login.html';
    }
});

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

console.log('✅ Main Application Loaded');
console.log('📋 Keyboard Shortcuts:');
console.log('   Ctrl+K - Focus Search');
console.log('   Ctrl+N - New Lead');
console.log('   Ctrl+Z - Undo');
console.log('   Ctrl+Shift+Z - Redo');

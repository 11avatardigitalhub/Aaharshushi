/**
 * ============================================================
 * AAHAR SHUDHI - MAIN APPLICATION (COMPLETE FIXED VERSION)
 * ============================================================
 * @description Enterprise-grade application bootstrap
 * @version 3.0.0 - Fixed Version
 * @priority HIGHEST - Application Core
 * 
 * This file handles:
 * - Application initialization
 * - UI rendering
 * - Navigation management
 * - Event coordination
 * - Global error handling
 * - Service integration
 * ============================================================
 */

// ============================================
// CONSOLE WARNING SUPPRESSION
// ============================================

(function() {
    const originalWarn = console.warn;
    console.warn = function(...args) {
        if (args[0] && (
            typeof args[0] === 'string' && (
                args[0].includes('unload is not allowed') ||
                args[0].includes('Permissions policy') ||
                args[0].includes('frame.js')
            )
        )) {
            return;
        }
        originalWarn.apply(console, args);
    };
    
    const originalError = console.error;
    console.error = function(...args) {
        if (args[0] && (
            typeof args[0] === 'string' && (
                args[0].includes('Permissions policy') ||
                args[0].includes('unload is not allowed')
            )
        )) {
            return;
        }
        originalError.apply(console, args);
    };
})();

// ============================================
// APPLICATION CLASS
// ============================================

class Application {
    constructor() {
        // Application state
        this.state = {
            isInitialized: false,
            isReady: false,
            currentPage: 'dashboard',
            previousPage: null,
            isLoading: true,
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
            }
        };
        
        console.log('✅ Application instance created');
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    /**
     * Initialize application
     */
    async initialize() {
        console.log('🚀 Starting Aahar Shudhi Application...');
        
        try {
            // Step 1: Check Firebase
            if (typeof FirebaseCore === 'undefined') {
                throw new Error('FirebaseCore not loaded. Check firebase-config.js');
            }
            this.services.firebase = FirebaseCore;
            console.log('✅ Firebase Core ready');
            
            // Step 2: Check Services
            this._checkServices();
            
            // Step 3: Create UI
            this._createMainUI();
            
            // Step 4: Setup Navigation
            this._setupNavigation();
            
            // Step 5: Load Dashboard
            await this._loadDashboard();
            
            // Step 6: Finalize
            this.state.isInitialized = true;
            this.state.isReady = true;
            this.state.isLoading = false;
            
            console.log('✅ Application initialized successfully');
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('app-ready'));
            
            return {
                success: true,
                message: 'Application ready'
            };
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.state.initializationError = error;
            this.state.isLoading = false;
            
            // Show error in UI
            this._showFatalError(error.message);
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Check all services
     * @private
     */
    _checkServices() {
        const serviceMap = {
            auth: 'AuthService',
            lead: 'LeadService',
            status: 'StatusService',
            kanban: 'KanbanService',
            note: 'NoteService',
            followup: 'FollowupService',
            dashboard: 'DashboardService',
            realtime: 'RealtimeService',
            filter: 'FilterService'
        };
        
        Object.keys(serviceMap).forEach(key => {
            const serviceName = serviceMap[key];
            if (typeof window[serviceName] !== 'undefined') {
                this.services[key] = window[serviceName];
                console.log(`✅ ${serviceName} ready`);
            } else {
                console.warn(`⚠️ ${serviceName} not available`);
            }
        });
        
        // Check components
        if (typeof window.Toast !== 'undefined') {
            console.log('✅ Toast component ready');
        }
        if (typeof window.LeadCard !== 'undefined') {
            console.log('✅ LeadCard component ready');
        }
        if (typeof window.KanbanBoard !== 'undefined') {
            console.log('✅ KanbanBoard component ready');
        }
        if (typeof window.LeadModal !== 'undefined') {
            console.log('✅ LeadModal component ready');
        }
        if (typeof window.MetricsBar !== 'undefined') {
            console.log('✅ MetricsBar component ready');
        }
    }
    
    // ============================================
    // UI CREATION
    // ============================================
    
    /**
     * Create main UI
     * @private
     */
    _createMainUI() {
        const container = document.getElementById('main-container');
        
        if (!container) {
            throw new Error('Main container not found');
        }
        
        container.innerHTML = `
            <!-- Navigation Bar -->
            <nav style="
                background: white;
                padding: 12px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 2px 10px rgba(0,0,0,0.08);
                position: sticky;
                top: 0;
                z-index: 1000;
                flex-wrap: wrap;
                gap: 10px;
            ">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.8rem;">🌿</span>
                    <div>
                        <div style="font-weight: 700; font-size: 1.1rem; color: #2a5c3e;">Aahar Shudhi</div>
                        <div style="font-size: 0.7rem; color: #6c757d;">Lead Management System</div>
                    </div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 8px; overflow-x: auto;">
                    <button onclick="Application.navigateTo('dashboard')" id="nav-dashboard" style="
                        padding: 8px 14px;
                        border: none;
                        background: #2a5c3e;
                        color: white;
                        border-radius: 20px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 0.8rem;
                        white-space: nowrap;
                        transition: all 0.3s ease;
                    ">📊 Dashboard</button>
                    
                    <button onclick="Application.navigateTo('kanban')" id="nav-kanban" style="
                        padding: 8px 14px;
                        border: none;
                        background: transparent;
                        color: #6c757d;
                        border-radius: 20px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 0.8rem;
                        white-space: nowrap;
                        transition: all 0.3s ease;
                    ">📋 Kanban</button>
                    
                    <button onclick="Application.navigateTo('leads')" id="nav-leads" style="
                        padding: 8px 14px;
                        border: none;
                        background: transparent;
                        color: #6c757d;
                        border-radius: 20px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 0.8rem;
                        white-space: nowrap;
                        transition: all 0.3s ease;
                    ">👥 Leads</button>
                </div>
                
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button onclick="openAddLeadModal()" style="
                        padding: 10px 16px;
                        background: #2a5c3e;
                        color: white;
                        border: none;
                        border-radius: 25px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 0.8rem;
                        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.15)';" 
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"
                    >+ Add Lead</button>
                    
                    <button onclick="handleLogout()" style="
                        padding: 10px 14px;
                        background: #f8d7da;
                        color: #721c24;
                        border: none;
                        border-radius: 25px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 0.8rem;
                        transition: all 0.3s ease;
                    ">🚪 Logout</button>
                </div>
            </nav>
            
            <!-- Main Content Area -->
            <div style="
                padding: 20px;
                max-width: 1400px;
                margin: 0 auto;
                min-height: calc(100vh - 70px);
            ">
                <!-- Page: Dashboard -->
                <div id="page-dashboard" style="display: block;">
                    <div style="margin-bottom: 20px;">
                        <h2 style="margin: 0 0 5px 0; color: #2a5c3e;">📊 Dashboard</h2>
                        <p style="margin: 0; color: #6c757d; font-size: 0.85rem;">Real-time overview of your lead management</p>
                    </div>
                    <div id="metrics-bar" style="
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 15px;
                        margin-bottom: 20px;
                    "></div>
                    <div id="dashboard-content"></div>
                </div>
                
                <!-- Page: Kanban -->
                <div id="page-kanban" style="display: none;">
                    <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <h2 style="margin: 0 0 5px 0; color: #2a5c3e;">📋 Kanban Board</h2>
                            <p style="margin: 0; color: #6c757d; font-size: 0.85rem;">Drag and drop cards to change status</p>
                        </div>
                        <button onclick="openAddLeadModal()" style="
                            padding: 10px 16px;
                            background: #2a5c3e;
                            color: white;
                            border: none;
                            border-radius: 25px;
                            cursor: pointer;
                            font-weight: 600;
                            font-size: 0.8rem;
                        ">+ Add Lead</button>
                    </div>
                    <div id="kanban-board-container"></div>
                </div>
                
                <!-- Page: Leads -->
                <div id="page-leads" style="display: none;">
                    <div style="margin-bottom: 20px;">
                        <h2 style="margin: 0 0 5px 0; color: #2a5c3e;">👥 All Leads</h2>
                        <p style="margin: 0; color: #6c757d; font-size: 0.85rem;">Manage and view all your leads</p>
                    </div>
                    <div id="leads-table-container" style="
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.08);
                        overflow-x: auto;
                        padding: 15px;
                    "></div>
                </div>
            </div>
            
            <!-- Toast Container -->
            <div id="toast-container" style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 350px;
            "></div>
            
            <!-- Modal Container -->
            <div id="modal-container" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 9998;
                pointer-events: none;
            "></div>
        `;
        
        console.log('✅ Main UI created');
    }
    
    /**
     * Setup navigation
     * @private
     */
    _setupNavigation() {
        // Store page containers
        this.pages.dashboard.container = document.getElementById('page-dashboard');
        this.pages.kanban.container = document.getElementById('page-kanban');
        this.pages.leads.container = document.getElementById('page-leads');
        
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
        
        // Hide all pages
        Object.keys(this.pages).forEach(id => {
            const page = this.pages[id];
            if (page.container) {
                page.container.style.display = 'none';
            }
        });
        
        // Show target page
        if (this.pages[pageId].container) {
            this.pages[pageId].container.style.display = 'block';
        }
        
        // Update nav buttons
        Object.keys(this.pages).forEach(id => {
            const navBtn = document.getElementById(`nav-${id}`);
            if (navBtn) {
                if (id === pageId) {
                    navBtn.style.background = '#2a5c3e';
                    navBtn.style.color = 'white';
                } else {
                    navBtn.style.background = 'transparent';
                    navBtn.style.color = '#6c757d';
                }
            }
        });
        
        // Initialize page if needed
        if (!this.pages[pageId].initialized) {
            this._initializePage(pageId);
        }
        
        console.log(`📄 Navigated to: ${pageId}`);
    }
    
    /**
     * Initialize page
     * @param {string} pageId - Page ID
     * @private
     */
    async _initializePage(pageId) {
        switch (pageId) {
            case 'dashboard':
                await this._renderDashboard();
                break;
            case 'kanban':
                await this._renderKanban();
                break;
            case 'leads':
                await this._renderLeads();
                break;
        }
        
        this.pages[pageId].initialized = true;
    }
    
    // ============================================
    // PAGE RENDERERS
    // ============================================
    
    /**
     * Load dashboard
     * @private
     */
    async _loadDashboard() {
        await this._renderDashboard();
    }
    
    /**
     * Render dashboard
     * @private
     */
    async _renderDashboard() {
        try {
            // Render metrics
            if (typeof window.MetricsBar !== 'undefined') {
                const metricsContainer = document.getElementById('metrics-bar');
                if (metricsContainer) {
                    window.MetricsBar.render(metricsContainer);
                }
            }
            
            // Render dashboard content
            const dashboardContent = document.getElementById('dashboard-content');
            if (dashboardContent && typeof window.DashboardService !== 'undefined') {
                const metrics = await window.DashboardService.getKeyMetrics();
                
                if (metrics.success) {
                    dashboardContent.innerHTML = `
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
                            <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
                                <h3 style="margin: 0 0 15px 0; color: #2a5c3e;">📈 Lead Funnel</h3>
                                <canvas id="funnel-chart" style="max-height: 200px;"></canvas>
                            </div>
                            <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
                                <h3 style="margin: 0 0 15px 0; color: #2a5c3e;">🌿 Product Interest</h3>
                                <canvas id="product-chart" style="max-height: 200px;"></canvas>
                            </div>
                        </div>
                    `;
                    
                    // Render charts if Chart.js available
                    if (typeof Chart !== 'undefined') {
                        const funnelData = await window.DashboardService.getLeadFunnel();
                        if (funnelData.success) {
                            const ctx = document.getElementById('funnel-chart')?.getContext('2d');
                            if (ctx) {
                                new Chart(ctx, {
                                    type: 'bar',
                                    data: {
                                        labels: funnelData.funnel.map(f => f.status),
                                        datasets: [{
                                            label: 'Leads',
                                            data: funnelData.funnel.map(f => f.count),
                                            backgroundColor: ['#fff3cd', '#d1ecf1', '#e7d9ff', '#d4edda', '#f8d7da', '#d6d8db'],
                                            borderRadius: 8
                                        }]
                                    },
                                    options: {
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false } }
                                    }
                                });
                            }
                        }
                        
                        const productData = await window.DashboardService.getProductAnalysis();
                        if (productData.success) {
                            const ctx = document.getElementById('product-chart')?.getContext('2d');
                            if (ctx) {
                                new Chart(ctx, {
                                    type: 'doughnut',
                                    data: {
                                        labels: productData.products.map(p => p.product),
                                        datasets: [{
                                            data: productData.products.map(p => p.count),
                                            backgroundColor: ['#2a5c3e', '#3d7a54', '#5a9e6f', '#7fc49a', '#a8d8b9', '#d4edda']
                                        }]
                                    },
                                    options: {
                                        responsive: true,
                                        maintainAspectRatio: false
                                    }
                                });
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Dashboard rendering failed:', error);
        }
    }
    
    /**
     * Render Kanban
     * @private
     */
    async _renderKanban() {
        try {
            if (typeof window.KanbanBoard !== 'undefined') {
                const kanbanContainer = document.getElementById('kanban-board-container');
                if (kanbanContainer) {
                    await window.KanbanBoard.initialize(kanbanContainer);
                }
            }
        } catch (error) {
            console.error('❌ Kanban rendering failed:', error);
        }
    }
    
    /**
     * Render leads table
     * @private
     */
    async _renderLeads() {
        try {
            const tableContainer = document.getElementById('leads-table-container');
            if (!tableContainer) return;
            
            if (typeof window.LeadService !== 'undefined') {
                const result = await window.LeadService.getLeads({ pageSize: 50 });
                
                if (result.success && result.leads.length > 0) {
                    let html = `
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                            <thead>
                                <tr>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Name</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Phone</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Product</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Status</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    
                    result.leads.forEach(lead => {
                        html += `
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #f0f0f0;"><strong>${lead.name || 'N/A'}</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #f0f0f0;">${lead.phone || 'N/A'}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #f0f0f0;">${lead.product || 'N/A'}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #f0f0f0;">${lead.status || 'New'}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #f0f0f0;">
                                    <button onclick="window.location.href='tel:+91${lead.phone}'" style="padding: 5px 10px; border: none; border-radius: 15px; background: #e3f0e5; color: #1e7e34; cursor: pointer; font-size: 0.75rem;">📞</button>
                                    <button onclick="window.open('https://wa.me/91${lead.phone}', '_blank')" style="padding: 5px 10px; border: none; border-radius: 15px; background: #d4edda; color: #155724; cursor: pointer; font-size: 0.75rem;">💬</button>
                                </td>
                            </tr>
                        `;
                    });
                    
                    html += `</tbody></table>`;
                    tableContainer.innerHTML = html;
                } else {
                    tableContainer.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #6c757d;">
                            <div style="font-size: 3rem; margin-bottom: 10px;">📭</div>
                            <div>No leads found</div>
                            <button onclick="openAddLeadModal()" style="margin-top: 15px; padding: 10px 20px; background: #2a5c3e; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600;">+ Add First Lead</button>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('❌ Leads rendering failed:', error);
        }
    }
    
    // ============================================
    // ERROR HANDLING
    // ============================================
    
    /**
     * Show fatal error
     * @param {string} message - Error message
     * @private
     */
    _showFatalError(message) {
        const container = document.getElementById('main-container');
        if (container) {
            container.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    text-align: center;
                    padding: 20px;
                ">
                    <div>
                        <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
                        <h2 style="color: #721c24; margin-bottom: 10px;">Something went wrong</h2>
                        <p style="color: #721c24; margin-bottom: 20px;">${message}</p>
                        <button onclick="location.reload()" style="
                            padding: 12px 24px;
                            background: #dc3545;
                            color: white;
                            border: none;
                            border-radius: 25px;
                            cursor: pointer;
                            font-weight: 600;
                        ">🔄 Refresh Page</button>
                    </div>
                </div>
            `;
        }
    }
    
    // ============================================
    // TOAST HELPER
    // ============================================
    
    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type
     */
    showToast(message, type = 'success') {
        if (typeof window.Toast !== 'undefined') {
            window.Toast.show(message, type);
        } else {
            // Fallback toast
            const container = document.getElementById('toast-container');
            if (container) {
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
                    background: ${type === 'error' ? '#dc3545' : '#2a5c3e'};
                `;
                toast.textContent = message;
                toast.onclick = () => toast.remove();
                container.appendChild(toast);
                
                setTimeout(() => toast.remove(), 3000);
            }
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
// GLOBAL FUNCTIONS
// ============================================

/**
 * Handle logout
 */
async function handleLogout() {
    try {
        if (typeof AuthService !== 'undefined') {
            await AuthService.logoutUser();
        }
    } catch (error) {
        console.warn('⚠️ Logout error:', error);
    }
    
    // Redirect to login
    window.location.href = 'login.html';
}

/**
 * Open add lead modal
 */
function openAddLeadModal() {
    if (typeof window.LeadModal !== 'undefined') {
        window.LeadModal.openAddModal();
    } else {
        ApplicationInstance.showToast('Lead modal not available', 'error');
    }
}

// Global functions
window.handleLogout = handleLogout;
window.openAddLeadModal = openAddLeadModal;

// ============================================
// AUTO-INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM ready, checking auth...');
    
    // Check if auth is available
    if (typeof auth === 'undefined') {
        console.error('❌ Firebase Auth not loaded');
        window.location.href = 'login.html';
        return;
    }
    
    // Check auth state
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('👤 Authenticated:', user.email);
            await ApplicationInstance.initialize();
        } else {
            console.log('👤 Not authenticated, redirecting to login');
            window.location.href = 'login.html';
        }
    });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

window.addEventListener('error', (event) => {
    console.error('❌ Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled rejection:', event.reason);
});

console.log('✅ App.js Loaded Successfully');
console.log('📋 Application ready for initialization');

/**
 * ============================================================
 * AAHAR SHUDHI - MAIN APPLICATION (FIXED)
 * ============================================================
 */

class Application {
    constructor() {
        this.state = {
            isInitialized: false,
            currentPage: 'dashboard'
        };
        
        console.log('✅ Application instance created');
    }
    
    async initialize() {
        console.log('🚀 Initializing Aahar Shudhi...');
        
        try {
            // Check services
            if (typeof FirebaseCore === 'undefined') {
                throw new Error('FirebaseCore not loaded');
            }
            
            if (typeof AuthService === 'undefined') {
                throw new Error('AuthService not loaded');
            }
            
            // Create basic UI
            this._createBasicUI();
            
            this.state.isInitialized = true;
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('app-ready'));
            
            console.log('✅ Application initialized');
            
            return { success: true };
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    _createBasicUI() {
        const container = document.getElementById('main-container');
        if (!container) return;
        
        container.innerHTML = `
            <nav style="background: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.8rem;">🌿</span>
                    <div>
                        <div style="font-weight: 700; color: #2a5c3e;">Aahar Shudhi</div>
                        <div style="font-size: 0.7rem; color: #6c757d;">Lead Management System</div>
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="openAddLeadModal()" style="padding: 10px 16px; background: #2a5c3e; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600;">+ Add Lead</button>
                    <button onclick="handleLogout()" style="padding: 10px 16px; background: #f8d7da; color: #721c24; border: none; border-radius: 25px; cursor: pointer; font-weight: 600;">Logout</button>
                </div>
            </nav>
            <div style="padding: 20px; max-width: 1400px; margin: 0 auto;">
                <div id="metrics-bar" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;"></div>
                <div id="kanban-board-container"></div>
            </div>
        `;
        
        // Render metrics
        if (typeof MetricsBar !== 'undefined') {
            MetricsBar.render(document.getElementById('metrics-bar'));
        }
        
        // Initialize Kanban
        if (typeof KanbanBoard !== 'undefined') {
            KanbanBoard.initialize(document.getElementById('kanban-board-container'));
        }
    }
    
    showToast(message, type = 'success') {
        if (typeof Toast !== 'undefined') {
            Toast.show(message, type);
        }
    }
}

// Singleton
const ApplicationInstance = new Application();

// Global
window.Application = ApplicationInstance;

// Handle logout
async function handleLogout() {
    if (typeof AuthService !== 'undefined') {
        await AuthService.logoutUser();
    }
    window.location.href = 'login.html';
}

window.handleLogout = handleLogout;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM ready');
    
    // Check auth state
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('👤 Authenticated:', user.email);
                await ApplicationInstance.initialize();
            } else {
                console.log('👤 Not authenticated');
                window.location.href = 'login.html';
            }
        });
    } else {
        console.error('❌ Auth not available');
        window.location.href = 'login.html';
    }
});

console.log('✅ App.js Loaded');

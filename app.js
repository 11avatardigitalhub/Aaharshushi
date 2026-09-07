/**
 * ============================================================
 * AAHAR SHUDHI - MULTI-TENANT LEAD MANAGEMENT SYSTEM
 * ============================================================
 * @description Complete application logic
 * @version 1.0.0
 * ============================================================
 */

// ============================================
// FIREBASE CONFIGURATION
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyBZDaHJSt-4AV6EJYG76p8kcsIHf6LOxdU",
    authDomain: "avatar-wa-dual-crm.firebaseapp.com",
    projectId: "avatar-wa-dual-crm",
    storageBucket: "avatar-wa-dual-crm.firebasestorage.app",
    messagingSenderId: "946959261009",
    appId: "1:946959261009:web:3ae08845917ac8cff8c770"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ============================================
// CONSTANTS
// ============================================

const STATUSES = ['New', 'Contacted', 'Follow-up', 'Interested', 'Closed'];
const STATUS_COLORS = {
    'New': '#fff3cd',
    'Contacted': '#d1ecf1',
    'Follow-up': '#e7d9ff',
    'Interested': '#d4edda',
    'Closed': '#d6d8db'
};
const STATUS_TEXT_COLORS = {
    'New': '#856404',
    'Contacted': '#0c5460',
    'Follow-up': '#4a3696',
    'Interested': '#155724',
    'Closed': '#383d41'
};
const PRODUCTS = ['Chyawanprash', 'Ashwagandha', 'Triphala', 'Giloy Juice', 'Brahmi', 'Other'];
const SOURCES = ['Facebook', 'Instagram', 'Google Ads', 'Website', 'WhatsApp', 'Reference', 'Walk-in', 'Other'];
const PRIORITIES = ['Normal', 'Hot', 'Warm', 'Cold'];
const ROLES = ['admin', 'team_lead', 'agent'];
const TEAMS = ['North', 'South', 'East', 'West', 'All'];

// ============================================
// GLOBAL STATE
// ============================================

let currentUser = null;
let currentUserProfile = null;
let currentTenantId = null;
let currentTenant = null;
let currentLeads = [];
let allTenants = [];
let allTeamMembers = [];

// ============================================
// AUTH STATE LISTENER
// ============================================

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('user-info').innerHTML = `👤 ${user.email}`;
        
        await loadUserProfile(user.uid);
        await loadAllData();
        updateUIBasedOnRole();
    } else {
        currentUser = null;
        currentUserProfile = null;
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('dashboard').style.display = 'none';
    }
});

// ============================================
// LOAD USER PROFILE
// ============================================

async function loadUserProfile(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            currentUserProfile = { id: userDoc.id, ...userDoc.data() };
            currentTenantId = currentUserProfile.tenantId || null;
            
            if (currentTenantId) {
                await loadTenant(currentTenantId);
            }
        } else {
            // Create super admin profile
            currentUserProfile = {
                id: userId,
                email: currentUser.email,
                name: 'Super Admin',
                role: 'admin',
                tenantId: null,
                isSuperAdmin: true,
                team: 'All',
                region: 'All',
                isActive: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('users').doc(userId).set(currentUserProfile);
        }
        
        updateTenantBadge();
    } catch (error) {
        console.error('❌ Load profile error:', error);
    }
}

// ============================================
// LOAD TENANT
// ============================================

async function loadTenant(tenantId) {
    try {
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (tenantDoc.exists) {
            currentTenant = { id: tenantDoc.id, ...tenantDoc.data() };
        }
    } catch (error) {
        console.error('❌ Load tenant error:', error);
    }
}

function updateTenantBadge() {
    const badge = document.getElementById('tenant-badge');
    if (currentTenant) {
        badge.innerHTML = `🏢 ${currentTenant.name || 'Tenant'}`;
    } else if (currentUserProfile?.isSuperAdmin) {
        badge.innerHTML = `🏢 Super Admin`;
    } else {
        badge.innerHTML = `🏢 No Tenant`;
    }
}

// ============================================
// UPDATE UI BASED ON ROLE
// ============================================

function updateUIBasedOnRole() {
    const isAdmin = currentUserProfile?.role === 'admin' || currentUserProfile?.isSuperAdmin;
    const isTeamLead = currentUserProfile?.role === 'team_lead';
    
    // Show/hide admin tabs
    document.querySelectorAll('.admin-only').forEach(el => {
        if (isAdmin) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });
}

// ============================================
// LOAD ALL DATA
// ============================================

async function loadAllData() {
    await loadLeads();
    
    if (currentUserProfile?.role === 'admin' || currentUserProfile?.isSuperAdmin) {
        await loadTenants();
        await loadTeamMembers();
    }
    
    renderMetrics();
    renderKanban();
    renderLeadsTable();
    renderTeamMembers();
    renderTenants();
    renderSettings();
    populateAgentDropdown();
}

// ============================================
// LOAD LEADS (Tenant-aware)
// ============================================

async function loadLeads() {
    try {
        let query = db.collection('leads').orderBy('createdAt', 'desc').limit(200);
        
        // Multi-tenant filter
        if (currentTenantId && !currentUserProfile?.isSuperAdmin) {
            query = query.where('tenantId', '==', currentTenantId);
        }
        
        const snapshot = await query.get();
        currentLeads = [];
        snapshot.forEach(doc => {
            currentLeads.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error('❌ Load leads error:', error);
        showToast('Error loading leads: ' + error.message, 'error');
    }
}

// ============================================
// LOAD TENANTS
// ============================================

async function loadTenants() {
    try {
        const snapshot = await db.collection('tenants').get();
        allTenants = [];
        snapshot.forEach(doc => {
            allTenants.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error('❌ Load tenants error:', error);
    }
}

// ============================================
// LOAD TEAM MEMBERS
// ============================================

async function loadTeamMembers() {
    try {
        let query = db.collection('users');
        
        if (currentTenantId && !currentUserProfile?.isSuperAdmin) {
            query = query.where('tenantId', '==', currentTenantId);
        }
        
        const snapshot = await query.get();
        allTeamMembers = [];
        snapshot.forEach(doc => {
            allTeamMembers.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error('❌ Load team error:', error);
    }
}

// ============================================
// LOGIN
// ============================================

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    const loginBtn = document.getElementById('login-btn');
    
    errorDiv.style.display = 'none';
    
    if (!email || !password) {
        errorDiv.textContent = 'Email and password required';
        errorDiv.style.display = 'block';
        return;
    }
    
    loginBtn.innerHTML = '<span class="loading-spinner"></span> Signing in...';
    loginBtn.disabled = true;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        const messages = {
            'auth/invalid-credential': 'Invalid email or password',
            'auth/user-not-found': 'No account found',
            'auth/wrong-password': 'Incorrect password',
            'auth/invalid-email': 'Invalid email',
            'auth/too-many-requests': 'Too many attempts. Try later.'
        };
        errorDiv.textContent = messages[error.code] || 'Login failed';
        errorDiv.style.display = 'block';
    } finally {
        loginBtn.innerHTML = '🔐 Sign In';
        loginBtn.disabled = false;
    }
}

async function handleLogout() {
    await auth.signOut();
}

// ============================================
// RENDER METRICS
// ============================================

function renderMetrics() {
    const container = document.getElementById('metrics-bar');
    const total = currentLeads.length;
    const counts = {};
    STATUSES.forEach(s => counts[s] = currentLeads.filter(l => l.status === s).length);
    const conversion = total > 0 ? ((counts['Closed'] / total) * 100).toFixed(1) : 0;
    
    const metrics = [
        { icon: '📊', label: 'Total Leads', value: total },
        { icon: '🆕', label: 'New', value: counts['New'] },
        { icon: '📞', label: 'Contacted', value: counts['Contacted'] },
        { icon: '⏰', label: 'Follow-up', value: counts['Follow-up'] },
        { icon: '💚', label: 'Interested', value: counts['Interested'] },
        { icon: '✅', label: 'Closed', value: counts['Closed'] },
        { icon: '👥', label: 'Team', value: allTeamMembers.length },
        { icon: '🎯', label: 'Conversion', value: conversion + '%' }
    ];
    
    container.innerHTML = metrics.map(m => `
        <div class="metric-card">
            <span class="metric-icon">${m.icon}</span>
            <div class="metric-value">${m.value}</div>
            <div class="metric-label">${m.label}</div>
        </div>
    `).join('');
}

// ============================================
// RENDER KANBAN
// ============================================

function renderKanban() {
    const board = document.getElementById('kanban-board');
    board.innerHTML = '';
    
    STATUSES.forEach(status => {
        const leads = currentLeads.filter(l => l.status === status);
        const col = document.createElement('div');
        col.className = 'kanban-column';
        col.style.background = STATUS_COLORS[status];
        col.dataset.status = status;
        
        col.innerHTML = `
            <div class="kanban-column-header">
                <span>${status}</span>
                <span class="kanban-count">${leads.length}</span>
            </div>
            <div class="kanban-cards" data-status="${status}">
                ${leads.map(lead => createCardHTML(lead)).join('')}
            </div>
        `;
        
        board.appendChild(col);
    });
    
    setupDragDrop();
}

function createCardHTML(lead) {
    const initials = (lead.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const timeAgo = getTimeAgo(lead.updatedAt || lead.createdAt);
    
    return `
        <div class="lead-card" draggable="true" data-lead-id="${lead.id}" data-status="${lead.status}">
            <div class="lead-card-header">
                <div style="display:flex;align-items:center;">
                    <div class="lead-card-avatar">${initials}</div>
                    <span class="lead-card-name">${lead.name || 'Unknown'}</span>
                </div>
                <span class="lead-card-time">${timeAgo}</span>
            </div>
            <div class="lead-card-info">
                <p>📞 ${lead.phone || 'N/A'}</p>
                ${lead.city ? `<p>📍 ${lead.city}</p>` : ''}
                ${lead.assignedToName ? `<p>👤 ${lead.assignedToName}</p>` : ''}
            </div>
            <div class="lead-card-tags">
                ${lead.product ? `<span class="lead-tag tag-product">🌿 ${lead.product}</span>` : ''}
                ${lead.priority === 'Hot' ? '<span class="lead-tag tag-hot">🔥 Hot</span>' : ''}
                ${lead.source ? `<span class="lead-tag tag-source">📢 ${lead.source}</span>` : ''}
            </div>
            <div class="lead-card-actions">
                <button class="btn-call" onclick="event.stopPropagation(); callLead('${lead.phone}')">📞</button>
                <button class="btn-wa" onclick="event.stopPropagation(); waLead('${lead.phone}')">💬</button>
                <button class="btn-move" onclick="event.stopPropagation(); moveLead('${lead.id}','${lead.status}')">➡️</button>
            </div>
        </div>
    `;
}

function getTimeAgo(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
    return Math.floor(seconds / 604800) + 'w ago';
}

// ============================================
// DRAG & DROP
// ============================================

function setupDragDrop() {
    document.querySelectorAll('.lead-card').forEach(card => {
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('leadId', card.dataset.leadId);
            e.dataTransfer.setData('fromStatus', card.dataset.status);
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
    });
    
    document.querySelectorAll('.kanban-cards').forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', async (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const leadId = e.dataTransfer.getData('leadId');
            const fromStatus = e.dataTransfer.getData('fromStatus');
            const toStatus = zone.dataset.status;
            if (leadId && fromStatus !== toStatus) {
                await updateLeadStatus(leadId, toStatus);
            }
        });
    });
}

// ============================================
// RENDER LEADS TABLE
// ============================================

function renderLeadsTable() {
    const container = document.getElementById('leads-table-container');
    
    if (currentLeads.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#6c757d;">📭 No leads found</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-toolbar">
            <input type="text" placeholder="🔍 Search..." oninput="filterLeadsTable(this.value)">
            <select onchange="filterLeadsByStatus(this.value)">
                <option value="All">All Status</option>
                ${STATUSES.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
        </div>
        <table>
            <thead>
                <tr><th>Name</th><th>Phone</th><th>City</th><th>Product</th><th>Source</th><th>Priority</th><th>Status</th><th>Assigned To</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody id="leads-table-body">
                ${currentLeads.map(createTableRow).join('')}
            </tbody>
        </table>
    `;
}

function createTableRow(lead) {
    return `
        <tr>
            <td><strong>${lead.name}</strong></td>
            <td>${lead.phone}</td>
            <td>${lead.city || '-'}</td>
            <td>${lead.product || '-'}</td>
            <td>${lead.source || '-'}</td>
            <td>${lead.priority || 'Normal'}</td>
            <td><span class="status-badge" style="background:${STATUS_COLORS[lead.status]};color:${STATUS_TEXT_COLORS[lead.status]};">${lead.status}</span></td>
            <td>${lead.assignedToName || 'Unassigned'}</td>
            <td>${lead.createdAt ? getTimeAgo(lead.createdAt) : '-'}</td>
            <td>
                <button style="padding:4px 8px;border:none;border-radius:12px;cursor:pointer;background:#e3f0e5;color:#1e7e34;" onclick="callLead('${lead.phone}')">📞</button>
                <button style="padding:4px 8px;border:none;border-radius:12px;cursor:pointer;background:#d4edda;color:#155724;" onclick="waLead('${lead.phone}')">💬</button>
            </td>
        </tr>
    `;
}

function filterLeadsTable(searchTerm) {
    const filtered = currentLeads.filter(lead => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (lead.name || '').toLowerCase().includes(term) || (lead.phone || '').includes(term);
    });
    document.getElementById('leads-table-body').innerHTML = filtered.map(createTableRow).join('');
}

function filterLeadsByStatus(status) {
    const filtered = status === 'All' ? currentLeads : currentLeads.filter(l => l.status === status);
    document.getElementById('leads-table-body').innerHTML = filtered.map(createTableRow).join('');
}

// ============================================
// RENDER TEAM MEMBERS
// ============================================

function renderTeamMembers() {
    const container = document.getElementById('team-container');
    
    if (!currentUserProfile?.role === 'admin' && !currentUserProfile?.isSuperAdmin) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#6c757d;">🔒 Only admin can view team</div>';
        return;
    }
    
    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
            <h3 style="color:#2a5c3e;">👥 Team Members (${allTeamMembers.length})</h3>
            <button class="btn btn-primary" onclick="openTeamModal()">+ Add Member</button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Team</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    ${allTeamMembers.map(member => `
                        <tr>
                            <td><strong>${member.name || 'N/A'}</strong></td>
                            <td>${member.email}</td>
                            <td>${member.phone || '-'}</td>
                            <td><span class="status-badge" style="background:${member.role === 'admin' ? '#f8d7da' : member.role === 'team_lead' ? '#fff3cd' : '#d4edda'};color:#333;">${member.role}</span></td>
                            <td>${member.team || 'All'}</td>
                            <td>${member.isActive !== false ? '✅ Active' : '❌ Inactive'}</td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="removeTeamMember('${member.id}')">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ============================================
// RENDER TENANTS
// ============================================

function renderTenants() {
    const container = document.getElementById('tenants-container');
    
    if (!currentUserProfile?.isSuperAdmin) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#6c757d;">🔒 Only Super Admin can manage tenants</div>';
        return;
    }
    
    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
            <h3 style="color:#2a5c3e;">🏢 Tenants (${allTenants.length})</h3>
            <button class="btn btn-primary" onclick="openTenantModal()">+ Create Tenant</button>
        </div>
        <table>
            <thead>
                <tr><th>Name</th><th>Plan</th><th>Status</th><th>Created</th></tr>
            </thead>
            <tbody>
                ${allTenants.map(t => `
                    <tr>
                        <td><strong>${t.name}</strong></td>
                        <td>${t.plan || 'Free'}</td>
                        <td>${t.status || 'Active'}</td>
                        <td>${t.createdAt ? getTimeAgo(t.createdAt) : '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ============================================
// RENDER SETTINGS
// ============================================

function renderSettings() {
    const container = document.getElementById('settings-container');
    
    if (!currentUserProfile?.role === 'admin' && !currentUserProfile?.isSuperAdmin) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#6c757d;">🔒 Only admin can access settings</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-container">
            <h3 style="color:#2a5c3e;margin-bottom:15px;">⚙️ Platform Settings</h3>
            
            <div class="form-group">
                <label>Lead Statuses</label>
                <input type="text" id="settings-statuses" value="${STATUSES.join(', ')}">
                <small style="color:#6c757d;">Comma separated</small>
            </div>
            
            <div class="form-group">
                <label>Products</label>
                <input type="text" id="settings-products" value="${PRODUCTS.join(', ')}">
                <small style="color:#6c757d;">Comma separated</small>
            </div>
            
            <div class="form-group">
                <label>Lead Sources</label>
                <input type="text" id="settings-sources" value="${SOURCES.join(', ')}">
                <small style="color:#6c757d;">Comma separated</small>
            </div>
            
            <button class="btn btn-primary" onclick="saveSettings()">💾 Save Settings</button>
        </div>
    `;
}

// ============================================
// POPULATE AGENT DROPDOWN
// ============================================

function populateAgentDropdown() {
    const select = document.getElementById('lead-assigned-to');
    if (!select) return;
    
    const agents = allTeamMembers.filter(m => m.role === 'agent' || m.role === 'team_lead');
    
    select.innerHTML = '<option value="">Unassigned</option>' + agents.map(a => 
        `<option value="${a.id}">${a.name || a.email}</option>`
    ).join('');
}

// ============================================
// LEAD MODAL
// ============================================

function openLeadModal() {
    document.getElementById('lead-modal').classList.add('active');
    populateAgentDropdown();
}

function closeLeadModal() {
    document.getElementById('lead-modal').classList.remove('active');
    ['lead-name', 'lead-phone', 'lead-email', 'lead-city', 'lead-notes'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('lead-product').value = '';
    document.getElementById('lead-source').value = '';
    document.getElementById('lead-priority').value = 'Normal';
    document.getElementById('lead-assigned-to').value = '';
}

async function saveLead() {
    const name = document.getElementById('lead-name').value.trim();
    const phone = document.getElementById('lead-phone').value.trim();
    const assignedTo = document.getElementById('lead-assigned-to').value;
    
    if (!name || !phone) {
        showToast('Name and phone are required', 'error');
        return;
    }
    
    const assignedMember = allTeamMembers.find(m => m.id === assignedTo);
    
    const leadData = {
        name, phone,
        email: document.getElementById('lead-email').value.trim(),
        city: document.getElementById('lead-city').value.trim(),
        product: document.getElementById('lead-product').value,
        source: document.getElementById('lead-source').value,
        priority: document.getElementById('lead-priority').value,
        notes: document.getElementById('lead-notes').value.trim(),
        status: 'New',
        tenantId: currentTenantId || null,
        assignedTo: assignedTo || null,
        assignedToName: assignedMember ? (assignedMember.name || assignedMember.email) : null,
        createdBy: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('leads').add(leadData);
        showToast('✅ Lead added successfully');
        closeLeadModal();
        await loadAllData();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// ============================================
// TEAM MODAL
// ============================================

function openTeamModal() {
    document.getElementById('team-modal').classList.add('active');
}

function closeTeamModal() {
    document.getElementById('team-modal').classList.remove('active');
    ['team-name', 'team-email', 'team-password', 'team-phone'].forEach(id => {
        document.getElementById(id).value = '';
    });
}

async function saveTeamMember() {
    const name = document.getElementById('team-name').value.trim();
    const email = document.getElementById('team-email').value.trim();
    const password = document.getElementById('team-password').value;
    const phone = document.getElementById('team-phone').value.trim();
    const role = document.getElementById('team-role').value;
    const team = document.getElementById('team-group').value;
    
    if (!name || !email || !password) {
        showToast('Name, email and password are required', 'error');
        return;
    }
    
    try {
        // Create auth user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const userId = userCredential.user.uid;
        
        // Create Firestore profile
        await db.collection('users').doc(userId).set({
            name, email, phone,
            role, team,
            tenantId: currentTenantId || null,
            isActive: true,
            isOnline: false,
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('✅ Team member added');
        closeTeamModal();
        await loadAllData();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

async function removeTeamMember(userId) {
    if (!confirm('Remove this team member?')) return;
    
    try {
        await db.collection('users').doc(userId).update({
            isActive: false,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('✅ Member deactivated');
        await loadAllData();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// ============================================
// TENANT MODAL
// ============================================

function openTenantModal() {
    document.getElementById('tenant-modal').classList.add('active');
}

function closeTenantModal() {
    document.getElementById('tenant-modal').classList.remove('active');
    ['tenant-name', 'tenant-admin-email', 'tenant-admin-password'].forEach(id => {
        document.getElementById(id).value = '';
    });
}

async function saveTenant() {
    const name = document.getElementById('tenant-name').value.trim();
    const plan = document.getElementById('tenant-plan').value;
    const adminEmail = document.getElementById('tenant-admin-email').value.trim();
    const adminPassword = document.getElementById('tenant-admin-password').value;
    
    if (!name || !adminEmail || !adminPassword) {
        showToast('Tenant name, admin email and password required', 'error');
        return;
    }
    
    try {
        // Create tenant
        const tenantRef = await db.collection('tenants').add({
            name, plan,
            status: 'Active',
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create tenant admin user
        const userCredential = await auth.createUserWithEmailAndPassword(adminEmail, adminPassword);
        
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name + ' Admin',
            email: adminEmail,
            role: 'admin',
            tenantId: tenantRef.id,
            team: 'All',
            isActive: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('✅ Tenant created successfully');
        closeTenantModal();
        await loadAllData();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// ============================================
// SETTINGS
// ============================================

async function saveSettings() {
    const statuses = document.getElementById('settings-statuses').value.split(',').map(s => s.trim()).filter(Boolean);
    const products = document.getElementById('settings-products').value.split(',').map(s => s.trim()).filter(Boolean);
    const sources = document.getElementById('settings-sources').value.split(',').map(s => s.trim()).filter(Boolean);
    
    try {
        await db.collection('settings').doc('platform').set({
            statuses, products, sources,
            updatedBy: currentUser.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('✅ Settings saved');
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// ============================================
// UPDATE LEAD STATUS
// ============================================

async function updateLeadStatus(leadId, newStatus) {
    try {
        await db.collection('leads').doc(leadId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('✅ Moved to ' + newStatus);
        await loadAllData();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

async function moveLead(leadId, currentStatus) {
    const idx = STATUSES.indexOf(currentStatus);
    const nextStatus = STATUSES[(idx + 1) % STATUSES.length];
    await updateLeadStatus(leadId, nextStatus);
}

// ============================================
// QUICK ACTIONS
// ============================================

function callLead(phone) {
    if (phone) window.location.href = 'tel:+91' + phone.replace(/[^0-9]/g, '');
}

function waLead(phone) {
    if (phone) window.open('https://wa.me/91' + phone.replace(/[^0-9]/g, ''), '_blank');
}

// ============================================
// TAB SWITCHING
// ============================================

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === 'tab-' + tabName);
    });
}

// ============================================
// TOAST
// ============================================

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    toast.onclick = () => toast.remove();
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// MODAL OUTSIDE CLICK
// ============================================

document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        openLeadModal();
    }
});

console.log('✅ Aahar Shudhi Multi-Tenant System Ready');

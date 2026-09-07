/**
 * ============================================================
 * AAHAR SHUDHI - COMPLETE APPLICATION LOGIC
 * ============================================================
 * @description All JavaScript for Lead Management System
 * @version 1.0.0
 * ============================================================
 */

// ============ FIREBASE CONFIG ============
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

// ============ GLOBAL STATE ============
let currentUser = null;
let currentProfile = null;
let tenantId = null;
let allLeads = [];
let allMembers = [];
let allTenants = [];
let allOrders = [];
let allProducts = [];
let allSettings = {
    statuses: ['New', 'Contacted', 'Follow-up', 'Interested', 'Closed'],
    sources: ['Facebook', 'Instagram', 'Google Ads', 'Website', 'WhatsApp', 'Reference', 'Walk-in', 'Other'],
    priorities: ['Normal', 'Hot', 'Warm', 'Cold'],
    couriers: ['Delhivery', 'Blue Dart', 'DTDC', 'India Post', 'Ekart']
};

const ORDER_STATUSES = ['Order Placed', 'Confirmed', 'Packed', 'Dispatched', 'In Transit', 'Out for Delivery', 'Delivered', 'RTO'];

// ============ AUTH STATE ============
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        await loadProfile();
        await loadSettings();
        await loadAll();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('dashboard').style.display = 'none';
    }
});

// ============ LOAD PROFILE ============
async function loadProfile() {
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            currentProfile = { id: doc.id, ...doc.data() };
            tenantId = currentProfile.tenantId || null;
        } else {
            currentProfile = { id: currentUser.uid, email: currentUser.email, name: 'Super Admin', role: 'admin', isSuperAdmin: true };
            await db.collection('users').doc(currentUser.uid).set(currentProfile);
        }
        document.getElementById('tenant-badge').textContent = currentProfile.isSuperAdmin ? '🏢 Super Admin' : '🏢 Tenant';
        document.getElementById('user-info').textContent = '👤 ' + currentUser.email;
    } catch (e) { console.error(e); }
}

// ============ LOAD SETTINGS ============
async function loadSettings() {
    try {
        const doc = await db.collection('settings').doc('platform').get();
        if (doc.exists) allSettings = { ...allSettings, ...doc.data() };
    } catch (e) {}
}

// ============ LOAD ALL DATA ============
async function loadAll() {
    await Promise.all([loadLeads(), loadMembers(), loadTenants(), loadOrders(), loadProducts()]);
    renderMetrics();
    renderKanban();
    renderLeadsTable();
    renderOrdersTable();
    renderProductsTable();
    renderTeamTable();
    renderTenantsTable();
    renderSettings();
    populateDropdowns();
}

async function loadLeads() {
    let q = db.collection('leads').orderBy('createdAt', 'desc').limit(500);
    if (tenantId && !currentProfile.isSuperAdmin) q = q.where('tenantId', '==', tenantId);
    const snap = await q.get();
    allLeads = [];
    snap.forEach(d => allLeads.push({ id: d.id, ...d.data() }));
}

async function loadMembers() {
    let q = db.collection('users');
    if (tenantId && !currentProfile.isSuperAdmin) q = q.where('tenantId', '==', tenantId);
    const snap = await q.get();
    allMembers = [];
    snap.forEach(d => allMembers.push({ id: d.id, ...d.data() }));
}

async function loadTenants() {
    const snap = await db.collection('tenants').get();
    allTenants = [];
    snap.forEach(d => allTenants.push({ id: d.id, ...d.data() }));
}

async function loadOrders() {
    let q = db.collection('orders').orderBy('createdAt', 'desc').limit(500);
    if (tenantId && !currentProfile.isSuperAdmin) q = q.where('tenantId', '==', tenantId);
    const snap = await q.get();
    allOrders = [];
    snap.forEach(d => allOrders.push({ id: d.id, ...d.data() }));
}

async function loadProducts() {
    let q = db.collection('products');
    if (tenantId && !currentProfile.isSuperAdmin) q = q.where('tenantId', '==', tenantId);
    const snap = await q.get();
    allProducts = [];
    snap.forEach(d => allProducts.push({ id: d.id, ...d.data() }));
    if (allProducts.length === 0) {
        const defaults = [
            { name: 'Chyawanprash', category: 'Immunity', price: 599 },
            { name: 'Ashwagandha', category: 'Wellness', price: 499 },
            { name: 'Triphala', category: 'Digestion', price: 299 }
        ];
        for (const p of defaults) {
            await db.collection('products').add({ ...p, tenantId: tenantId || null, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
        await loadProducts();
    }
}

// ============ LOGIN/LOGOUT ============
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const err = document.getElementById('login-error');
    err.style.display = 'none';
    if (!email || !password) {
        err.textContent = 'Email and password required';
        err.style.display = 'block';
        return;
    }
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (e) {
        err.textContent = 'Login failed: ' + e.message;
        err.style.display = 'block';
    }
}

async function handleLogout() { await auth.signOut(); }

// ============ RENDER FUNCTIONS ============
function renderMetrics() {
    const total = allLeads.length;
    const counts = {};
    allSettings.statuses.forEach(s => counts[s] = allLeads.filter(l => l.status === s).length);
    const conv = total > 0 ? ((counts['Closed'] / total) * 100).toFixed(1) : 0;
    const delivered = allOrders.filter(o => o.status === 'Delivered').length;
    const rto = allOrders.filter(o => o.status === 'RTO').length;
    
    const metrics = [
        ['📊', 'Total Leads', total], ['🆕', 'New', counts['New'] || 0],
        ['📞', 'Contacted', counts['Contacted'] || 0], ['⏰', 'Follow-up', counts['Follow-up'] || 0],
        ['💚', 'Interested', counts['Interested'] || 0], ['✅', 'Closed', counts['Closed'] || 0],
        ['📦', 'Orders', allOrders.length], ['🚚', 'Delivered', delivered],
        ['↩️', 'RTO', rto], ['🌿', 'Products', allProducts.length],
        ['👥', 'Team', allMembers.length], ['🏢', 'Tenants', allTenants.length],
        ['🎯', 'Conv%', conv + '%']
    ];
    
    document.getElementById('metrics-bar').innerHTML = metrics.map(([icon, label, value]) => `
        <div class="metric-card">
            <div style="font-size:1.5rem">${icon}</div>
            <div class="metric-value">${value}</div>
            <div class="metric-label">${label}</div>
        </div>
    `).join('');
}

function renderKanban() {
    const board = document.getElementById('kanban-board');
    board.innerHTML = '';
    const colors = { 'New': '#fff3cd', 'Contacted': '#d1ecf1', 'Follow-up': '#e7d9ff', 'Interested': '#d4edda', 'Closed': '#d6d8db' };
    
    allSettings.statuses.forEach(status => {
        const leads = allLeads.filter(l => l.status === status);
        const col = document.createElement('div');
        col.className = 'kanban-column';
        col.style.background = colors[status] || '#e9ecef';
        col.innerHTML = `
            <div class="kanban-column-header"><span>${status}</span><span class="kanban-count">${leads.length}</span></div>
            <div class="kanban-cards" data-status="${status}">
                ${leads.map(l => `
                    <div class="lead-card" draggable="true" data-id="${l.id}">
                        <div class="lead-card-header">
                            <div class="lead-card-identity">
                                <div class="lead-card-avatar">${(l.name || '?')[0]}</div>
                                <span class="lead-card-name">${l.name}</span>
                            </div>
                            <span class="lead-card-time">${l.createdAt ? getTimeAgo(l.createdAt) : ''}</span>
                        </div>
                        <div class="lead-card-info"><p>📞 ${l.phone}</p>${l.assignedToName ? `<p>👤 ${l.assignedToName}</p>` : ''}</div>
                        <div class="lead-card-tags">
                            ${l.product ? `<span class="lead-tag tag-product">🌿 ${l.product}</span>` : ''}
                            ${l.priority === 'Hot' ? '<span class="lead-tag tag-hot">🔥 Hot</span>' : ''}
                        </div>
                        <div class="lead-card-actions">
                            <button class="btn-call" onclick="event.stopPropagation();callLead('${l.phone}')">📞</button>
                            <button class="btn-wa" onclick="event.stopPropagation();waLead('${l.phone}')">💬</button>
                            <button class="btn-move" onclick="event.stopPropagation();moveLead('${l.id}','${l.status}')">➡️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        board.appendChild(col);
    });
    
    // Drag & Drop
    document.querySelectorAll('.lead-card').forEach(c => {
        c.addEventListener('dragstart', e => e.dataTransfer.setData('leadId', c.dataset.id));
    });
    document.querySelectorAll('.kanban-cards').forEach(z => {
        z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('drag-over'); });
        z.addEventListener('dragleave', () => z.classList.remove('drag-over'));
        z.addEventListener('drop', async e => {
            e.preventDefault();
            z.classList.remove('drag-over');
            const leadId = e.dataTransfer.getData('leadId');
            const status = z.dataset.status;
            await db.collection('leads').doc(leadId).update({ status, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            showToast('✅ Moved to ' + status);
            loadAll();
        });
    });
}

function renderLeadsTable() {
    const c = document.getElementById('leads-table');
    if (!allLeads.length) {
        c.innerHTML = '<div class="empty-state"><span class="empty-icon">📭</span><h3>No Leads</h3></div>';
        return;
    }
    const colors = { 'New': '#fff3cd', 'Contacted': '#d1ecf1', 'Follow-up': '#e7d9ff', 'Interested': '#d4edda', 'Closed': '#d6d8db' };
    c.innerHTML = `<table><thead><tr><th>Name</th><th>Phone</th><th>Product</th><th>Status</th><th>Priority</th><th>Assigned</th><th>Created</th><th>Actions</th></tr></thead>
    <tbody>${allLeads.map(l => `<tr>
        <td><strong>${l.name}</strong></td><td>${l.phone}</td><td>${l.product || '-'}</td>
        <td><span class="status-badge" style="background:${colors[l.status] || '#e9ecef'}">${l.status}</span></td>
        <td>${l.priority || 'Normal'}</td><td>${l.assignedToName || 'Unassigned'}</td>
        <td>${l.createdAt ? getTimeAgo(l.createdAt) : '-'}</td>
        <td>
            <button style="background:#e3f0e5;border:none;padding:4px 8px;border-radius:12px;cursor:pointer" onclick="callLead('${l.phone}')">📞</button>
            <button style="background:#d4edda;border:none;padding:4px 8px;border-radius:12px;cursor:pointer" onclick="waLead('${l.phone}')">💬</button>
            <button style="background:#f8d7da;border:none;padding:4px 8px;border-radius:12px;cursor:pointer" onclick="deleteLead('${l.id}')">🗑️</button>
        </td>
    </tr>`).join('')}</tbody></table>`;
}

function renderOrdersTable() {
    const c = document.getElementById('orders-table');
    if (!allOrders.length) {
        c.innerHTML = '<div class="empty-state"><span class="empty-icon">📦</span><h3>No Orders</h3></div>';
        return;
    }
    const colors = { 'Order Placed': '#fff3cd', 'Confirmed': '#d1ecf1', 'Packed': '#e7d9ff', 'Dispatched': '#fff3cd', 'In Transit': '#d1ecf1', 'Out for Delivery': '#cce5ff', 'Delivered': '#d4edda', 'RTO': '#f8d7da' };
    c.innerHTML = `<table><thead><tr><th>Order ID</th><th>Lead</th><th>Product</th><th>Qty</th><th>Amount</th><th>Status</th><th>Courier</th><th>AWB</th><th>Address</th><th>Actions</th></tr></thead>
    <tbody>${allOrders.map(o => `<tr>
        <td><strong>${o.orderId || o.id.substring(0, 8)}</strong></td>
        <td>${o.leadName || '-'}</td><td>${o.product}</td><td>${o.qty}</td><td>₹${o.amount}</td>
        <td><span class="status-badge" style="background:${colors[o.status] || '#e9ecef'}">${o.status}</span></td>
        <td>${o.courier || '-'}</td><td>${o.awb || '-'}</td><td>${o.city || ''} ${o.pincode || ''}</td>
        <td>
            <button style="background:var(--info-bg);border:none;padding:4px 8px;border-radius:12px;cursor:pointer" onclick="advanceOrder('${o.id}','${o.status}')">➡️</button>
            <button style="background:var(--danger-bg);border:none;padding:4px 8px;border-radius:12px;cursor:pointer" onclick="markRTO('${o.id}')">↩️</button>
        </td>
    </tr>`).join('')}</tbody></table>`;
}

function renderProductsTable() {
    const c = document.getElementById('products-table');
    c.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:15px">
        <h3 style="color:var(--primary)">🌿 Products (${allProducts.length})</h3>
        <button class="btn btn-primary btn-sm" onclick="openProductModal()">+ Add</button></div>
    <table><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Actions</th></tr></thead>
    <tbody>${allProducts.map(p => `<tr>
        <td><strong>${p.name}</strong></td><td>${p.category || '-'}</td><td>₹${p.price || 0}</td>
        <td><button style="background:var(--danger-bg);border:none;padding:4px 8px;border-radius:12px;cursor:pointer" onclick="deleteProduct('${p.id}')">🗑️</button></td>
    </tr>`).join('')}</tbody></table>`;
}

function renderTeamTable() {
    const c = document.getElementById('team-table');
    if (!allMembers.length) {
        c.innerHTML = '<div class="empty-state"><span class="empty-icon">👥</span><h3>No Members</h3></div>';
        return;
    }
    c.innerHTML = `<table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Team</th><th>Actions</th></tr></thead>
    <tbody>${allMembers.map(m => `<tr>
        <td><strong>${m.name || 'N/A'}</strong></td><td>${m.email}</td><td>${m.role}</td><td>${m.team || 'All'}</td>
        <td><button style="background:var(--danger-bg);border:none;padding:4px 8px;border-radius:12px;cursor:pointer" onclick="removeMember('${m.id}')">🗑️</button></td>
    </tr>`).join('')}</tbody></table>`;
}

function renderTenantsTable() {
    const c = document.getElementById('tenants-table');
    if (!allTenants.length) {
        c.innerHTML = '<div class="empty-state"><span class="empty-icon">🏢</span><h3>No Tenants</h3></div>';
        return;
    }
    c.innerHTML = `<table><thead><tr><th>Name</th><th>Plan</th><th>Created</th></tr></thead>
    <tbody>${allTenants.map(t => `<tr>
        <td><strong>${t.name}</strong></td><td>${t.plan || 'Free'}</td><td>${t.createdAt ? getTimeAgo(t.createdAt) : '-'}</td>
    </tr>`).join('')}</tbody></table>`;
}

function renderSettings() {
    document.getElementById('settings-statuses').value = allSettings.statuses.join(', ');
    document.getElementById('settings-sources').value = allSettings.sources.join(', ');
    document.getElementById('settings-priorities').value = allSettings.priorities.join(', ');
    document.getElementById('settings-couriers').value = allSettings.couriers.join(', ');
}

// ============ HELPERS ============
function getTimeAgo(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    return Math.floor(s / 86400) + 'd';
}

function populateDropdowns() {
    document.getElementById('lead-product').innerHTML = '<option value="">Select</option>' + allProducts.map(p => `<option>${p.name}</option>`).join('');
    document.getElementById('lead-source').innerHTML = '<option value="">Select</option>' + allSettings.sources.map(s => `<option>${s}</option>`).join('');
    document.getElementById('lead-priority').innerHTML = '<option value="">Select</option>' + allSettings.priorities.map(p => `<option>${p}</option>`).join('');
    document.getElementById('lead-assign').innerHTML = '<option value="">Unassigned</option>' + allMembers.filter(m => m.role !== 'admin').map(a => `<option value="${a.id}">${a.name || a.email}</option>`).join('');
    document.getElementById('order-lead').innerHTML = '<option value="">Select Lead</option>' + allLeads.map(l => `<option value="${l.id}">${l.name} - ${l.phone}</option>`).join('');
    document.getElementById('order-product').innerHTML = '<option value="">Select</option>' + allProducts.map(p => `<option>${p.name}</option>`).join('');
    document.getElementById('order-courier').innerHTML = '<option value="">Select</option>' + allSettings.couriers.map(c => `<option>${c}</option>`).join('');
}

// ============ LEAD OPERATIONS ============
function openLeadModal() { document.getElementById('lead-modal').classList.add('active'); populateDropdowns(); }
function closeLeadModal() { document.getElementById('lead-modal').classList.remove('active'); }

async function saveLead() {
    const name = document.getElementById('lead-name').value.trim();
    const phone = document.getElementById('lead-phone').value.trim();
    if (!name || !phone) { showToast('Name and phone required', 'error'); return; }
    const assignId = document.getElementById('lead-assign').value;
    const member = allMembers.find(m => m.id === assignId);
    await db.collection('leads').add({
        name, phone,
        email: document.getElementById('lead-email').value.trim(),
        city: document.getElementById('lead-city').value.trim(),
        product: document.getElementById('lead-product').value,
        source: document.getElementById('lead-source').value,
        priority: document.getElementById('lead-priority').value,
        notes: document.getElementById('lead-notes').value.trim(),
        status: 'New', tenantId,
        assignedTo: assignId || null,
        assignedToName: member ? (member.name || member.email) : null,
        createdBy: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('✅ Lead added');
    closeLeadModal();
    loadAll();
}

async function deleteLead(id) {
    if (!confirm('Delete?')) return;
    await db.collection('leads').doc(id).delete();
    showToast('✅ Deleted');
    loadAll();
}

async function moveLead(id, current) {
    const idx = allSettings.statuses.indexOf(current);
    const next = allSettings.statuses[(idx + 1) % allSettings.statuses.length];
    await db.collection('leads').doc(id).update({ status: next, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    showToast('✅ ' + next);
    loadAll();
}

// ============ ORDER OPERATIONS ============
function openOrderModal() { document.getElementById('order-modal').classList.add('active'); populateDropdowns(); }
function closeOrderModal() { document.getElementById('order-modal').classList.remove('active'); }

async function saveOrder() {
    const leadId = document.getElementById('order-lead').value;
    const product = document.getElementById('order-product').value;
    const qty = document.getElementById('order-qty').value;
    const amount = document.getElementById('order-amount').value;
    const payment = document.getElementById('order-payment').value;
    const address1 = document.getElementById('order-address1').value.trim();
    const address2 = document.getElementById('order-address2').value.trim();
    const city = document.getElementById('order-city').value.trim();
    const state = document.getElementById('order-state').value.trim();
    const pincode = document.getElementById('order-pincode').value.trim();
    const landmark = document.getElementById('order-landmark').value.trim();
    const courier = document.getElementById('order-courier').value;
    const warehouse = document.getElementById('order-warehouse').value;
    
    if (!leadId || !product || !qty || !amount || !address1 || !city || !state || !pincode) {
        showToast('All required fields needed', 'error');
        return;
    }
    
    const lead = allLeads.find(l => l.id === leadId);
    const awb = courier ? courier.substring(0, 2).toUpperCase() + Date.now().toString().slice(-10) : null;
    
    await db.collection('orders').add({
        orderId: 'ORD-' + Date.now().toString().slice(-6),
        leadId, leadName: lead?.name, leadPhone: lead?.phone,
        product, qty: parseInt(qty), amount: parseFloat(amount),
        paymentMethod: payment, address1, address2, city, state, pincode, landmark,
        courier, warehouse, awb, status: 'Order Placed', tenantId,
        createdBy: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        timeline: [{ status: 'Order Placed', at: new Date().toISOString() }]
    });
    
    if (leadId) await db.collection('leads').doc(leadId).update({ status: 'Interested', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    
    showToast('✅ Order created');
    closeOrderModal();
    loadAll();
}

async function advanceOrder(id, current) {
    const idx = ORDER_STATUSES.indexOf(current);
    if (idx === -1 || idx === ORDER_STATUSES.length - 1) return;
    const next = ORDER_STATUSES[idx + 1];
    await db.collection('orders').doc(id).update({
        status: next,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        timeline: firebase.firestore.FieldValue.arrayUnion({ status: next, at: new Date().toISOString() })
    });
    showToast('✅ ' + next);
    loadAll();
}

async function markRTO(id) {
    if (!confirm('Mark RTO?')) return;
    await db.collection('orders').doc(id).update({
        status: 'RTO',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        timeline: firebase.firestore.FieldValue.arrayUnion({ status: 'RTO', at: new Date().toISOString() })
    });
    showToast('↩️ RTO');
    loadAll();
}

// ============ PRODUCT OPERATIONS ============
function openProductModal() { document.getElementById('product-modal').classList.add('active'); }
function closeProductModal() { document.getElementById('product-modal').classList.remove('active'); }

async function saveProduct() {
    const name = document.getElementById('product-name').value.trim();
    if (!name) { showToast('Name required', 'error'); return; }
    await db.collection('products').add({
        name,
        category: document.getElementById('product-category').value.trim(),
        price: parseFloat(document.getElementById('product-price').value) || 0,
        description: document.getElementById('product-desc').value.trim(),
        tenantId: tenantId || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('✅ Product added');
    closeProductModal();
    loadAll();
}

async function deleteProduct(id) {
    if (!confirm('Delete?')) return;
    await db.collection('products').doc(id).delete();
    showToast('✅ Deleted');
    loadAll();
}

// ============ TEAM OPERATIONS ============
function openTeamModal() { document.getElementById('team-modal').classList.add('active'); }
function closeTeamModal() { document.getElementById('team-modal').classList.remove('active'); }

async function saveTeamMember() {
    const name = document.getElementById('team-name').value.trim();
    const email = document.getElementById('team-email').value.trim();
    const password = document.getElementById('team-password').value;
    if (!name || !email || !password) { showToast('All fields required', 'error'); return; }
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(cred.user.uid).set({
            name, email,
            role: document.getElementById('team-role').value,
            team: document.getElementById('team-group').value,
            tenantId, isActive: true,
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('✅ Member added');
        closeTeamModal();
        loadAll();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function removeMember(id) {
    if (!confirm('Remove?')) return;
    await db.collection('users').doc(id).update({ isActive: false });
    showToast('✅ Deactivated');
    loadAll();
}

// ============ TENANT OPERATIONS ============
function openTenantModal() { document.getElementById('tenant-modal').classList.add('active'); }
function closeTenantModal() { document.getElementById('tenant-modal').classList.remove('active'); }

async function saveTenant() {
    const name = document.getElementById('tenant-name').value.trim();
    const email = document.getElementById('tenant-email').value.trim();
    const password = document.getElementById('tenant-password').value;
    if (!name || !email || !password) { showToast('All fields required', 'error'); return; }
    try {
        const tenantRef = await db.collection('tenants').add({
            name, plan: 'Free', status: 'Active',
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(cred.user.uid).set({
            name: name + ' Admin', email, role: 'admin', tenantId: tenantRef.id,
            isActive: true, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('✅ Tenant created');
        closeTenantModal();
        loadAll();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ============ SETTINGS ============
async function saveSettings() {
    const statuses = document.getElementById('settings-statuses').value.split(',').map(s => s.trim()).filter(Boolean);
    const sources = document.getElementById('settings-sources').value.split(',').map(s => s.trim()).filter(Boolean);
    const priorities = document.getElementById('settings-priorities').value.split(',').map(s => s.trim()).filter(Boolean);
    const couriers = document.getElementById('settings-couriers').value.split(',').map(s => s.trim()).filter(Boolean);
    
    await db.collection('settings').doc('platform').set({
        statuses, sources, priorities, couriers,
        updatedBy: currentUser.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    allSettings = { statuses, sources, priorities, couriers };
    showToast('✅ Settings saved');
    loadAll();
}

// ============ QUICK ACTIONS ============
function callLead(phone) { if (phone) window.location.href = 'tel:+91' + phone.replace(/[^0-9]/g, ''); }
function waLead(phone) { if (phone) window.open('https://wa.me/91' + phone.replace(/[^0-9]/g, ''), '_blank'); }

// ============ TAB SWITCH ============
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tab));
}

// ============ TOAST ============
function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = msg;
    toast.onclick = () => toast.remove();
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity .3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============ MODAL OUTSIDE CLICK ============
document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => {
        if (e.target === m) m.classList.remove('active');
    });
});

console.log('✅ Aahar Shudhi System Loaded');
console.log('📋 Features: Multi-Tenant, Kanban, Orders, Products, Team, Settings');

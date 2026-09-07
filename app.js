const fc={apiKey:"AIzaSyBZDaHJSt-4AV6EJYG76p8kcsIHf6LOxdU",authDomain:"avatar-wa-dual-crm.firebaseapp.com",projectId:"avatar-wa-dual-crm",storageBucket:"avatar-wa-dual-crm.firebasestorage.app",messagingSenderId:"946959261009",appId:"1:946959261009:web:3ae08845917ac8cff8c770"};
firebase.initializeApp(fc);
const db=firebase.firestore();
const auth=firebase.auth();

let cu=null,cp=null,tid=null;
let allL=[],allM=[],allT=[],allO=[],allP=[];
let allS={st:['New','Contacted','Follow-up','Interested','Closed'],so:['Facebook','Instagram','Website','Reference','Other'],pr:['Normal','Hot','Warm','Cold'],co:['Delhivery','Blue Dart','DTDC','India Post','Ekart']};
const OS=['Order Placed','Confirmed','Packed','Dispatched','In Transit','Out for Delivery','Delivered','RTO'];
const SCOL={'New':'#fff3cd','Contacted':'#d1ecf1','Follow-up':'#e7d9ff','Interested':'#d4edda','Closed':'#d6d8db'};

auth.onAuthStateChanged(async u=>{
    if(u){
        cu=u;
        document.getElementById('ls').style.display='none';
        document.getElementById('db').style.display='block';
        await loadProfile();
        await loadSettings();
        await loadAll();
    }else{
        document.getElementById('ls').style.display='flex';
        document.getElementById('db').style.display='none';
    }
});

async function loadProfile(){
    try{
        const d=await db.collection('users').doc(cu.uid).get();
        if(d.exists){cp={id:d.id,...d.data()};tid=cp.tenantId||null;}
        else{cp={id:cu.uid,email:cu.email,name:'Super Admin',role:'admin',isSuperAdmin:true};await db.collection('users').doc(cu.uid).set(cp);}
        document.getElementById('tenant-badge').textContent=cp.isSuperAdmin?'| Super Admin':(tid?'| Tenant':'| No Tenant');
    }catch(e){}
}

async function loadSettings(){
    try{const d=await db.collection('settings').doc('platform').get();if(d.exists)allS={...allS,...d.data()};}catch(e){}
}

async function loadAll(){await Promise.all([loadL(),loadM(),loadT(),loadO(),loadP()]);renderAll();}

async function loadL(){let q=db.collection('leads').orderBy('createdAt','desc').limit(500);if(tid&&!cp.isSuperAdmin)q=q.where('tenantId','==',tid);const s=await q.get();allL=[];s.forEach(d=>allL.push({id:d.id,...d.data()}));}
async function loadM(){let q=db.collection('users');if(tid&&!cp.isSuperAdmin)q=q.where('tenantId','==',tid);const s=await q.get();allM=[];s.forEach(d=>allM.push({id:d.id,...d.data()}));}
async function loadT(){const s=await db.collection('tenants').get();allT=[];s.forEach(d=>allT.push({id:d.id,...d.data()}));}
async function loadO(){let q=db.collection('orders').orderBy('createdAt','desc').limit(500);if(tid&&!cp.isSuperAdmin)q=q.where('tenantId','==',tid);const s=await q.get();allO=[];s.forEach(d=>allO.push({id:d.id,...d.data()}));}
async function loadP(){let q=db.collection('products');if(tid&&!cp.isSuperAdmin)q=q.where('tenantId','==',tid);const s=await q.get();allP=[];s.forEach(d=>allP.push({id:d.id,...d.data()}));if(allP.length===0){const def=[{name:'Chyawanprash',category:'Immunity',price:599},{name:'Ashwagandha',category:'Wellness',price:499},{name:'Triphala',category:'Digestion',price:299}];for(const p of def)await db.collection('products').add({...p,tenantId:tid||null,createdAt:firebase.firestore.FieldValue.serverTimestamp()});await loadP();}}

function renderAll(){renderMetrics();renderKanban();renderLeads();renderOrders();renderProducts();renderTeam();renderTenants();renderSettings();populateDD();}

function renderMetrics(){
    const tot=allL.length;const c={};allS.st.forEach(s=>c[s]=allL.filter(l=>l.status===s).length);
    const conv=tot>0?((c['Closed']/tot)*100).toFixed(1):0;
    const del=allO.filter(o=>o.status==='Delivered').length;
    const rto=allO.filter(o=>o.status==='RTO').length;
    const rev=allO.reduce((s,o)=>s+(parseFloat(o.amount)||0),0);
    const m=[['📊','Leads',tot],['🆕','New',c['New']||0],['📞','Contacted',c['Contacted']||0],['⏰','Follow-up',c['Follow-up']||0],['💚','Interested',c['Interested']||0],['✅','Closed',c['Closed']||0],['📦','Orders',allO.length],['💰','Revenue','₹'+fmt(rev)],['🚚','Delivered',del],['↩️','RTO',rto],['🌿','Products',allP.length],['👥','Team',allM.length],['🏢','Tenants',allT.length],['🎯','Conv%',conv+'%']];
    document.getElementById('metrics').innerHTML=m.map(([i,l,v])=>`<div class="mc"><div style="font-size:1.3rem">${i}</div><div class="mv">${v}</div><div class="ml">${l}</div></div>`).join('');
    document.getElementById('dash-extra').innerHTML=`<div class="tbl"><h3>🆕 Recent Leads</h3>${allL.slice(0,5).map(l=>`<p>${l.name} - ${l.phone} <span style="background:${SCOL[l.status]};padding:2px 8px;border-radius:10px;font-size:.65rem">${l.status}</span></p>`).join('')||'<p>No leads</p>'}</div><div class="tbl"><h3>📦 Recent Orders</h3>${allO.slice(0,5).map(o=>`<p>${o.orderId||o.id.substring(0,8)} - ${o.leadName} - ₹${o.amount}</p>`).join('')||'<p>No orders</p>'}</div>`;
}

function renderKanban(){
    const b=document.getElementById('kanban');b.innerHTML='';
    allS.st.forEach(st=>{
        const ls=allL.filter(l=>l.status===st);
        const col=document.createElement('div');col.className='kc';col.style.background=SCOL[st]||'#e9ecef';
        col.innerHTML=`<div class="kch"><span>${st}</span><span class="kcnt">${ls.length}</span></div><div class="kcs" data-status="${st}">${ls.map(l=>`<div class="lc" draggable="true" data-id="${l.id}"><h4>${l.name}</h4><p>📞 ${l.phone}</p>${l.assignedToName?`<p>👤 ${l.assignedToName}</p>`:''}<div class="lca"><button class="bc" onclick="event.stopPropagation();callLead('${l.phone}')">📞</button><button class="bw" onclick="event.stopPropagation();waLead('${l.phone}')">💬</button><button class="bm" onclick="event.stopPropagation();moveLead('${l.id}','${l.status}')">➡️</button></div></div>`).join('')}</div>`;
        b.appendChild(col);
    });
    document.querySelectorAll('.lc').forEach(c=>c.addEventListener('dragstart',e=>e.dataTransfer.setData('id',c.dataset.id)));
    document.querySelectorAll('.kcs').forEach(z=>{
        z.addEventListener('dragover',e=>e.preventDefault());
        z.addEventListener('drop',async e=>{e.preventDefault();const id=e.dataTransfer.getData('id');const st=z.dataset.status;await db.collection('leads').doc(id).update({status:st,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});toast('✅ Moved to '+st);loadAll();});
    });
}

function renderLeads(){const c=document.getElementById('leads-tbl');if(!allL.length){c.innerHTML='<div style="padding:40px;text-align:center;color:var(--m)">📭 No leads</div>';return;}c.innerHTML=`<table><thead><tr><th>Name</th><th>Phone</th><th>Product</th><th>Status</th><th>Priority</th><th>Assigned</th><th>Actions</th></tr></thead><tbody>${allL.map(l=>`<tr><td><strong>${l.name}</strong></td><td>${l.phone}</td><td>${l.product||'-'}</td><td><span style="padding:3px 10px;border-radius:12px;background:${SCOL[l.status]};font-size:.7rem">${l.status}</span></td><td>${l.priority||'Normal'}</td><td>${l.assignedToName||'-'}</td><td><button style="background:#e3f0e5;border:none;padding:4px 8px;border-radius:12px;cursor:pointer" onclick="callLead('${l.phone}')">📞</button> <button style="background:#d4edda;border:none;padding:4px 8px;border-radius:12px;cursor:pointer" onclick="waLead('${l.phone}')">💬</button> <button style="background:#f8d7da;border:none;padding:4px 8px;border-radius:12px;cursor:pointer" onclick="delLead('${l.id}')">🗑️</button></td></tr>`).join('')}</tbody></table>`;}

function renderOrders(){const c=document.getElementById('orders-tbl');if(!allO.length){c.innerHTML='<div style="padding:40px;text-align:center;color:var(--m)">📦 No orders</div>';return;}const cols={'Order Placed':'#fff3cd','Confirmed':'#d1ecf1','Packed':'#e7d9ff','Dispatched':'#fff3cd','In Transit':'#d1ecf1','Out for Delivery':'#cce5ff','Delivered':'#d4edda','RTO':'#f8d7da'};c.innerHTML=`<table><thead><tr><th>Order ID</th><th>Lead</th><th>Product</th><th>Qty</th><th>Amount</th><th>Status</th><th>Courier</th><th>AWB</th><th>Actions</th></tr></thead><tbody>${allO.map(o=>`<tr><td><strong>${o.orderId||o.id.substring(0,8)}</strong></td><td>${o.leadName||'-'}</td><td>${o.product}</td><td>${o.qty}</td><td>₹${o.amount}</td><td><span style="padding:3px 10px;border-radius:12px;background:${cols[o.status]||'#e9ecef'};font-size:.7rem">${o.status}</span></td><td>${o.courier||'-'}</td><td>${o.awb||'-'}</td><td><button style="background:var(--ib);border:none;padding:4px 8px;border-radius:12px;cursor:pointer" onclick="advOrder('${o.id}','${o.status}')">➡️</button> <button style="background:#f8d7da;border:none;padding:4px 8px;border-radius:12px;cursor:pointer" onclick="rtoOrder('${o.id}')">↩️</button></td></tr>`).join('')}</tbody></table>`;}

function renderProducts(){const c=document.getElementById('products-tbl');c.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:10px"><h3>🌿 Products (${allP.length})</h3></div><table><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Actions</th></tr></thead><tbody>${allP.map(p=>`<tr><td><strong>${p.name}</strong></td><td>${p.category||'-'}</td><td>₹${p.price||0}</td><td><button style="background:#f8d7da;border:none;padding:4px 8px;border-radius:12px;cursor:pointer" onclick="delProd('${p.id}')">🗑️</button></td></tr>`).join('')}</tbody></table>`;}

function renderTeam(){const c=document.getElementById('team-tbl');if(!allM.length){c.innerHTML='<div style="padding:40px;text-align:center;color:var(--m)">👥 No members</div>';return;}c.innerHTML=`<table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Team</th><th>Actions</th></tr></thead><tbody>${allM.map(m=>`<tr><td><strong>${m.name||'N/A'}</strong></td><td>${m.email}</td><td>${m.role}</td><td>${m.team||'All'}</td><td><button style="background:#f8d7da;border:none;padding:4px 8px;border-radius:12px;cursor:pointer" onclick="delMember('${m.id}')">🗑️</button></td></tr>`).join('')}</tbody></table>`;}

function renderTenants(){const c=document.getElementById('tenants-tbl');if(!allT.length){c.innerHTML='<div style="padding:40px;text-align:center;color:var(--m)">🏢 No tenants</div>';return;}c.innerHTML=`<table><thead><tr><th>Name</th><th>Plan</th><th>Created</th></tr></thead><tbody>${allT.map(t=>`<tr><td><strong>${t.name}</strong></td><td>${t.plan||'Free'}</td><td>${t.createdAt?getTA(t.createdAt):'-'}</td></tr>`).join('')}</tbody></table>`;}

function renderSettings(){const c=document.getElementById('settings-body');c.innerHTML=`<h3>⚙️ Platform Settings</h3><div class="fg"><label>Statuses</label><textarea id="s-st" rows="3">${allS.st.join(', ')}</textarea></div><div class="fg"><label>Sources</label><textarea id="s-so" rows="3">${allS.so.join(', ')}</textarea></div><div class="fg"><label>Priorities</label><textarea id="s-pr" rows="3">${allS.pr.join(', ')}</textarea></div><div class="fg"><label>Couriers</label><textarea id="s-co" rows="3">${allS.co.join(', ')}</textarea></div><button class="btn bp" onclick="saveSettings()">💾 Save Settings</button>`;}

function populateDD(){
    document.getElementById('f-lead-product').innerHTML='<option value="">Select</option>'+allP.map(p=>`<option>${p.name}</option>`).join('');
    document.getElementById('f-lead-source').innerHTML='<option value="">Select</option>'+allS.so.map(s=>`<option>${s}</option>`).join('');
    document.getElementById('f-lead-priority').innerHTML='<option value="">Select</option>'+allS.pr.map(p=>`<option>${p}</option>`).join('');
    document.getElementById('f-lead-assign').innerHTML='<option value="">Unassigned</option>'+allM.filter(m=>m.role!=='admin').map(a=>`<option value="${a.id}">${a.name||a.email}</option>`).join('');
    document.getElementById('f-order-lead').innerHTML='<option value="">Select</option>'+allL.map(l=>`<option value="${l.id}">${l.name}-${l.phone}</option>`).join('');
    document.getElementById('f-order-product').innerHTML='<option value="">Select</option>'+allP.map(p=>`<option>${p.name}</option>`).join('');
    document.getElementById('f-order-courier').innerHTML='<option value="">Select</option>'+allS.co.map(c=>`<option>${c}</option>`).join('');
}

async function login(){const e=document.getElementById('le-mail').value.trim(),p=document.getElementById('le-pass').value,er=document.getElementById('le');er.style.display='none';if(!e||!p){er.textContent='Email and password required';er.style.display='block';return;}try{await auth.signInWithEmailAndPassword(e,p);}catch(x){er.textContent='Login failed: '+x.message;er.style.display='block';}}
async function logout(){await auth.signOut();}

function st(t){document.querySelectorAll('.tb').forEach(b=>b.classList.toggle('active',b.dataset.t===t));document.querySelectorAll('.tc').forEach(c=>c.classList.toggle('active',c.id==='t-'+t));}
function openModal(id){document.getElementById(id).classList.add('active');populateDD();}
function closeModal(id){document.getElementById(id).classList.remove('active');}
function toast(m,type='success'){const c=document.getElementById('tc2');const t=document.createElement('div');t.className='toast '+(type==='error'?'te':'ts');t.textContent=m;t.onclick=()=>t.remove();c.appendChild(t);setTimeout(()=>t.remove(),3000);}
function getTA(ts){if(!ts)return'';const d=ts.toDate?ts.toDate():new Date(ts);const s=Math.floor((Date.now()-d.getTime())/1000);if(s<60)return'Just now';if(s<3600)return Math.floor(s/60)+'m';if(s<86400)return Math.floor(s/3600)+'h';return Math.floor(s/86400)+'d';}
function fmt(n){if(n>=100000)return(n/100000).toFixed(1)+'L';if(n>=1000)return(n/1000).toFixed(1)+'K';return n.toString();}
function callLead(p){if(p)window.location.href='tel:+91'+p.replace(/[^0-9]/g,'');}
function waLead(p){if(p)window.open('https://wa.me/91'+p.replace(/[^0-9]/g,''),'_blank');}

async function saveLead(){const n=document.getElementById('f-lead-name').value.trim(),p=document.getElementById('f-lead-phone').value.trim();if(!n||!p){toast('Name and phone required','error');return;}const ai=document.getElementById('f-lead-assign').value,m=allM.find(x=>x.id===ai);await db.collection('leads').add({name:n,phone:p,email:document.getElementById('f-lead-email').value.trim(),city:document.getElementById('f-lead-city').value.trim(),product:document.getElementById('f-lead-product').value,source:document.getElementById('f-lead-source').value,priority:document.getElementById('f-lead-priority').value,notes:document.getElementById('f-lead-notes').value.trim(),status:'New',tenantId:tid,assignedTo:ai||null,assignedToName:m?(m.name||m.email):null,createdBy:cu.uid,createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});toast('✅ Lead added');closeModal('lead-modal');loadAll();}
async function delLead(id){if(!confirm('Delete?'))return;await db.collection('leads').doc(id).delete();toast('✅ Deleted');loadAll();}
async function moveLead(id,cur){const i=allS.st.indexOf(cur),n=allS.st[(i+1)%allS.st.length];await db.collection('leads').doc(id).update({status:n,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});toast('✅ '+n);loadAll();}

async function saveOrder(){const li=document.getElementById('f-order-lead').value,pr=document.getElementById('f-order-product').value,q=document.getElementById('f-order-qty').value,am=document.getElementById('f-order-amount').value,pm=document.getElementById('f-order-payment').value,a1=document.getElementById('f-order-a1').value.trim(),a2=document.getElementById('f-order-a2').value.trim(),ci=document.getElementById('f-order-city').value.trim(),stt=document.getElementById('f-order-state').value.trim(),pin=document.getElementById('f-order-pin').value.trim(),lm=document.getElementById('f-order-landmark').value.trim(),co=document.getElementById('f-order-courier').value,wh=document.getElementById('f-order-wh').value;if(!li||!pr||!q||!am||!a1||!ci||!stt||!pin){toast('All required fields','error');return;}const l=allL.find(x=>x.id===li),awb=co?co.substring(0,2).toUpperCase()+Date.now().toString().slice(-10):null;await db.collection('orders').add({orderId:'ORD-'+Date.now().toString().slice(-6),leadId:li,leadName:l?.name,leadPhone:l?.phone,product:pr,qty:parseInt(q),amount:parseFloat(am),paymentMethod:pm,address1:a1,address2:a2,city:ci,state:stt,pincode:pin,landmark:lm,courier:co,warehouse:wh,awb,status:'Order Placed',tenantId:tid,createdBy:cu.uid,createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp(),timeline:[{status:'Order Placed',at:new Date().toISOString()}]});if(li)await db.collection('leads').doc(li).update({status:'Interested',updatedAt:firebase.firestore.FieldValue.serverTimestamp()});toast('✅ Order created');closeModal('order-modal');loadAll();}
async function advOrder(id,cur){const i=OS.indexOf(cur);if(i===-1||i===OS.length-1)return;const n=OS[i+1];await db.collection('orders').doc(id).update({status:n,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),timeline:firebase.firestore.FieldValue.arrayUnion({status:n,at:new Date().toISOString()})});toast('✅ '+n);loadAll();}
async function rtoOrder(id){if(!confirm('Mark RTO?'))return;await db.collection('orders').doc(id).update({status:'RTO',updatedAt:firebase.firestore.FieldValue.serverTimestamp(),timeline:firebase.firestore.FieldValue.arrayUnion({status:'RTO',at:new Date().toISOString()})});toast('↩️ RTO');loadAll();}

async function saveProduct(){const n=document.getElementById('f-prod-name').value.trim();if(!n){toast('Name required','error');return;}await db.collection('products').add({name:n,category:document.getElementById('f-prod-cat').value.trim(),price:parseFloat(document.getElementById('f-prod-price').value)||0,description:document.getElementById('f-prod-desc').value.trim(),tenantId:tid||null,createdAt:firebase.firestore.FieldValue.serverTimestamp()});toast('✅ Product added');closeModal('product-modal');loadAll();}
async function delProd(id){if(!confirm('Delete?'))return;await db.collection('products').doc(id).delete();toast('✅ Deleted');loadAll();}

async function saveMember(){const n=document.getElementById('f-team-name').value.trim(),e=document.getElementById('f-team-email').value.trim(),p=document.getElementById('f-team-pass').value;if(!n||!e||!p){toast('All fields required','error');return;}try{const c=await auth.createUserWithEmailAndPassword(e,p);await db.collection('users').doc(c.user.uid).set({name:n,email:e,role:document.getElementById('f-team-role').value,team:document.getElementById('f-team-group').value,tenantId:tid,isActive:true,createdBy:cu.uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()});toast('✅ Member added');closeModal('team-modal');loadAll();}catch(x){toast('Error: '+x.message,'error');}}
async function delMember(id){if(!confirm('Remove?'))return;await db.collection('users').doc(id).update({isActive:false});toast('✅ Deactivated');loadAll();}

async function saveTenant(){const n=document.getElementById('f-tenant-name').value.trim(),e=document.getElementById('f-tenant-email').value.trim(),p=document.getElementById('f-tenant-pass').value;if(!n||!e||!p){toast('All fields required','error');return;}try{const tr=await db.collection('tenants').add({name:n,plan:'Free',status:'Active',createdBy:cu.uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()});const c=await auth.createUserWithEmailAndPassword(e,p);await db.collection('users').doc(c.user.uid).set({name:n+' Admin',email:e,role:'admin',tenantId:tr.id,isActive:true,createdAt:firebase.firestore.FieldValue.serverTimestamp()});toast('✅ Tenant created');closeModal('tenant-modal');loadAll();}catch(x){toast('Error: '+x.message,'error');}}

async function saveSettings(){const st=document.getElementById('s-st').value.split(',').map(s=>s.trim()).filter(Boolean),so=document.getElementById('s-so').value.split(',').map(s=>s.trim()).filter(Boolean),pr=document.getElementById('s-pr').value.split(',').map(s=>s.trim()).filter(Boolean),co=document.getElementById('s-co').value.split(',').map(s=>s.trim()).filter(Boolean);await db.collection('settings').doc('platform').set({st,so,pr,co,updatedBy:cu.uid,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});allS={st,so,pr,co};toast('✅ Settings saved');loadAll();}

document.querySelectorAll('.mo').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('active');}));
console.log('✅ System Ready');

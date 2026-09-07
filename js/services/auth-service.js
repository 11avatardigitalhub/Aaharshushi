/**
 * ============================================================
 * AAHAR SHUDHI - AUTH SERVICE (COMPLETE FULL CODE)
 * ============================================================
 * @description Complete authentication service with all methods
 * @version 3.0.0 - Working Version
 * ============================================================
 */

class AuthServiceClass {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.authToken = null;
        this.isAuthenticated = false;
        this.isLoading = true;
        this.initializationError = null;
        this.auth = null;
        this.db = null;
        
        this.listeners = {
            onAuthStateChanged: [],
            onLogin: [],
            onLogout: [],
            onError: [],
            onProfileUpdated: []
        };
        
        this._initialize();
        console.log('✅ Auth Service instance created');
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    async _initialize() {
        try {
            if (typeof FirebaseCore === 'undefined') {
                console.warn('⚠️ FirebaseCore not ready, waiting...');
                setTimeout(() => this._initialize(), 500);
                return;
            }
            
            this.auth = FirebaseCore.getAuth();
            this.db = FirebaseCore.getDb();
            
            if (!this.auth) {
                console.error('❌ Auth not available');
                return;
            }
            
            this._setupAuthStateListener();
            
            console.log('✅ Auth Service initialized');
        } catch (error) {
            this.initializationError = error;
            console.error('❌ Auth Service initialization failed:', error);
        }
    }
    
    // ============================================
    // AUTH STATE LISTENER
    // ============================================
    
    _setupAuthStateListener() {
        if (!this.auth) return;
        
        this.auth.onAuthStateChanged(async (user) => {
            this.isLoading = true;
            
            if (user) {
                this.currentUser = user;
                this.isAuthenticated = true;
                
                await this._loadUserProfile(user.uid);
                
                this._notifyListeners('onAuthStateChanged', user);
                this._notifyListeners('onLogin', user);
            } else {
                this.currentUser = null;
                this.userProfile = null;
                this.authToken = null;
                this.isAuthenticated = false;
                
                this._notifyListeners('onAuthStateChanged', null);
                this._notifyListeners('onLogout', null);
            }
            
            this.isLoading = false;
        });
    }
    
    // ============================================
    // USER PROFILE
    // ============================================
    
    async _loadUserProfile(userId) {
        try {
            if (!this.db) return;
            
            const userDoc = await this.db.collection('users').doc(userId).get();
            
            if (userDoc.exists) {
                this.userProfile = {
                    id: userDoc.id,
                    ...userDoc.data()
                };
            } else {
                this.userProfile = {
                    id: userId,
                    email: this.currentUser?.email || '',
                    name: this.currentUser?.displayName || '',
                    role: 'agent',
                    isActive: true,
                    profileComplete: false
                };
                
                await this.db.collection('users').doc(userId).set(this.userProfile);
            }
            
            console.log('✅ User profile loaded:', this.userProfile.role);
        } catch (error) {
            console.warn('⚠️ Profile loading failed:', error.message);
            this.userProfile = null;
        }
    }
    
    // ============================================
    // LOGIN METHODS
    // ============================================
    
    async loginUser(email, password, rememberMe = true) {
        try {
            if (!this.auth) {
                throw new Error('Auth not initialized');
            }
            
            await this.auth.setPersistence(
                rememberMe 
                    ? firebase.auth.Auth.Persistence.LOCAL 
                    : firebase.auth.Auth.Persistence.SESSION
            );
            
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            
            console.log('✅ Login successful:', userCredential.user.email);
            
            return {
                success: true,
                user: userCredential.user,
                message: 'Login successful'
            };
        } catch (error) {
            console.error('❌ Login failed:', error);
            return {
                success: false,
                message: FirebaseErrorHandler?.authMessage(error.code) || error.message
            };
        }
    }
    
    async loginWithGoogle() {
        try {
            if (!this.auth) throw new Error('Auth not initialized');
            
            const provider = new firebase.auth.GoogleAuthProvider();
            const userCredential = await this.auth.signInWithPopup(provider);
            
            return {
                success: true,
                user: userCredential.user,
                message: 'Google login successful'
            };
        } catch (error) {
            console.error('❌ Google login failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    async registerUser(userData) {
        try {
            if (!this.auth || !this.db) throw new Error('Services not initialized');
            
            const userCredential = await this.auth.createUserWithEmailAndPassword(
                userData.email,
                userData.password
            );
            
            const user = userCredential.user;
            
            const profile = {
                uid: user.uid,
                name: userData.name || '',
                email: userData.email,
                phone: userData.phone || '',
                role: userData.role || 'agent',
                team: userData.team || '',
                region: userData.region || '',
                isActive: true,
                isOnline: true,
                createdAt: FirebaseCore.getServerTimestamp(),
                updatedAt: FirebaseCore.getServerTimestamp(),
                lastLogin: FirebaseCore.getServerTimestamp()
            };
            
            await this.db.collection('users').doc(user.uid).set(profile);
            
            console.log('✅ User registered:', user.email);
            
            return {
                success: true,
                user: user,
                profile: profile,
                message: 'Registration successful'
            };
        } catch (error) {
            console.error('❌ Registration failed:', error);
            return {
                success: false,
                message: FirebaseErrorHandler?.authMessage(error.code) || error.message
            };
        }
    }
    
    // ============================================
    // LOGOUT
    // ============================================
    
    async logoutUser() {
        try {
            if (this.auth) {
                await this.auth.signOut();
            }
            
            console.log('✅ Logout successful');
            
            return {
                success: true,
                message: 'Logout successful'
            };
        } catch (error) {
            console.error('❌ Logout failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // ============================================
    // PASSWORD MANAGEMENT
    // ============================================
    
    async sendPasswordReset(email) {
        try {
            if (!this.auth) throw new Error('Auth not initialized');
            
            await this.auth.sendPasswordResetEmail(email);
            
            return {
                success: true,
                message: 'Password reset email sent'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    async changePassword(currentPassword, newPassword) {
        try {
            const user = this.currentUser;
            
            if (!user) throw new Error('User not authenticated');
            
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPassword);
            
            return {
                success: true,
                message: 'Password changed'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // ============================================
    // PROFILE UPDATE
    // ============================================
    
    async updateProfile(updateData) {
        try {
            const user = this.currentUser;
            if (!user) throw new Error('Not authenticated');
            
            if (updateData.name) {
                await user.updateProfile({ displayName: updateData.name });
            }
            
            await this.db.collection('users').doc(user.uid).update({
                ...updateData,
                updatedAt: FirebaseCore.getServerTimestamp()
            });
            
            await this._loadUserProfile(user.uid);
            
            return {
                success: true,
                profile: this.userProfile
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // ============================================
    // PERMISSION METHODS
    // ============================================
    
    hasPermission(permission) {
        if (!this.userProfile) return false;
        const role = this.userProfile.role || 'agent';
        const permissions = USER_ROLES?.PERMISSIONS?.[role] || {};
        return permissions[permission] === true;
    }
    
    hasRole(roles) {
        if (!this.userProfile) return false;
        const userRole = this.userProfile.role;
        if (Array.isArray(roles)) return roles.includes(userRole);
        return userRole === roles;
    }
    
    isAdmin() { return this.hasRole('admin'); }
    isTeamLead() { return this.hasRole('team_lead'); }
    isAgent() { return this.hasRole('agent'); }
    
    // ============================================
    // GETTER METHODS
    // ============================================
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    getUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }
    
    getUserProfile() {
        return this.userProfile;
    }
    
    getUserRole() {
        return this.userProfile?.role || 'agent';
    }
    
    isAuthenticated() {
        return this.isAuthenticated;
    }
    
    isLoading() {
        return this.isLoading;
    }
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    addEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }
    
    _notifyListeners(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try { callback(data); } catch (error) {
                    console.error(`Listener error:`, error);
                }
            });
        }
    }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

const AuthServiceInstance = new AuthServiceClass();

// ============================================
// GLOBAL EXPORT
// ============================================

window.AuthService = AuthServiceInstance;
window.AuthServiceClass = AuthServiceClass;

// Global helper functions
window.getCurrentUser = () => AuthServiceInstance.getCurrentUser();
window.getCurrentUserId = () => AuthServiceInstance.getUserId();
window.getUserRole = () => AuthServiceInstance.getUserRole();
window.isAdmin = () => AuthServiceInstance.isAdmin();
window.isTeamLead = () => AuthServiceInstance.isTeamLead();
window.isAgent = () => AuthServiceInstance.isAgent();
window.hasPermission = (perm) => AuthServiceInstance.hasPermission(perm);

console.log('✅ Auth Service Loaded');
console.log('📋 Methods available: loginUser, logoutUser, registerUser, getUserId, isAuthenticated, getCurrentUser, getUserProfile');

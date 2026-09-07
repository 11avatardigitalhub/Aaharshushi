/**
 * ============================================================
 * AAHAR SHUDHI - AUTH SERVICE (COMPLETE WITH FIXES)
 * ============================================================
 * @description Authentication service with all methods
 * @version 2.0.0 - Fixed Version
 * ============================================================
 */

class AuthService {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.authToken = null;
        this.isAuthenticated = false;
        this.isLoading = true;
        this.initializationError = null;
        
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
                throw new Error('FirebaseCore not loaded');
            }
            
            this.auth = FirebaseCore.getAuth();
            this.db = FirebaseCore.getDb();
            
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
    // USER PROFILE MANAGEMENT
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
                
                // Create default profile
                await this.db.collection('users').doc(userId).set(this.userProfile);
            }
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
            
            return {
                success: true,
                user: userCredential.user,
                message: 'Login successful'
            };
        } catch (error) {
            console.error('❌ Login failed:', error);
            return {
                success: false,
                message: FirebaseErrorHandler.authMessage(error.code)
            };
        }
    }
    
    async loginWithGoogle() {
        try {
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
                message: FirebaseErrorHandler.authMessage(error.code)
            };
        }
    }
    
    async registerUser(userData) {
        try {
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
                createdAt: FirebaseCore.getServerTimestamp(),
                updatedAt: FirebaseCore.getServerTimestamp()
            };
            
            await this.db.collection('users').doc(user.uid).set(profile);
            
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
                message: FirebaseErrorHandler.authMessage(error.code)
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
            await this.auth.sendPasswordResetEmail(email);
            return {
                success: true,
                message: 'Password reset email sent'
            };
        } catch (error) {
            return {
                success: false,
                message: FirebaseErrorHandler.authMessage(error.code)
            };
        }
    }
    
    async changePassword(currentPassword, newPassword) {
        try {
            const user = this.currentUser;
            
            if (!user) {
                throw new Error('User not authenticated');
            }
            
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPassword);
            
            return {
                success: true,
                message: 'Password changed successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: FirebaseErrorHandler.authMessage(error.code)
            };
        }
    }
    
    // ============================================
    // PROFILE UPDATE
    // ============================================
    
    async updateProfile(updateData) {
        try {
            const user = this.currentUser;
            
            if (!user) {
                throw new Error('User not authenticated');
            }
            
            if (updateData.name) {
                await user.updateProfile({ displayName: updateData.name });
            }
            
            await this.db.collection('users').doc(user.uid).update({
                ...updateData,
                updatedAt: FirebaseCore.getServerTimestamp()
            });
            
            await this._loadUserProfile(user.uid);
            
            this._notifyListeners('onProfileUpdated', this.userProfile);
            
            return {
                success: true,
                profile: this.userProfile,
                message: 'Profile updated'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // ============================================
    // PERMISSION HELPERS
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
        
        if (Array.isArray(roles)) {
            return roles.includes(userRole);
        }
        
        return userRole === roles;
    }
    
    isAdmin() {
        return this.hasRole('admin');
    }
    
    isTeamLead() {
        return this.hasRole('team_lead');
    }
    
    isAgent() {
        return this.hasRole('agent');
    }
    
    // ============================================
    // GETTER METHODS (FIXED)
    // ============================================
    
    /**
     * Get current user
     * @returns {Object|null} Current user
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Get current user ID
     * @returns {string|null} User ID
     */
    getUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }
    
    /**
     * Get user profile
     * @returns {Object|null} User profile
     */
    getUserProfile() {
        return this.userProfile;
    }
    
    /**
     * Get user role
     * @returns {string} User role
     */
    getUserRole() {
        return this.userProfile?.role || 'agent';
    }
    
    /**
     * Check if authenticated (instance method)
     * @returns {boolean} Is authenticated
     */
    isAuthenticated() {
        return this.isAuthenticated;
    }
    
    /**
     * Check if loading
     * @returns {boolean} Is loading
     */
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

const AuthService = new AuthService();

// ============================================
// GLOBAL EXPORT
// ============================================

window.AuthService = AuthService;

// Global helpers
window.getCurrentUser = () => AuthService.getCurrentUser();
window.getCurrentUserId = () => AuthService.getUserId();
window.getUserRole = () => AuthService.getUserRole();
window.isAdmin = () => AuthService.isAdmin();
window.isTeamLead = () => AuthService.isTeamLead();
window.isAgent = () => AuthService.isAgent();
window.hasPermission = (perm) => AuthService.hasPermission(perm);

console.log('✅ Auth Service Loaded');
console.log('📋 Methods: loginUser, logoutUser, registerUser, getUserId, isAuthenticated');

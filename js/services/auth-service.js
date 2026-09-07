/**
 * ============================================================
 * AAHAR SHUDHI - AUTHENTICATION SERVICE
 * ============================================================
 * @description Enterprise-grade authentication system
 * @version 1.0.0
 * @priority HIGHEST - Core Foundation
 * 
 * This service handles:
 * - User registration & login
 * - Email/password authentication
 * - Google OAuth
 * - Session management
 * - Role-based access control
 * - Password reset & recovery
 * - Email verification
 * - User profile management
 * - Activity tracking
 * - Security monitoring
 * - Multi-device session handling
 * ============================================================
 */

class AuthService {
    constructor() {
        // Service state
        this.currentUser = null;
        this.userProfile = null;
        this.authToken = null;
        this.isAuthenticated = false;
        this.isLoading = true;
        this.initializationError = null;
        
        // Session configuration
        this.sessionConfig = {
            timeout: 30 * 60 * 1000, // 30 minutes idle timeout
            maxSessionDuration: 12 * 60 * 60 * 1000, // 12 hours max
            refreshThreshold: 5 * 60 * 1000, // Refresh 5 min before expiry
            deviceLimit: 5 // Max concurrent devices
        };
        
        // Event listeners
        this.listeners = {
            onAuthStateChanged: [],
            onLogin: [],
            onLogout: [],
            onError: [],
            onProfileUpdated: []
        };
        
        // Activity tracking
        this.activityTracker = {
            lastActivity: null,
            idleTimer: null,
            sessionTimer: null
        };
        
        this._initialize();
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    async _initialize() {
        try {
            // Get Firebase Auth instance
            this.auth = FirebaseCore.getAuth();
            this.db = FirebaseCore.getDb();
            
            // Setup auth state listener
            this._setupAuthStateListener();
            
            // Setup activity tracking
            this._setupActivityTracking();
            
            console.log('✅ Auth Service initialized');
        } catch (error) {
            this.initializationError = error;
            console.error('❌ Auth Service initialization failed:', error);
        }
    }
    
    // ============================================
    // AUTH STATE MANAGEMENT
    // ============================================
    
    _setupAuthStateListener() {
        this.auth.onAuthStateChanged(async (user) => {
            this.isLoading = true;
            
            if (user) {
                // User is signed in
                this.currentUser = user;
                this.isAuthenticated = true;
                
                // Get user profile from Firestore
                await this._loadUserProfile(user.uid);
                
                // Get auth token
                this.authToken = await user.getIdToken();
                
                // Notify listeners
                this._notifyListeners('onAuthStateChanged', user);
                this._notifyListeners('onLogin', user);
            } else {
                // User is signed out
                this.currentUser = null;
                this.userProfile = null;
                this.authToken = null;
                this.isAuthenticated = false;
                
                // Notify listeners
                this._notifyListeners('onAuthStateChanged', null);
                this._notifyListeners('onLogout', null);
            }
            
            this.isLoading = false;
        });
    }
    
    // ============================================
    // USER REGISTRATION
    // ============================================
    
    /**
     * Register new user with email and password
     * @param {Object} userData - User registration data
     * @param {string} userData.name - Full name
     * @param {string} userData.email - Email address
     * @param {string} userData.password - Password
     * @param {string} userData.phone - Phone number
     * @param {string} userData.role - User role
     * @param {string} userData.team - Team name
     * @param {string} userData.region - Region name
     * @returns {Promise<Object>} Registration result
     */
    async registerUser(userData) {
        try {
            // Validate input
            this._validateRegistrationData(userData);
            
            // Create auth user
            const userCredential = await this.auth.createUserWithEmailAndPassword(
                userData.email,
                userData.password
            );
            
            const user = userCredential.user;
            
            // Send email verification
            await user.sendEmailVerification();
            
            // Create user profile in Firestore
            const userProfile = {
                uid: user.uid,
                name: userData.name,
                email: userData.email,
                phone: userData.phone || '',
                role: userData.role || 'agent',
                team: userData.team || '',
                region: userData.region || '',
                isEmailVerified: false,
                isActive: true,
                isOnline: true,
                createdAt: FirebaseCore.getServerTimestamp(),
                updatedAt: FirebaseCore.getServerTimestamp(),
                lastLogin: FirebaseCore.getServerTimestamp(),
                lastSeen: FirebaseCore.getServerTimestamp(),
                profileComplete: false,
                profileCompletion: {
                    basicInfo: true,
                    phone: !!userData.phone,
                    team: !!userData.team,
                    region: !!userData.region,
                    photo: false
                }
            };
            
            // Save to Firestore
            await FirebaseCore.getCollection('users').doc(user.uid).set(userProfile);
            
            // Log activity
            await this._logActivity(user.uid, 'register', 'User registered');
            
            return {
                success: true,
                user: user,
                profile: userProfile,
                message: 'Registration successful. Please verify your email.'
            };
        } catch (error) {
            console.error('❌ Registration failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'registerUser'),
                message: this._getAuthErrorMessage(error.code)
            };
        }
    }
    
    /**
     * Register user with Google OAuth
     * @returns {Promise<Object>} Registration result
     */
    async registerWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            
            const userCredential = await this.auth.signInWithPopup(provider);
            const user = userCredential.user;
            
            // Check if profile exists
            const userDoc = await FirebaseCore.getCollection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // Create new profile
                const userProfile = {
                    uid: user.uid,
                    name: user.displayName || '',
                    email: user.email,
                    phone: user.phoneNumber || '',
                    role: 'agent',
                    team: '',
                    region: '',
                    isEmailVerified: user.emailVerified,
                    isActive: true,
                    isOnline: true,
                    createdAt: FirebaseCore.getServerTimestamp(),
                    updatedAt: FirebaseCore.getServerTimestamp(),
                    lastLogin: FirebaseCore.getServerTimestamp(),
                    lastSeen: FirebaseCore.getServerTimestamp(),
                    profileComplete: false,
                    profileCompletion: {
                        basicInfo: true,
                        phone: !!user.phoneNumber,
                        team: false,
                        region: false,
                        photo: !!user.photoURL
                    },
                    photoURL: user.photoURL || ''
                };
                
                await FirebaseCore.getCollection('users').doc(user.uid).set(userProfile);
            }
            
            await this._logActivity(user.uid, 'register_google', 'User registered with Google');
            
            return {
                success: true,
                user: user,
                message: 'Google registration successful'
            };
        } catch (error) {
            console.error('❌ Google registration failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'registerWithGoogle'),
                message: this._getAuthErrorMessage(error.code)
            };
        }
    }
    
    // ============================================
    // USER LOGIN
    // ============================================
    
    /**
     * Login user with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {boolean} rememberMe - Remember user session
     * @returns {Promise<Object>} Login result
     */
    async loginUser(email, password, rememberMe = true) {
        try {
            // Validate input
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            
            // Set persistence
            await this.auth.setPersistence(
                rememberMe 
                    ? firebase.auth.Auth.Persistence.LOCAL 
                    : firebase.auth.Auth.Persistence.SESSION
            );
            
            // Sign in
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Check email verification
            if (!user.emailVerified) {
                console.warn('⚠️ Email not verified for user:', user.email);
                // Allow login but flag
            }
            
            // Update user profile
            await FirebaseCore.getCollection('users').doc(user.uid).update({
                lastLogin: FirebaseCore.getServerTimestamp(),
                lastSeen: FirebaseCore.getServerTimestamp(),
                isOnline: true,
                loginCount: firebase.firestore.FieldValue.increment(1)
            });
            
            // Log activity
            await this._logActivity(user.uid, 'login', 'User logged in');
            
            // Setup session tracking
            this._setupSessionTracking(user.uid);
            
            return {
                success: true,
                user: user,
                message: 'Login successful'
            };
        } catch (error) {
            console.error('❌ Login failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'loginUser'),
                message: this._getAuthErrorMessage(error.code)
            };
        }
    }
    
    /**
     * Login user with Google OAuth
     * @returns {Promise<Object>} Login result
     */
    async loginWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            
            const userCredential = await this.auth.signInWithPopup(provider);
            const user = userCredential.user;
            
            // Update user profile
            await FirebaseCore.getCollection('users').doc(user.uid).update({
                lastLogin: FirebaseCore.getServerTimestamp(),
                lastSeen: FirebaseCore.getServerTimestamp(),
                isOnline: true,
                loginCount: firebase.firestore.FieldValue.increment(1)
            });
            
            await this._logActivity(user.uid, 'login_google', 'User logged in with Google');
            
            return {
                success: true,
                user: user,
                message: 'Google login successful'
            };
        } catch (error) {
            console.error('❌ Google login failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'loginWithGoogle'),
                message: this._getAuthErrorMessage(error.code)
            };
        }
    }
    
    /**
     * Login with phone number (OTP)
     * @param {string} phoneNumber - Phone number
     * @returns {Promise<Object>} Login result
     */
    async loginWithPhone(phoneNumber) {
        try {
            // Validate phone
            if (!phoneNumber || phoneNumber.length !== 10) {
                throw new Error('Invalid phone number');
            }
            
            const formattedPhone = '+91' + phoneNumber;
            
            // Setup reCAPTCHA verifier (to be implemented in UI)
            const recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                size: 'invisible'
            });
            
            // Send OTP
            const confirmationResult = await this.auth.signInWithPhoneNumber(
                formattedPhone,
                recaptchaVerifier
            );
            
            // Store confirmation result for OTP verification
            this.phoneConfirmationResult = confirmationResult;
            
            return {
                success: true,
                message: 'OTP sent successfully'
            };
        } catch (error) {
            console.error('❌ Phone login failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'loginWithPhone'),
                message: this._getAuthErrorMessage(error.code)
            };
        }
    }
    
    /**
     * Verify OTP for phone login
     * @param {string} otp - OTP code
     * @returns {Promise<Object>} Verification result
     */
    async verifyPhoneOTP(otp) {
        try {
            if (!this.phoneConfirmationResult) {
                throw new Error('No OTP sent');
            }
            
            const userCredential = await this.phoneConfirmationResult.confirm(otp);
            const user = userCredential.user;
            
            return {
                success: true,
                user: user,
                message: 'Phone verification successful'
            };
        } catch (error) {
            console.error('❌ OTP verification failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'verifyPhoneOTP'),
                message: this._getAuthErrorMessage(error.code)
            };
        }
    }
    
    // ============================================
    // USER LOGOUT
    // ============================================
    
    /**
     * Logout current user
     * @returns {Promise<Object>} Logout result
     */
    async logoutUser() {
        try {
            const userId = this.currentUser?.uid;
            
            if (userId) {
                // Update user profile
                await FirebaseCore.getCollection('users').doc(userId).update({
                    isOnline: false,
                    lastSeen: FirebaseCore.getServerTimestamp()
                });
                
                // Log activity
                await this._logActivity(userId, 'logout', 'User logged out');
            }
            
            // Sign out
            await this.auth.signOut();
            
            // Clear session
            this._clearSession();
            
            return {
                success: true,
                message: 'Logout successful'
            };
        } catch (error) {
            console.error('❌ Logout failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'logoutUser'),
                message: this._getAuthErrorMessage(error.code)
            };
        }
    }
    
    // ============================================
    // PASSWORD MANAGEMENT
    // ============================================
    
    /**
     * Send password reset email
     * @param {string} email - User email
     * @returns {Promise<Object>} Reset result
     */
    async sendPasswordReset(email) {
        try {
            if (!email) {
                throw new Error('Email is required');
            }
            
            await this.auth.sendPasswordResetEmail(email, {
                url: window.location.origin + '/reset-password.html',
                handleCodeInApp: true
            });
            
            return {
                success: true,
                message: 'Password reset email sent'
            };
        } catch (error) {
            console.error('❌ Password reset failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'sendPasswordReset'),
                message: this._getAuthErrorMessage(error.code)
            };
        }
    }
    
    /**
     * Change password for current user
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} Change result
     */
    async changePassword(currentPassword, newPassword) {
        try {
            const user = this.currentUser;
            
            if (!user) {
                throw new Error('User not authenticated');
            }
            
            // Validate new password
            this._validatePassword(newPassword);
            
            // Re-authenticate
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            await user.reauthenticateWithCredential(credential);
            
            // Update password
            await user.updatePassword(newPassword);
            
            // Log activity
            await this._logActivity(user.uid, 'change_password', 'Password changed');
            
            return {
                success: true,
                message: 'Password changed successfully'
            };
        } catch (error) {
            console.error('❌ Password change failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'changePassword'),
                message: this._getAuthErrorMessage(error.code)
            };
        }
    }
    
    // ============================================
    // USER PROFILE MANAGEMENT
    // ============================================
    
    /**
     * Load user profile from Firestore
     * @param {string} userId - User ID
     * @private
     */
    async _loadUserProfile(userId) {
        try {
            const userDoc = await FirebaseCore.getCollection('users').doc(userId).get();
            
            if (userDoc.exists) {
                this.userProfile = {
                    id: userDoc.id,
                    ...userDoc.data()
                };
            } else {
                // Create default profile
                this.userProfile = {
                    id: userId,
                    email: this.currentUser?.email,
                    name: this.currentUser?.displayName || '',
                    role: 'agent',
                    isActive: true,
                    profileComplete: false
                };
                
                await FirebaseCore.getCollection('users').doc(userId).set(this.userProfile);
            }
        } catch (error) {
            console.error('❌ Profile loading failed:', error);
            this.userProfile = null;
        }
    }
    
    /**
     * Update user profile
     * @param {Object} updateData - Profile data to update
     * @returns {Promise<Object>} Update result
     */
    async updateProfile(updateData) {
        try {
            const user = this.currentUser;
            
            if (!user) {
                throw new Error('User not authenticated');
            }
            
            // Update Firebase Auth profile
            if (updateData.name) {
                await user.updateProfile({ displayName: updateData.name });
            }
            
            if (updateData.photoURL) {
                await user.updateProfile({ photoURL: updateData.photoURL });
            }
            
            // Update Firestore profile
            const profileUpdate = {
                ...updateData,
                updatedAt: FirebaseCore.getServerTimestamp()
            };
            
            delete profileUpdate.email; // Email can't be updated directly
            delete profileUpdate.password; // Password handled separately
            
            await FirebaseCore.getCollection('users').doc(user.uid).update(profileUpdate);
            
            // Reload profile
            await this._loadUserProfile(user.uid);
            
            // Log activity
            await this._logActivity(user.uid, 'update_profile', 'Profile updated');
            
            // Notify listeners
            this._notifyListeners('onProfileUpdated', this.userProfile);
            
            return {
                success: true,
                profile: this.userProfile,
                message: 'Profile updated successfully'
            };
        } catch (error) {
            console.error('❌ Profile update failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'updateProfile'),
                message: this._getAuthErrorMessage(error.code)
            };
        }
    }
    
    /**
     * Update user role
     * @param {string} userId - User ID
     * @param {string} newRole - New role
     * @returns {Promise<Object>} Update result
     */
    async updateUserRole(userId, newRole) {
        try {
            // Check permission
            if (!this.hasPermission('canManageUsers')) {
                throw new Error('Permission denied: cannot manage users');
            }
            
            // Validate role
            if (!USER_ROLES.ALL.includes(newRole)) {
                throw new Error('Invalid role');
            }
            
            await FirebaseCore.getCollection('users').doc(userId).update({
                role: newRole,
                updatedAt: FirebaseCore.getServerTimestamp(),
                roleUpdatedAt: FirebaseCore.getServerTimestamp(),
                roleUpdatedBy: this.currentUser?.uid
            });
            
            // Log activity
            await this._logActivity(userId, 'update_role', `Role changed to ${newRole}`);
            
            return {
                success: true,
                message: 'Role updated successfully'
            };
        } catch (error) {
            console.error('❌ Role update failed:', error);
            return {
                success: false,
                error: FirebaseErrorHandler.handle(error, 'updateUserRole'),
                message: this._getAuthErrorMessage(error.code)
            };
        }
    }
    
    // ============================================
    // PERMISSION MANAGEMENT
    // ============================================
    
    /**
     * Check if current user has permission
     * @param {string} permission - Permission to check
     * @returns {boolean} Has permission
     */
    hasPermission(permission) {
        if (!this.userProfile) {
            return false;
        }
        
        const role = this.userProfile.role || 'agent';
        const permissions = USER_ROLES.PERMISSIONS[role];
        
        return permissions ? permissions[permission] === true : false;
    }
    
    /**
     * Get all permissions for current user
     * @returns {Object} Permissions object
     */
    getPermissions() {
        if (!this.userProfile) {
            return {};
        }
        
        const role = this.userProfile.role || 'agent';
        return USER_ROLES.PERMISSIONS[role] || {};
    }
    
    /**
     * Check if user has specific role
     * @param {string|Array} roles - Role(s) to check
     * @returns {boolean} Has role
     */
    hasRole(roles) {
        if (!this.userProfile) {
            return false;
        }
        
        const userRole = this.userProfile.role;
        
        if (Array.isArray(roles)) {
            return roles.includes(userRole);
        }
        
        return userRole === roles;
    }
    
    /**
     * Check if user is admin
     * @returns {boolean} Is admin
     */
    isAdmin() {
        return this.hasRole(USER_ROLES.ADMIN);
    }
    
    /**
     * Check if user is team lead
     * @returns {boolean} Is team lead
     */
    isTeamLead() {
        return this.hasRole(USER_ROLES.TEAM_LEAD);
    }
    
    /**
     * Check if user is agent
     * @returns {boolean} Is agent
     */
    isAgent() {
        return this.hasRole(USER_ROLES.AGENT);
    }
    
    // ============================================
    // SESSION MANAGEMENT
    // ============================================
    
    /**
     * Setup session tracking
     * @param {string} userId - User ID
     * @private
     */
    _setupSessionTracking(userId) {
        // Store session start
        localStorage.setItem('sessionStart', Date.now().toString());
        localStorage.setItem('sessionUserId', userId);
        
        // Setup activity tracking
        this._setupActivityTracking();
        
        // Setup session timeout
        this.sessionTimer = setTimeout(() => {
            this._handleSessionTimeout();
        }, this.sessionConfig.maxSessionDuration);
    }
    
    /**
     * Setup activity tracking
     * @private
     */
    _setupActivityTracking() {
        // Track user activity
        ['click', 'keypress', 'scroll', 'mousemove'].forEach(eventType => {
            document.addEventListener(eventType, () => {
                this.activityTracker.lastActivity = Date.now();
                this._resetIdleTimer();
            });
        });
    }
    
    /**
     * Reset idle timer
     * @private
     */
    _resetIdleTimer() {
        if (this.activityTracker.idleTimer) {
            clearTimeout(this.activityTracker.idleTimer);
        }
        
        this.activityTracker.idleTimer = setTimeout(() => {
            this._handleIdleTimeout();
        }, this.sessionConfig.timeout);
    }
    
    /**
     * Handle idle timeout
     * @private
     */
    async _handleIdleTimeout() {
        console.warn('⚠️ Session idle timeout');
        
        // Show warning to user
        this._notifyListeners('onError', {
            type: 'idle_timeout',
            message: 'Session expired due to inactivity'
        });
        
        // Logout
        await this.logoutUser();
    }
    
    /**
     * Handle session timeout
     * @private
     */
    async _handleSessionTimeout() {
        console.warn('⚠️ Max session duration reached');
        
        // Logout
        await this.logoutUser();
    }
    
    /**
     * Clear session
     * @private
     */
    _clearSession() {
        localStorage.removeItem('sessionStart');
        localStorage.removeItem('sessionUserId');
        
        if (this.activityTracker.idleTimer) {
            clearTimeout(this.activityTracker.idleTimer);
        }
        
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
    }
    
    // ============================================
    // ACTIVITY LOGGING
    // ============================================
    
    /**
     * Log user activity
     * @param {string} userId - User ID
     * @param {string} action - Action performed
     * @param {string} description - Activity description
     * @private
     */
    async _logActivity(userId, action, description) {
        try {
            await FirebaseCore.getCollection('auditLogs').add({
                userId: userId,
                action: action,
                description: description,
                timestamp: FirebaseCore.getServerTimestamp(),
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                ip: null // Will be filled by Cloudflare Worker
            });
        } catch (error) {
            console.warn('⚠️ Could not log activity:', error);
        }
    }
    
    // ============================================
    // VALIDATION
    // ============================================
    
    /**
     * Validate registration data
     * @param {Object} data - Registration data
     * @private
     */
    _validateRegistrationData(data) {
        if (!data.name || data.name.length < 3) {
            throw new Error('Name must be at least 3 characters');
        }
        
        if (!data.email || !this._isValidEmail(data.email)) {
            throw new Error('Invalid email address');
        }
        
        this._validatePassword(data.password);
        
        if (data.phone && !this._isValidPhone(data.phone)) {
            throw new Error('Invalid phone number');
        }
    }
    
    /**
     * Validate password
     * @param {string} password - Password to validate
     * @private
     */
    _validatePassword(password) {
        if (!password || password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }
        
        if (!/[A-Z]/.test(password)) {
            throw new Error('Password must contain uppercase letter');
        }
        
        if (!/[a-z]/.test(password)) {
            throw new Error('Password must contain lowercase letter');
        }
        
        if (!/[0-9]/.test(password)) {
            throw new Error('Password must contain number');
        }
        
        if (!/[!@#$%^&*]/.test(password)) {
            throw new Error('Password must contain special character');
        }
    }
    
    /**
     * Check if email is valid
     * @param {string} email - Email to validate
     * @returns {boolean} Is valid
     * @private
     */
    _isValidEmail(email) {
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    }
    
    /**
     * Check if phone is valid
     * @param {string} phone - Phone to validate
     * @returns {boolean} Is valid
     * @private
     */
    _isValidPhone(phone) {
        return /^[6-9]\d{9}$/.test(phone.replace(/[^0-9]/g, ''));
    }
    
    // ============================================
    // ERROR MESSAGES
    // ============================================
    
    /**
     * Get user-friendly error message
     * @param {string} errorCode - Firebase error code
     * @returns {string} User-friendly message
     * @private
     */
    _getAuthErrorMessage(errorCode) {
        const errorMessages = {
            'auth/invalid-email': 'Invalid email address',
            'auth/user-disabled': 'This account has been disabled',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'Email already registered',
            'auth/weak-password': 'Password is too weak',
            'auth/too-many-requests': 'Too many attempts. Please try later',
            'auth/network-request-failed': 'Network error. Check your connection',
            'auth/operation-not-allowed': 'This operation is not allowed',
            'auth/requires-recent-login': 'Please login again to continue',
            'auth/invalid-verification-code': 'Invalid OTP code',
            'auth/expired-action-code': 'Link has expired',
            'auth/invalid-action-code': 'Invalid link'
        };
        
        return errorMessages[errorCode] || 'An error occurred. Please try again';
    }
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    addEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }
    
    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    removeEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }
    
    /**
     * Notify listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @private
     */
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
    
    // ============================================
    // GETTERS
    // ============================================
    
    /**
     * Get current user
     * @returns {Object|null} Current user
     */
    getCurrentUser() {
        return this.currentUser;
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
     * Get user ID
     * @returns {string|null} User ID
     */
    getUserId() {
        return this.currentUser?.uid || null;
    }
    
    /**
     * Check if authenticated
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
}

// ============================================
// SINGLETON INSTANCE
// ============================================

const AuthServiceInstance = new AuthService();

// ============================================
// GLOBAL EXPORT
// ============================================

window.AuthService = AuthServiceInstance;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get current authenticated user (global helper)
 * @returns {Object|null} Current user
 */
function getCurrentUser() {
    return AuthServiceInstance.getCurrentUser();
}

/**
 * Get current user role (global helper)
 * @returns {string} User role
 */
function getCurrentUserRole() {
    return AuthServiceInstance.getUserRole();
}

/**
 * Check if user has permission (global helper)
 * @param {string} permission - Permission to check
 * @returns {boolean} Has permission
 */
function hasPermission(permission) {
    return AuthServiceInstance.hasPermission(permission);
}

/**
 * Check if user is admin (global helper)
 * @returns {boolean} Is admin
 */
function isAdmin() {
    return AuthServiceInstance.isAdmin();
}

/**
 * Check if user is team lead (global helper)
 * @returns {boolean} Is team lead
 */
function isTeamLead() {
    return AuthServiceInstance.isTeamLead();
}

/**
 * Check if user is agent (global helper)
 * @returns {boolean} Is agent
 */
function isAgent() {
    return AuthServiceInstance.isAgent();
}

window.getCurrentUser = getCurrentUser;
window.getCurrentUserRole = getCurrentUserRole;
window.hasPermission = hasPermission;
window.isAdmin = isAdmin;
window.isTeamLead = isTeamLead;
window.isAgent = isAgent;

console.log('✅ Auth Service Loaded');

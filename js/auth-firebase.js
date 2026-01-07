/**
 * Firebase Authentication Manager
 * Handles Google Sign-In via Firebase with email whitelist
 * Mobile-optimized: handles popup fallback and storage issues
 */

class FirebaseAuthManager {
    constructor() {
        this.user = null;
        this.onAuthChange = null;
        this.initialized = false;
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }

    /**
     * Initialize Firebase
     */
    init() {
        if (this.initialized) return;

        // Initialize Firebase
        firebase.initializeApp(CONFIG.FIREBASE);

        // Set persistence to LOCAL for better mobile support
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .catch((error) => {
                console.warn('Persistence setting failed:', error);
            });

        // Check for redirect result first (mobile fallback)
        this.handleRedirectResult();

        // Listen for auth state changes
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // Check if user is authorized
                if (this.isAuthorized(user.email)) {
                    this.user = {
                        email: user.email,
                        name: user.displayName,
                        picture: user.photoURL,
                        uid: user.uid
                    };

                    if (this.onAuthChange) {
                        this.onAuthChange(this.user);
                    }
                } else {
                    // Not authorized - sign out
                    this.showError(`Access denied. ${user.email} is not authorized.`);
                    this.logout();
                }
            } else {
                this.user = null;
                if (this.onAuthChange) {
                    this.onAuthChange(null);
                }
            }
        });

        this.initialized = true;
    }

    /**
     * Handle redirect result (for mobile fallback)
     */
    async handleRedirectResult() {
        try {
            const result = await firebase.auth().getRedirectResult();
            if (result.user) {
                console.log('Redirect sign-in successful');
            }
        } catch (error) {
            if (error.code === 'auth/web-storage-unsupported') {
                this.showError('Please enable cookies and site data for authentication.');
            } else if (error.message && error.message.includes('missing initial state')) {
                // Clear any stale state and retry
                console.warn('Stale auth state detected, clearing...');
                sessionStorage.clear();
            } else {
                console.warn('Redirect result error:', error);
            }
        }
    }

    /**
     * Sign in with Google
     * Uses popup on desktop, redirect on mobile for better compatibility
     */
    async signInWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');

        // Force account selection
        provider.setCustomParameters({
            prompt: 'select_account'
        });

        try {
            this.hideError();

            // On mobile, use redirect (more reliable than popup)
            if (this.isMobile) {
                console.log('Mobile detected, using redirect sign-in');
                await firebase.auth().signInWithRedirect(provider);
                return null; // Redirect will reload page
            }

            // Desktop: try popup first
            try {
                const result = await firebase.auth().signInWithPopup(provider);
                return result.user;
            } catch (popupError) {
                // If popup fails, fall back to redirect
                if (popupError.code === 'auth/popup-blocked' ||
                    popupError.code === 'auth/popup-closed-by-user') {
                    console.log('Popup failed, falling back to redirect');
                    await firebase.auth().signInWithRedirect(provider);
                    return null;
                }
                throw popupError;
            }
        } catch (error) {
            console.error('Sign-in error:', error);

            let message = 'Sign-in failed. Please try again.';
            if (error.code === 'auth/popup-closed-by-user') {
                message = 'Sign-in cancelled.';
            } else if (error.code === 'auth/popup-blocked') {
                message = 'Redirecting to Google sign-in...';
            } else if (error.code === 'auth/network-request-failed') {
                message = 'Network error. Please check your connection.';
            } else if (error.code === 'auth/web-storage-unsupported') {
                message = 'Please enable cookies and site data for authentication.';
            } else if (error.message && error.message.includes('missing initial state')) {
                message = 'Session expired. Please try again.';
                sessionStorage.clear();
            }

            this.showError(message);
            throw error;
        }
    }

    /**
     * Check if email is authorized
     */
    isAuthorized(email) {
        if (!email) return false;
        const normalizedEmail = email.toLowerCase().trim();
        return CONFIG.AUTHORIZED_EMAILS.some(
            authorized => authorized.toLowerCase().trim() === normalizedEmail
        );
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return this.user !== null;
    }

    /**
     * Get current user
     */
    getUser() {
        return this.user;
    }

    /**
     * Logout
     */
    async logout() {
        try {
            await firebase.auth().signOut();
            this.user = null;
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
            errorEl.classList.add('hidden');
        }
    }
}

// Create singleton instance
window.firebaseAuth = new FirebaseAuthManager();

/**
 * Firebase Authentication Manager
 * Handles Google Sign-In via Firebase with email whitelist
 */

class FirebaseAuthManager {
    constructor() {
        this.user = null;
        this.onAuthChange = null;
        this.initialized = false;
    }

    /**
     * Initialize Firebase
     */
    init() {
        if (this.initialized) return;

        // Initialize Firebase
        firebase.initializeApp(CONFIG.FIREBASE);

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
     * Sign in with Google
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
            const result = await firebase.auth().signInWithPopup(provider);
            return result.user;
        } catch (error) {
            console.error('Sign-in error:', error);

            let message = 'Sign-in failed. Please try again.';
            if (error.code === 'auth/popup-closed-by-user') {
                message = 'Sign-in cancelled.';
            } else if (error.code === 'auth/popup-blocked') {
                message = 'Pop-up blocked. Please allow pop-ups for this site.';
            } else if (error.code === 'auth/network-request-failed') {
                message = 'Network error. Please check your connection.';
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

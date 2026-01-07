/**
 * Google Authentication Manager
 * Handles Google Sign-In with email whitelist restriction
 */

class GoogleAuthManager {
    constructor() {
        this.user = null;
        this.onAuthChange = null;
    }

    /**
     * Initialize Google Sign-In
     */
    init() {
        // Check for existing session
        const savedSession = this.getSession();
        if (savedSession && this.isSessionValid(savedSession)) {
            this.user = savedSession.user;
            return true;
        }
        return false;
    }

    /**
     * Handle Google Sign-In callback
     */
    async handleCredentialResponse(response) {
        try {
            // Decode the JWT token
            const payload = this.decodeJwt(response.credential);

            if (!payload) {
                throw new Error('Invalid token');
            }

            const email = payload.email;
            const name = payload.name;
            const picture = payload.picture;

            // Check if email is authorized
            if (!this.isAuthorized(email)) {
                throw new Error(`Access denied. ${email} is not authorized to access this portal.`);
            }

            // Create user object
            this.user = {
                email: email,
                name: name,
                picture: picture,
                token: response.credential
            };

            // Save session
            this.saveSession();

            // Trigger auth change callback
            if (this.onAuthChange) {
                this.onAuthChange(this.user);
            }

            return this.user;

        } catch (error) {
            console.error('Sign-in error:', error);
            throw error;
        }
    }

    /**
     * Decode JWT token (client-side only - for display purposes)
     */
    decodeJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('JWT decode error:', e);
            return null;
        }
    }

    /**
     * Check if email is in authorized list
     */
    isAuthorized(email) {
        if (!email) return false;
        const normalizedEmail = email.toLowerCase().trim();
        return CONFIG.AUTHORIZED_EMAILS.some(
            authorized => authorized.toLowerCase().trim() === normalizedEmail
        );
    }

    /**
     * Save session to localStorage
     */
    saveSession() {
        const session = {
            user: this.user,
            createdAt: Date.now(),
            expiresAt: Date.now() + CONFIG.SESSION_DURATION
        };
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
    }

    /**
     * Get session from localStorage
     */
    getSession() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
        if (!saved) return null;
        try {
            return JSON.parse(saved);
        } catch (e) {
            return null;
        }
    }

    /**
     * Check if session is valid
     */
    isSessionValid(session = null) {
        const s = session || this.getSession();
        if (!s) return false;
        if (!s.expiresAt) return false;
        if (Date.now() > s.expiresAt) return false;
        if (!s.user || !s.user.email) return false;
        if (!this.isAuthorized(s.user.email)) return false;
        return true;
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return this.user !== null && this.isSessionValid();
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
    logout() {
        this.user = null;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION);

        // Revoke Google token
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.disableAutoSelect();
        }

        // Trigger auth change callback
        if (this.onAuthChange) {
            this.onAuthChange(null);
        }
    }

    /**
     * Extend session
     */
    extendSession() {
        if (!this.user) return false;

        const session = this.getSession();
        if (!session) return false;

        session.expiresAt = Date.now() + CONFIG.SESSION_DURATION;
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
        return true;
    }

    /**
     * Get session time remaining in milliseconds
     */
    getSessionRemaining() {
        const session = this.getSession();
        if (!session || !session.expiresAt) return 0;
        const remaining = session.expiresAt - Date.now();
        return remaining > 0 ? remaining : 0;
    }
}

// Create singleton instance
window.googleAuth = new GoogleAuthManager();

// Global callback for Google Sign-In button
function handleGoogleSignIn(response) {
    window.googleAuth.handleCredentialResponse(response)
        .then(user => {
            console.log('Signed in:', user.email);
        })
        .catch(error => {
            const errorEl = document.getElementById('login-error');
            if (errorEl) {
                errorEl.textContent = error.message;
                errorEl.classList.remove('hidden');
            }
        });
}

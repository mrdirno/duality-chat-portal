/**
 * DUALITY Chat Portal - Main Application (Firebase Auth)
 */

class App {
    constructor() {
        this.screens = {
            login: document.getElementById('login-screen'),
            portal: document.getElementById('portal-screen')
        };
    }

    /**
     * Initialize the application
     */
    init() {
        // Set up auth change handler
        window.firebaseAuth.onAuthChange = (user) => this.handleAuthChange(user);

        // Initialize Firebase Auth
        window.firebaseAuth.init();

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Handle authentication state changes
     */
    handleAuthChange(user) {
        if (user) {
            this.showPortal();
        } else {
            this.showLogin();
        }
    }

    /**
     * Show login screen
     */
    showLogin() {
        this.screens.login.classList.add('active');
        this.screens.portal.classList.remove('active');
    }

    /**
     * Show portal screen
     */
    async showPortal() {
        this.screens.login.classList.remove('active');
        this.screens.portal.classList.add('active');

        // Update user info in header
        const user = window.firebaseAuth.getUser();
        if (user) {
            const avatarEl = document.getElementById('user-avatar');
            const emailEl = document.getElementById('user-email');

            if (avatarEl && user.picture) {
                avatarEl.src = user.picture;
                avatarEl.style.display = 'block';
            }

            if (emailEl) {
                emailEl.textContent = user.email;
            }
        }

        // Initialize portal
        await window.portal.init();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Google Sign-In button
        const signInBtn = document.getElementById('google-signin-btn');
        if (signInBtn) {
            signInBtn.addEventListener('click', async () => {
                signInBtn.disabled = true;
                signInBtn.classList.add('loading');

                try {
                    await window.firebaseAuth.signInWithGoogle();
                } catch (error) {
                    // Error already handled in auth manager
                } finally {
                    signInBtn.disabled = false;
                    signInBtn.classList.remove('loading');
                }
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await window.firebaseAuth.logout();
            });
        }

        // Import button
        const importBtn = document.getElementById('import-btn');
        const importFile = document.getElementById('import-file');
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => importFile.click());
            importFile.addEventListener('change', async (e) => {
                if (e.target.files.length > 0) {
                    try {
                        const count = await window.portal.importData(e.target.files[0]);
                        alert(`Successfully imported ${count} sessions`);
                    } catch (err) {
                        alert('Import failed: ' + err.message);
                    }
                    e.target.value = '';
                }
            });
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});

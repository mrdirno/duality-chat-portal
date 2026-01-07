/**
 * DUALITY Chat Portal - Main Application (Google Auth Version)
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
    async init() {
        // Set up auth change handler
        window.googleAuth.onAuthChange = (user) => this.handleAuthChange(user);

        // Check for existing session
        const hasSession = window.googleAuth.init();

        if (hasSession) {
            this.showPortal();
        } else {
            this.showLogin();
        }

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

        // Hide any previous errors
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
            errorEl.classList.add('hidden');
        }
    }

    /**
     * Show portal screen
     */
    async showPortal() {
        this.screens.login.classList.remove('active');
        this.screens.portal.classList.add('active');

        // Update user info in header
        const user = window.googleAuth.getUser();
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
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                window.googleAuth.logout();
                window.location.reload();
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

        // Extend session on activity
        ['click', 'keypress', 'scroll'].forEach(event => {
            document.addEventListener(event, () => {
                if (window.googleAuth.isLoggedIn()) {
                    window.googleAuth.extendSession();
                }
            });
        });

        // Check session periodically
        setInterval(() => {
            if (this.screens.portal.classList.contains('active')) {
                if (!window.googleAuth.isSessionValid()) {
                    window.googleAuth.logout();
                    window.location.reload();
                }
            }
        }, 60000); // Check every minute
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});

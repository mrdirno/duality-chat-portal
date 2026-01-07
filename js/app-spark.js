/**
 * DUALITY Spark Portal - Main Application
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
            this.showPortal(user);
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
    showPortal(user) {
        this.screens.login.classList.remove('active');
        this.screens.portal.classList.add('active');

        // Initialize Spark chat
        window.sparkChat.init(user);
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
                window.sparkChat.destroy();
                await window.firebaseAuth.logout();
            });
        }

        // Chat form
        const chatForm = document.getElementById('chat-form');
        const messageInput = document.getElementById('message-input');

        if (chatForm && messageInput) {
            chatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const text = messageInput.value;

                if (text.trim()) {
                    const sent = await window.sparkChat.sendMessage(text);
                    if (sent) {
                        messageInput.value = '';
                        this.autoResizeTextarea(messageInput);
                    }
                }
            });

            // Auto-resize textarea
            messageInput.addEventListener('input', () => {
                this.autoResizeTextarea(messageInput);
            });

            // Submit on Enter (Shift+Enter for newline)
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    chatForm.dispatchEvent(new Event('submit'));
                }
            });
        }
    }

    /**
     * Auto-resize textarea based on content
     */
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});

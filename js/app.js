/**
 * DUALITY Chat Portal - Main Application
 * Ties together authentication, TOTP, and portal functionality
 */

class App {
    constructor() {
        this.screens = {
            login: document.getElementById('login-screen'),
            setup: document.getElementById('setup-screen'),
            portal: document.getElementById('portal-screen')
        };
        this.currentSecret = null;
    }

    /**
     * Initialize the application
     */
    async init() {
        // Check for existing session
        if (window.auth.isSessionValid()) {
            this.showScreen('portal');
            await window.portal.init();
            return;
        }

        // Check if setup is complete
        if (!window.auth.isSetupComplete()) {
            this.showSetupLink();
        }

        this.setupEventListeners();
    }

    /**
     * Show a specific screen
     */
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        this.screens[screenName].classList.add('active');
    }

    /**
     * Show/hide setup link based on auth state
     */
    showSetupLink() {
        document.getElementById('show-setup').style.display = 'inline';
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        // Show setup screen
        document.getElementById('show-setup').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSetupScreen();
        });

        // Back to login
        document.getElementById('back-to-login').addEventListener('click', () => {
            this.showScreen('login');
        });

        // Complete setup
        document.getElementById('complete-setup').addEventListener('click', async () => {
            await this.handleSetupComplete();
        });

        // Copy secret
        document.getElementById('copy-secret').addEventListener('click', () => {
            this.copySecret();
        });

        // Auto-format TOTP input (numbers only)
        ['totp', 'verify-totp'].forEach(id => {
            const input = document.getElementById(id);
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
            });
        });
    }

    /**
     * Handle login form submission
     */
    async handleLogin() {
        const password = document.getElementById('password').value;
        const totpCode = document.getElementById('totp').value;
        const errorEl = document.getElementById('login-error');
        const submitBtn = document.querySelector('#login-form button[type="submit"]');

        // Validate inputs
        if (!password || totpCode.length !== 6) {
            errorEl.textContent = 'Please enter your password and 6-digit code.';
            errorEl.classList.remove('hidden');
            return;
        }

        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        errorEl.classList.add('hidden');

        try {
            await window.auth.authenticate(password, totpCode);

            // Success - show portal
            this.showScreen('portal');
            await window.portal.init();

            // Clear form
            document.getElementById('password').value = '';
            document.getElementById('totp').value = '';

        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.classList.remove('hidden');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }

    /**
     * Show 2FA setup screen
     */
    showSetupScreen() {
        this.showScreen('setup');

        // Generate new secret
        this.currentSecret = window.totp.generateSecret();

        // Display secret
        document.getElementById('secret-key').textContent = this.currentSecret;

        // Generate QR code
        const otpauthUri = window.totp.getOtpauthUri(
            this.currentSecret,
            'user@duality.portal',
            'DUALITY Portal'
        );

        // Clear existing QR code
        const qrContainer = document.getElementById('qr-container');
        qrContainer.innerHTML = '<div id="qr-code"></div>';

        // Generate new QR code
        new QRCode(document.getElementById('qr-code'), {
            text: otpauthUri,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    }

    /**
     * Copy secret to clipboard
     */
    async copySecret() {
        try {
            await navigator.clipboard.writeText(this.currentSecret);
            const btn = document.getElementById('copy-secret');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    /**
     * Handle setup completion
     */
    async handleSetupComplete() {
        const password = document.getElementById('setup-password').value;
        const verifyCode = document.getElementById('verify-totp').value;
        const completeBtn = document.getElementById('complete-setup');

        // Validate inputs
        if (!password) {
            alert('Please create a password.');
            return;
        }

        if (password.length < 8) {
            alert('Password must be at least 8 characters.');
            return;
        }

        if (verifyCode.length !== 6) {
            alert('Please enter the 6-digit code from your authenticator app to verify.');
            return;
        }

        // Show loading
        completeBtn.classList.add('loading');
        completeBtn.disabled = true;

        try {
            // Verify the TOTP code
            const isValid = await window.totp.verify(this.currentSecret, verifyCode);
            if (!isValid) {
                alert('Invalid verification code. Please check your authenticator app and try again.');
                return;
            }

            // Save credentials
            await window.auth.setup(password, this.currentSecret);

            // Auto-login
            await window.auth.authenticate(password, verifyCode);

            // Show portal
            this.showScreen('portal');
            await window.portal.init();

            // Clear form
            document.getElementById('setup-password').value = '';
            document.getElementById('verify-totp').value = '';
            this.currentSecret = null;

            alert('Setup complete! Your chat portal is now secured with 2FA.');

        } catch (error) {
            alert('Setup failed: ' + error.message);
        } finally {
            completeBtn.classList.remove('loading');
            completeBtn.disabled = false;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});

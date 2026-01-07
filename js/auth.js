/**
 * Authentication Manager
 * Handles secure password hashing, session management, and 2FA
 */

class AuthManager {
    constructor() {
        this.storageKey = 'duality_auth';
        this.sessionKey = 'duality_session';
        this.sessionDuration = 30 * 60 * 1000; // 30 minutes
        this.maxAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    }

    /**
     * Hash password with salt using PBKDF2
     */
    async hashPassword(password, salt = null) {
        if (!salt) {
            salt = crypto.getRandomValues(new Uint8Array(16));
        } else if (typeof salt === 'string') {
            salt = this.hexToBytes(salt);
        }

        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits']
        );

        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            256
        );

        const hashArray = new Uint8Array(derivedBits);
        return {
            hash: this.bytesToHex(hashArray),
            salt: this.bytesToHex(salt)
        };
    }

    /**
     * Convert bytes to hex string
     */
    bytesToHex(bytes) {
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Convert hex string to bytes
     */
    hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes;
    }

    /**
     * Check if setup is complete
     */
    isSetupComplete() {
        const stored = localStorage.getItem(this.storageKey);
        return stored !== null;
    }

    /**
     * Complete initial setup
     */
    async setup(password, totpSecret) {
        const { hash, salt } = await this.hashPassword(password);

        // Encrypt the TOTP secret with the password
        const encryptedSecret = await this.encryptData(totpSecret, password);

        const authData = {
            passwordHash: hash,
            passwordSalt: salt,
            totpSecret: encryptedSecret,
            createdAt: Date.now(),
            lastLogin: null,
            failedAttempts: 0,
            lockedUntil: null
        };

        localStorage.setItem(this.storageKey, JSON.stringify(authData));
        return true;
    }

    /**
     * Encrypt data using AES-GCM
     */
    async encryptData(data, password) {
        const encoder = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );

        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encoder.encode(data)
        );

        return {
            salt: this.bytesToHex(salt),
            iv: this.bytesToHex(iv),
            data: this.bytesToHex(new Uint8Array(encrypted))
        };
    }

    /**
     * Decrypt data using AES-GCM
     */
    async decryptData(encryptedObj, password) {
        const encoder = new TextEncoder();
        const salt = this.hexToBytes(encryptedObj.salt);
        const iv = this.hexToBytes(encryptedObj.iv);
        const data = this.hexToBytes(encryptedObj.data);

        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        try {
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                data
            );
            return new TextDecoder().decode(decrypted);
        } catch (e) {
            return null;
        }
    }

    /**
     * Check if account is locked
     */
    isLocked() {
        const stored = localStorage.getItem(this.storageKey);
        if (!stored) return false;

        const authData = JSON.parse(stored);
        if (authData.lockedUntil && Date.now() < authData.lockedUntil) {
            return true;
        }
        return false;
    }

    /**
     * Get lockout remaining time
     */
    getLockoutRemaining() {
        const stored = localStorage.getItem(this.storageKey);
        if (!stored) return 0;

        const authData = JSON.parse(stored);
        if (authData.lockedUntil) {
            const remaining = authData.lockedUntil - Date.now();
            return remaining > 0 ? remaining : 0;
        }
        return 0;
    }

    /**
     * Authenticate user
     */
    async authenticate(password, totpCode) {
        if (this.isLocked()) {
            const remaining = Math.ceil(this.getLockoutRemaining() / 60000);
            throw new Error(`Account locked. Try again in ${remaining} minutes.`);
        }

        const stored = localStorage.getItem(this.storageKey);
        if (!stored) {
            throw new Error('Setup not complete. Please set up 2FA first.');
        }

        const authData = JSON.parse(stored);

        // Verify password
        const { hash } = await this.hashPassword(password, authData.passwordSalt);
        if (hash !== authData.passwordHash) {
            await this.recordFailedAttempt();
            throw new Error('Invalid password');
        }

        // Decrypt and verify TOTP
        const totpSecret = await this.decryptData(authData.totpSecret, password);
        if (!totpSecret) {
            await this.recordFailedAttempt();
            throw new Error('Authentication failed');
        }

        const totpValid = await window.totp.verify(totpSecret, totpCode);
        if (!totpValid) {
            await this.recordFailedAttempt();
            throw new Error('Invalid authentication code');
        }

        // Success - reset failed attempts and create session
        authData.failedAttempts = 0;
        authData.lockedUntil = null;
        authData.lastLogin = Date.now();
        localStorage.setItem(this.storageKey, JSON.stringify(authData));

        // Create session
        const session = {
            token: this.generateSessionToken(),
            createdAt: Date.now(),
            expiresAt: Date.now() + this.sessionDuration
        };
        sessionStorage.setItem(this.sessionKey, JSON.stringify(session));

        return true;
    }

    /**
     * Record failed authentication attempt
     */
    async recordFailedAttempt() {
        const stored = localStorage.getItem(this.storageKey);
        if (!stored) return;

        const authData = JSON.parse(stored);
        authData.failedAttempts = (authData.failedAttempts || 0) + 1;

        if (authData.failedAttempts >= this.maxAttempts) {
            authData.lockedUntil = Date.now() + this.lockoutDuration;
        }

        localStorage.setItem(this.storageKey, JSON.stringify(authData));
    }

    /**
     * Generate session token
     */
    generateSessionToken() {
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        return this.bytesToHex(bytes);
    }

    /**
     * Check if session is valid
     */
    isSessionValid() {
        const stored = sessionStorage.getItem(this.sessionKey);
        if (!stored) return false;

        const session = JSON.parse(stored);
        return Date.now() < session.expiresAt;
    }

    /**
     * Extend session
     */
    extendSession() {
        const stored = sessionStorage.getItem(this.sessionKey);
        if (!stored) return false;

        const session = JSON.parse(stored);
        session.expiresAt = Date.now() + this.sessionDuration;
        sessionStorage.setItem(this.sessionKey, JSON.stringify(session));
        return true;
    }

    /**
     * Get session time remaining
     */
    getSessionRemaining() {
        const stored = sessionStorage.getItem(this.sessionKey);
        if (!stored) return 0;

        const session = JSON.parse(stored);
        const remaining = session.expiresAt - Date.now();
        return remaining > 0 ? remaining : 0;
    }

    /**
     * Logout
     */
    logout() {
        sessionStorage.removeItem(this.sessionKey);
    }

    /**
     * Reset all authentication data (for testing/recovery)
     */
    reset() {
        localStorage.removeItem(this.storageKey);
        sessionStorage.removeItem(this.sessionKey);
    }
}

// Export singleton instance
window.auth = new AuthManager();

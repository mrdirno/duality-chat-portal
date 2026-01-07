/**
 * TOTP (Time-based One-Time Password) Implementation
 * RFC 6238 compliant - compatible with Google Authenticator, Authy, etc.
 */

class TOTP {
    constructor() {
        this.digits = 6;
        this.period = 30; // seconds
        this.algorithm = 'SHA-1';
    }

    /**
     * Generate a random secret key (Base32 encoded)
     */
    generateSecret(length = 20) {
        const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        const randomValues = new Uint8Array(length);
        crypto.getRandomValues(randomValues);

        for (let i = 0; i < length; i++) {
            secret += base32chars[randomValues[i] % 32];
        }
        return secret;
    }

    /**
     * Decode Base32 string to Uint8Array
     */
    base32ToBytes(base32) {
        const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        base32 = base32.replace(/=+$/, '').toUpperCase();

        let bits = '';
        for (let i = 0; i < base32.length; i++) {
            const val = base32chars.indexOf(base32[i]);
            if (val === -1) throw new Error('Invalid base32 character');
            bits += val.toString(2).padStart(5, '0');
        }

        const bytes = new Uint8Array(Math.floor(bits.length / 8));
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
        }
        return bytes;
    }

    /**
     * Convert number to 8-byte array (big-endian)
     */
    intToBytes(num) {
        const bytes = new Uint8Array(8);
        for (let i = 7; i >= 0; i--) {
            bytes[i] = num & 0xff;
            num = Math.floor(num / 256);
        }
        return bytes;
    }

    /**
     * HMAC-SHA1 implementation using Web Crypto API
     */
    async hmacSha1(key, message) {
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            key,
            { name: 'HMAC', hash: 'SHA-1' },
            false,
            ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
        return new Uint8Array(signature);
    }

    /**
     * Generate TOTP code for given secret and time
     */
    async generate(secret, time = null) {
        if (time === null) {
            time = Math.floor(Date.now() / 1000);
        }

        const counter = Math.floor(time / this.period);
        const key = this.base32ToBytes(secret);
        const message = this.intToBytes(counter);

        const hmac = await this.hmacSha1(key, message);

        // Dynamic truncation
        const offset = hmac[hmac.length - 1] & 0x0f;
        const binary =
            ((hmac[offset] & 0x7f) << 24) |
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            (hmac[offset + 3] & 0xff);

        const otp = binary % Math.pow(10, this.digits);
        return otp.toString().padStart(this.digits, '0');
    }

    /**
     * Verify TOTP code with time drift tolerance
     */
    async verify(secret, code, drift = 1) {
        const time = Math.floor(Date.now() / 1000);

        for (let i = -drift; i <= drift; i++) {
            const checkTime = time + (i * this.period);
            const expectedCode = await this.generate(secret, checkTime);
            if (expectedCode === code) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get time remaining until next code
     */
    getTimeRemaining() {
        const time = Math.floor(Date.now() / 1000);
        return this.period - (time % this.period);
    }

    /**
     * Generate otpauth URI for QR code
     */
    getOtpauthUri(secret, account, issuer = 'DUALITY') {
        const params = new URLSearchParams({
            secret: secret,
            issuer: issuer,
            algorithm: this.algorithm,
            digits: this.digits,
            period: this.period
        });
        return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?${params}`;
    }
}

// Export singleton instance
window.totp = new TOTP();

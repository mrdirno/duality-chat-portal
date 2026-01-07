/**
 * DUALITY Chat Portal Configuration
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project (or use existing)
 * 3. Enable Google Identity Services
 * 4. Go to APIs & Services > Credentials
 * 5. Create OAuth 2.0 Client ID (Web application)
 * 6. Add authorized JavaScript origins:
 *    - https://mrdirno.github.io
 *    - http://localhost:5500 (for local testing)
 * 7. Copy the Client ID and paste below
 */

const CONFIG = {
    // Google OAuth Client ID - REPLACE WITH YOUR ACTUAL CLIENT ID
    GOOGLE_CLIENT_ID: 'YOUR_CLIENT_ID.apps.googleusercontent.com',

    // Authorized email addresses (only these can access the portal)
    AUTHORIZED_EMAILS: [
        'drinoman@gmail.com'
    ],

    // Session duration in milliseconds (24 hours)
    SESSION_DURATION: 24 * 60 * 60 * 1000,

    // App name shown in Google sign-in
    APP_NAME: 'DUALITY Chat Portal',

    // Storage keys
    STORAGE_KEYS: {
        SESSION: 'duality_session',
        CHATS: 'duality_chats',
        USER: 'duality_user'
    }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.AUTHORIZED_EMAILS);
Object.freeze(CONFIG.STORAGE_KEYS);

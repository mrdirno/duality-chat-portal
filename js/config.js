/**
 * DUALITY Chat Portal Configuration
 */

const CONFIG = {
    // Firebase Configuration
    FIREBASE: {
        apiKey: "AIzaSyBGcUUY27MpHq9_Ss-zVuo1Vaj1Rf5A0Fs",
        authDomain: "mrdirno.github.io",
        projectId: "duality-chat-portal"
    },

    // Authorized email addresses (only these can access the portal)
    AUTHORIZED_EMAILS: [
        'drinoman@gmail.com'
    ],

    // App name
    APP_NAME: 'DUALITY Chat Portal',

    // Storage keys
    STORAGE_KEYS: {
        CHATS: 'duality_chats',
        USER: 'duality_user'
    }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.FIREBASE);
Object.freeze(CONFIG.AUTHORIZED_EMAILS);
Object.freeze(CONFIG.STORAGE_KEYS);

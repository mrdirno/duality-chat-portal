/**
 * Spark Chat - Firestore-backed messaging
 * Mirrors local Spark system for global access
 *
 * IMPORTANT: Uses Firebase modular SDK for named database support
 */

class SparkChat {
    constructor() {
        this.db = null;
        this.unsubscribe = null;
        this.messagesContainer = null;
        this.user = null;
        this.firestoreModule = null;
    }

    /**
     * Initialize Firestore connection with NAMED DATABASE
     * Uses Firebase modular SDK - initializes its own app instance for Firestore
     */
    async init(user) {
        this.user = user;
        const dbName = 'helios-spark-zero';

        try {
            // Import modular SDK functions
            const firestoreModule = await import(
                'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js'
            );
            const appModule = await import(
                'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js'
            );

            const { getFirestore, collection, query, orderBy, limitToLast,
                    onSnapshot, addDoc, serverTimestamp } = firestoreModule;
            const { initializeApp, getApps } = appModule;

            // Store module references for later use
            this.firestoreModule = { collection, query, orderBy, limitToLast,
                                     onSnapshot, addDoc, serverTimestamp };

            // Initialize a SEPARATE Firebase app for Firestore using modular SDK
            // This avoids conflicts with the compat SDK used for auth
            const firestoreAppName = 'firestore-app';
            let app;

            // Check if app already exists to avoid re-initialization errors
            const existingApps = getApps();
            const existingApp = existingApps.find(a => a.name === firestoreAppName);

            if (existingApp) {
                app = existingApp;
            } else {
                // Initialize new app with same config (from CONFIG global)
                app = initializeApp(CONFIG.FIREBASE, firestoreAppName);
            }

            // Get Firestore instance with NAMED DATABASE
            this.db = getFirestore(app, dbName);

            console.log(`Firestore connected to named database: ${dbName}`);

        } catch (e) {
            console.error("Firestore init failed:", e);
            const errorMsg = `Firestore Error: ${e.message}\n\nCheck console for details.`;
            alert(errorMsg);
            this.showError("Failed to initialize database");
            return;
        }

        this.messagesContainer = document.getElementById('messages-container');

        // Start listening for messages
        this.subscribeToMessages();

        // Update connection status
        this.setConnectionStatus('connected', 'Connected');
    }

    /**
     * Set connection status indicator
     */
    setConnectionStatus(status, text) {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.className = `connection-status ${status}`;
            statusEl.querySelector('.status-text').textContent = text;
        }
    }

    /**
     * Subscribe to messages collection (real-time) using modular SDK
     */
    subscribeToMessages() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        if (!this.db || !this.firestoreModule) return;

        const { collection, query, orderBy, limitToLast, onSnapshot } = this.firestoreModule;

        // Build query with modular SDK
        const messagesRef = collection(this.db, 'spark_messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'), limitToLast(100));

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            // Clear welcome message on first real message
            const welcomeMsg = this.messagesContainer.querySelector('.welcome-msg');
            if (welcomeMsg && snapshot.docs.length > 0) {
                welcomeMsg.remove();
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    this.renderMessage(change.doc.data(), change.doc.id);
                }
            });

            // Scroll to bottom
            this.scrollToBottom();
        }, (error) => {
            console.error('Firestore subscription error:', error);
            this.setConnectionStatus('error', 'Sync Error');
            // Expose error to user for debugging
            if (error.message && error.message.includes('permission-denied')) {
                this.showError("Database Permission Denied - check rules");
            }
        });
    }

    /**
     * Send a message using modular SDK
     */
    async sendMessage(text) {
        if (!text.trim()) return false;
        if (!this.db || !this.firestoreModule) {
            this.showError("Database not connected");
            return false;
        }

        const { collection, addDoc, serverTimestamp } = this.firestoreModule;

        const message = {
            text: text.trim(),
            sender: 'user',
            senderEmail: this.user.email,
            senderName: this.user.name || this.user.email,
            timestamp: serverTimestamp(),
            status: 'pending', // pending, processing, completed
            source: 'web_portal'
        };

        try {
            const messagesRef = collection(this.db, 'spark_messages');
            const docRef = await addDoc(messagesRef, message);
            console.log("Message sent to Firestore:", docRef.id);
            return true;
        } catch (error) {
            console.error('Send error:', error);
            // Alert for debugging
            alert(`Send Error: ${error.message}`);
            this.showError('Failed to send message');
            return false;
        }
    }

    /**
     * Render a message - BULLETPROOF SIMPLE VERSION
     */
    renderMessage(msg, id) {
        if (document.getElementById(`msg-${id}`)) return;

        const isUser = msg.sender === 'user';
        const div = document.createElement('div');
        div.id = `msg-${id}`;
        div.className = `message ${isUser ? 'from-user' : 'from-spark'}`;

        const time = msg.timestamp
            ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            : 'now';

        const name = isUser ? 'You' : (msg.senderName || 'SPARK');
        const avatar = isUser ? '👤' : '🤖';

        div.innerHTML = `
            <div class="msg-line">
                <span class="avatar">${avatar}</span>
                <strong>${this.escapeHtml(name)}</strong>
                <span class="time">${time}</span>
            </div>
            <div class="msg-text">${this.escapeHtml(msg.text)}</div>
        `;

        this.messagesContainer.appendChild(div);
    }

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show error message
     */
    showError(text) {
        // Could add toast notification here
        console.error(text);
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

// Create singleton
window.sparkChat = new SparkChat();

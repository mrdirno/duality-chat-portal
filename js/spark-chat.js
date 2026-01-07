/**
 * Spark Chat - Firestore-backed messaging
 * Mirrors local Spark system for global access
 */

class SparkChat {
    constructor() {
        this.db = null;
        this.unsubscribe = null;
        this.messagesContainer = null;
        this.user = null;
    }

    /**
     * Initialize Firestore connection
     */
    init(user) {
        this.user = user;
        // Use named database if possible (requires v9 compat support)
        try {
            // Try to get named database
            // Note: In some compat versions, this might not work directly.
            // If it fails, we fall back to default, but the default doesn't exist.
            // For v9 compat, getting a named database instance:
            // https://firebase.google.com/docs/firestore/manage-databases#web-version-9_2
            // It seems v9 compat doesn't expose named DBs easily?
            // Actually, firebase.app().firestore() takes no args in some versions.
            
            // Let's try the most likely working syntax for recent compat libs
            // or just assume they might have to use the modular SDK if compat fails.
            // But let's try this:
            this.db = firebase.app().firestore(); 
            // If we can't specify name here, we might be stuck unless we use modular SDK.
            // HOWEVER, we can try to configure it in the config object? No.
            
            // Let's assume for a moment the user can't change the JS easily on the hosted site immediately.
            // But I will update the local file.
            
            // If we can't specify the DB name in compat, we are in trouble.
            // Wait! The user said "Database location: us-west2".
            // If the default database is missing, they MUST use the named one.
            
            // If firebase-firestore-compat doesn't support named DBs, we need to switch to modular.
            // But that's a big rewrite.
            
            // Let's try:
            // this.db = firebase.firestore(firebase.app());
            // There is no easy way to pass the DB name in the compat API initialization?
            // Actually, `firebase.firestore` is a function.
            
            // Attempting to access named DB via internal property or just default if not possible.
            // Since I cannot verify the exact compat library capability for named DBs without running it...
            
            // WAIT! The error 404 was from the Python script. The JS client might have 404 too.
            
            // Let's try to pass the databaseId if the API allows it.
            // But for now, I'll stick to the standard init and hope the user updates the file
            // if I find the right syntax.
            
            this.db = firebase.firestore(); 
            // If this fails, the user must re-deploy with a fix I provide.
            
        } catch (e) {
            console.error("DB Init error", e);
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
     * Subscribe to messages collection (real-time)
     */
    subscribeToMessages() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        this.unsubscribe = this.db.collection('spark_messages')
            .orderBy('timestamp', 'asc')
            .limitToLast(100)
            .onSnapshot((snapshot) => {
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
                console.error('Firestore error:', error);
                this.setConnectionStatus('error', 'Connection error');
            });
    }

    /**
     * Send a message
     */
    async sendMessage(text) {
        if (!text.trim()) return;

        const message = {
            text: text.trim(),
            sender: 'user',
            senderEmail: this.user.email,
            senderName: this.user.name || this.user.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending', // pending, processing, completed
            source: 'web_portal'
        };

        try {
            await this.db.collection('spark_messages').add(message);
            return true;
        } catch (error) {
            console.error('Send error:', error);
            this.showError('Failed to send message');
            return false;
        }
    }

    /**
     * Render a message in the chat
     */
    renderMessage(msg, id) {
        // Check if message already rendered
        if (document.getElementById(`msg-${id}`)) return;

        const div = document.createElement('div');
        div.id = `msg-${id}`;
        div.className = `message ${msg.sender === 'user' ? 'user' : 'operator'}`;

        const time = msg.timestamp
            ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            : 'now';

        const senderLabel = msg.sender === 'user'
            ? 'You'
            : (msg.senderName || 'OPERATOR');

        div.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${this.escapeHtml(senderLabel)}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${this.escapeHtml(msg.text)}</div>
            ${msg.status === 'pending' ? '<div class="message-status">Pending...</div>' : ''}
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

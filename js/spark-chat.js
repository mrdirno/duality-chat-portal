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
        const dbName = 'helios-spark-zero';
        
        try {
            // Attempt 1: Specific named database
            this.db = firebase.app().firestore(dbName);
            console.log(`Firestore connected to: ${dbName}`);
        } catch (e) {
            console.warn("Named DB init failed, trying default", e);
            try {
                // Attempt 2: Default database
                this.db = firebase.firestore();
                console.log("Firestore connected to: (default)");
            } catch (e2) {
                console.error("Firestore initialization failed completely", e2);
                this.showError("Failed to initialize database");
            }
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

        if (!this.db) return;

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
                console.error('Firestore subscription error:', error);
                this.setConnectionStatus('error', 'Sync Error');
                // Expose error to user for debugging
                if (error.message.includes('permission-denied')) {
                    this.showError("Database Permission Denied - check rules");
                }
            });
    }

    /**
     * Send a message
     */
    async sendMessage(text) {
        if (!text.trim()) return;
        if (!this.db) {
            this.showError("Database not connected");
            return false;
        }

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
            console.log("Message sent to Firestore");
            return true;
        } catch (error) {
            console.error('Send error:', error);
            // ALWAY ALERT ON ERROR TO EXPOSE CAUSE
            alert(`Portal Error: ${error.message}\nDatabase: ${this.db._databaseId?.database || 'unknown'}`);
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

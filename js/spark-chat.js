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
        this.db = firebase.firestore();
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

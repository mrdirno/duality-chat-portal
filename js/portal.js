/**
 * Chat Portal Manager
 * Handles chat data loading, display, search, and export
 */

class PortalManager {
    constructor() {
        this.sessions = [];
        this.currentSession = null;
        this.dataUrl = 'data/chats.json'; // Default data location
    }

    /**
     * Initialize the portal
     */
    async init() {
        await this.loadSessions();
        this.updateStats();
        this.renderSessionList();
        this.setupEventListeners();
        this.startSessionTimer();
    }

    /**
     * Load chat sessions from data source
     */
    async loadSessions() {
        try {
            // Try to load from local storage first (for demo/testing)
            const cached = localStorage.getItem('duality_chats');
            if (cached) {
                this.sessions = JSON.parse(cached);
                return;
            }

            // Try to fetch from data file
            const response = await fetch(this.dataUrl);
            if (response.ok) {
                this.sessions = await response.json();
                localStorage.setItem('duality_chats', JSON.stringify(this.sessions));
            } else {
                // Initialize with demo data
                this.sessions = this.getDemoSessions();
            }
        } catch (e) {
            console.log('Using demo sessions:', e);
            this.sessions = this.getDemoSessions();
        }
    }

    /**
     * Get demo sessions for initial setup
     */
    getDemoSessions() {
        return [
            {
                id: 'session_001',
                title: 'Getting Started with DUALITY',
                date: new Date().toISOString(),
                messages: [
                    {
                        role: 'user',
                        content: 'How do I set up the chat portal?',
                        timestamp: new Date().toISOString()
                    },
                    {
                        role: 'assistant',
                        content: 'Welcome to DUALITY Chat Portal! Here\'s how to get started:\n\n1. Set up 2FA using your authenticator app\n2. Create a secure password\n3. Access your chat history from anywhere\n\nYour data is encrypted and secure.',
                        timestamp: new Date().toISOString()
                    }
                ]
            }
        ];
    }

    /**
     * Update portal statistics
     */
    updateStats() {
        const totalSessions = this.sessions.length;
        const totalMessages = this.sessions.reduce(
            (sum, s) => sum + (s.messages ? s.messages.length : 0), 0
        );

        const lastSession = this.sessions.length > 0 ? this.sessions[0] : null;
        const lastActive = lastSession
            ? this.formatRelativeTime(new Date(lastSession.date))
            : '--';

        document.getElementById('total-sessions').textContent = totalSessions;
        document.getElementById('total-messages').textContent = totalMessages;
        document.getElementById('last-active').textContent = lastActive;
    }

    /**
     * Format relative time (e.g., "2 hours ago")
     */
    formatRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }

    /**
     * Render session list in sidebar
     */
    renderSessionList(filter = '') {
        const listEl = document.getElementById('session-list');
        listEl.innerHTML = '';

        const filteredSessions = filter
            ? this.sessions.filter(s =>
                s.title.toLowerCase().includes(filter.toLowerCase()) ||
                s.messages?.some(m =>
                    m.content.toLowerCase().includes(filter.toLowerCase())
                )
            )
            : this.sessions;

        filteredSessions.forEach(session => {
            const li = document.createElement('li');
            li.dataset.id = session.id;
            if (this.currentSession?.id === session.id) {
                li.classList.add('active');
            }

            li.innerHTML = `
                <div class="session-title">${this.escapeHtml(session.title)}</div>
                <div class="session-date">${this.formatRelativeTime(new Date(session.date))}</div>
            `;

            li.addEventListener('click', () => this.loadSession(session.id));
            listEl.appendChild(li);
        });
    }

    /**
     * Load and display a session
     */
    loadSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        this.currentSession = session;
        this.renderSessionList(); // Update active state

        const contentEl = document.getElementById('chat-content');
        contentEl.innerHTML = `
            <div class="chat-messages">
                <h2 class="session-header">${this.escapeHtml(session.title)}</h2>
                ${session.messages.map(msg => this.renderMessage(msg)).join('')}
            </div>
        `;
    }

    /**
     * Render a single message
     */
    renderMessage(message) {
        const time = new Date(message.timestamp).toLocaleTimeString();
        const roleLabel = message.role === 'user' ? 'You' : 'DUALITY';

        return `
            <div class="message ${message.role}">
                <div class="message-header">
                    <span class="message-role">${roleLabel}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-content">${this.formatContent(message.content)}</div>
            </div>
        `;
    }

    /**
     * Format message content (handle code blocks, markdown basics)
     */
    formatContent(content) {
        // Escape HTML first
        let formatted = this.escapeHtml(content);

        // Code blocks
        formatted = formatted.replace(
            /```(\w*)\n([\s\S]*?)```/g,
            '<pre><code class="language-$1">$2</code></pre>'
        );

        // Inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Italic
        formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('search-chats');
        searchInput.addEventListener('input', (e) => {
            this.renderSessionList(e.target.value);
        });

        // Export
        const exportBtn = document.getElementById('export-btn');
        exportBtn.addEventListener('click', () => this.exportData());

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        logoutBtn.addEventListener('click', () => {
            window.auth.logout();
            window.location.reload();
        });
    }

    /**
     * Start session timer
     */
    startSessionTimer() {
        const timerEl = document.getElementById('session-timer');

        const updateTimer = () => {
            const remaining = window.auth.getSessionRemaining();
            if (remaining <= 0) {
                window.auth.logout();
                window.location.reload();
                return;
            }

            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            timerEl.textContent = `Session: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            // Extend session on activity
            if (remaining < 5 * 60 * 1000) {
                window.auth.extendSession();
            }
        };

        updateTimer();
        setInterval(updateTimer, 1000);

        // Extend session on user activity
        ['click', 'keypress', 'scroll'].forEach(event => {
            document.addEventListener(event, () => window.auth.extendSession());
        });
    }

    /**
     * Export chat data
     */
    exportData() {
        const data = JSON.stringify(this.sessions, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `duality_chats_${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Import chat data
     */
    async importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    this.sessions = data;
                    localStorage.setItem('duality_chats', JSON.stringify(data));
                    this.updateStats();
                    this.renderSessionList();
                    resolve(data.length);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    /**
     * Add a new session
     */
    addSession(session) {
        this.sessions.unshift(session);
        localStorage.setItem('duality_chats', JSON.stringify(this.sessions));
        this.updateStats();
        this.renderSessionList();
    }

    /**
     * Clear all chat data
     */
    clearData() {
        this.sessions = [];
        localStorage.removeItem('duality_chats');
        this.updateStats();
        this.renderSessionList();
        document.getElementById('chat-content').innerHTML = `
            <div class="welcome-message">
                <h2>Welcome to DUALITY Chat Portal</h2>
                <p>No chat sessions available. Import data or sync from your main workspace.</p>
            </div>
        `;
    }
}

// Export singleton instance
window.portal = new PortalManager();

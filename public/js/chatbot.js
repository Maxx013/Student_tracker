// ============================================
// AI Chatbot Component - Floating chat widget
// ============================================
(function () {
    'use strict';

    let chatHistory = [];
    let isOpen = false;
    let isTyping = false;

    // Create chatbot DOM on load
    function initChatbot() {
        const chatHTML = `
      <!-- Chatbot FAB -->
      <button class="chatbot-fab" id="chatbot-fab" onclick="window._chatbot.toggle()" title="AI Study Assistant">
        <i class="fas fa-comment-dots chatbot-fab-icon" id="chatbot-fab-icon"></i>
      </button>

      <!-- Chatbot Panel -->
      <div class="chatbot-panel" id="chatbot-panel">
        <div class="chatbot-header">
          <div class="chatbot-header-info">
            <div class="chatbot-avatar">
              <i class="fas fa-robot"></i>
            </div>
            <div>
              <h4>Study Assistant</h4>
              <span class="chatbot-status">AI-powered help</span>
            </div>
          </div>
          <button class="chatbot-close" onclick="window._chatbot.toggle()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="chatbot-messages" id="chatbot-messages">
          <div class="chatbot-msg bot">
            <div class="chatbot-msg-avatar"><i class="fas fa-robot"></i></div>
            <div class="chatbot-msg-bubble">
              Hi! 👋 I'm your AI study assistant. Ask me anything about your courses, concepts, or exam preparation!
            </div>
          </div>
        </div>

        <div class="chatbot-input-area">
          <input type="text" class="chatbot-input" id="chatbot-input"
            placeholder="Ask a question..." autocomplete="off"
            onkeydown="if(event.key==='Enter') window._chatbot.send()">
          <button class="chatbot-send" id="chatbot-send-btn" onclick="window._chatbot.send()">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    `;

        const wrapper = document.createElement('div');
        wrapper.id = 'chatbot-wrapper';
        wrapper.innerHTML = chatHTML;
        document.body.appendChild(wrapper);
    }

    // Toggle chat open/close
    function toggleChat() {
        isOpen = !isOpen;
        const panel = document.getElementById('chatbot-panel');
        const fab = document.getElementById('chatbot-fab');
        const icon = document.getElementById('chatbot-fab-icon');

        if (isOpen) {
            panel.classList.add('open');
            fab.classList.add('active');
            icon.className = 'fas fa-times chatbot-fab-icon';
            // Focus input
            setTimeout(() => {
                document.getElementById('chatbot-input')?.focus();
            }, 300);
        } else {
            panel.classList.remove('open');
            fab.classList.remove('active');
            icon.className = 'fas fa-comment-dots chatbot-fab-icon';
        }
    }

    // Send message
    async function sendMessage() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        if (!message || isTyping) return;

        input.value = '';

        // Add user message to UI
        appendMessage('user', message);

        // Add to history
        chatHistory.push({ role: 'user', content: message });

        // Show typing indicator
        showTypingIndicator();
        isTyping = true;

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, history: chatHistory })
            });

            const data = await response.json();
            removeTypingIndicator();
            isTyping = false;

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get response');
            }

            const reply = data.reply;
            chatHistory.push({ role: 'assistant', content: reply });
            appendMessage('bot', reply);

        } catch (error) {
            removeTypingIndicator();
            isTyping = false;
            appendMessage('bot', `Sorry, I encountered an error: ${error.message}`);
        }
    }

    // Append message to chat UI
    function appendMessage(type, content) {
        const container = document.getElementById('chatbot-messages');
        const msgDiv = document.createElement('div');
        msgDiv.className = `chatbot-msg ${type}`;

        // Simple markdown rendering for bot messages
        let rendered = content;
        if (type === 'bot' && typeof marked !== 'undefined') {
            try {
                rendered = marked.parse(content);
            } catch (e) {
                rendered = content.replace(/\n/g, '<br>');
            }
        } else {
            rendered = escapeHtml(content);
        }

        if (type === 'user') {
            msgDiv.innerHTML = `
        <div class="chatbot-msg-bubble user-bubble">${rendered}</div>
        <div class="chatbot-msg-avatar user-avatar"><i class="fas fa-user"></i></div>
      `;
        } else {
            msgDiv.innerHTML = `
        <div class="chatbot-msg-avatar"><i class="fas fa-robot"></i></div>
        <div class="chatbot-msg-bubble">${rendered}</div>
      `;
        }

        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }

    // Show typing indicator
    function showTypingIndicator() {
        const container = document.getElementById('chatbot-messages');
        const indicator = document.createElement('div');
        indicator.className = 'chatbot-msg bot chatbot-typing';
        indicator.id = 'chatbot-typing-indicator';
        indicator.innerHTML = `
      <div class="chatbot-msg-avatar"><i class="fas fa-robot"></i></div>
      <div class="chatbot-msg-bubble">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
    }

    // Remove typing indicator
    function removeTypingIndicator() {
        const indicator = document.getElementById('chatbot-typing-indicator');
        if (indicator) indicator.remove();
    }

    // HTML escape
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Expose public methods
    window._chatbot = {
        toggle: toggleChat,
        send: sendMessage
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
        initChatbot();
    }
})();

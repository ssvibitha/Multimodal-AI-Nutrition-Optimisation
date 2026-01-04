(function () {
    // 1. Inject Styles
    const style = document.createElement('style');
    style.textContent = `
        /* Collapsible Chatbot Widget Styles */
        .chatbot-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            font-family: Arial, sans-serif;
        }

        .chatbot-toggle {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            padding: 12px 25px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: bold;
            font-size: 14px;
        }

        .chatbot-toggle:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }

        .chatbot-toggle i {
            font-size: 16px;
        }

        .chatbot-container {
            position: absolute;
            bottom: 70px;
            right: 0;
            width: 350px;
            height: 500px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            display: none;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #e0e0e0;
        }

        .chatbot-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .chatbot-header h3 {
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 16px;
        }

        .chatbot-header i {
            font-size: 18px;
        }

        .close-btn {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 1.2rem;
            padding: 5px;
            transition: opacity 0.3s;
        }

        .close-btn:hover {
            opacity: 0.8;
        }

        .chatbot-messages {
            flex: 1;
            padding: 1rem;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 10px;
            background: #fafafa;
        }

        .message {
            max-width: 80%;
            padding: 12px 16px;
            border-radius: 18px;
            line-height: 1.4;
            word-wrap: break-word;
            font-size: 14px;
        }

        .bot-message {
            align-self: flex-start;
            background: white;
            color: #333;
            border-bottom-left-radius: 5px;
            border: 1px solid #e0e0e0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }

        .user-message {
            align-self: flex-end;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-bottom-right-radius: 5px;
            box-shadow: 0 2px 5px rgba(102, 126, 234, 0.2);
        }

        .chatbot-input {
            padding: 1rem;
            border-top: 1px solid #eee;
            display: flex;
            gap: 10px;
            background: white;
        }

        .chatbot-input input {
            flex: 1;
            padding: 12px 15px;
            border: 1px solid #ddd;
            border-radius: 25px;
            font-size: 14px;
            outline: none;
            transition: border 0.3s;
        }

        .chatbot-input input:focus {
            border-color: #667eea;
            box-shadow: 0 0 5px rgba(102, 126, 234, 0.3);
        }

        .chatbot-input button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            padding: 12px 20px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 45px;
        }

        .chatbot-input button:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 10px rgba(102, 126, 234, 0.4);
        }

        .chatbot-input button i {
            font-size: 16px;
        }

        .typing-indicator {
            display: none;
            padding: 12px 16px;
            background: white;
            border-radius: 18px;
            align-self: flex-start;
            max-width: 60px;
            border: 1px solid #e0e0e0;
        }

        .typing-indicator span {
            height: 8px;
            width: 8px;
            background: #667eea;
            border-radius: 50%;
            display: inline-block;
            margin: 0 2px;
            animation: typing 1.4s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes typing {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-5px); }
        }

        /* Responsive adjustments */
        @media (max-width: 480px) {
            .chatbot-container {
                width: 350px;
                height: 550px;
                right: 10px;
                bottom: 60px;
            }
            
            .chatbot-toggle {
                padding: 10px 20px;
                font-size: 13px;
            }
        }
    `;
    document.head.appendChild(style);

    // 2. Inject Font Awesome
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fontAwesome);

    // 3. Create HTML Structure
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'chatbot-widget';
    widgetContainer.innerHTML = `
        <div class="chatbot-container" id="chatbotContainer">
            <div class="chatbot-header">
                <h3><i class="fas fa-carrot"></i>AI Cooking Assistant</h3>
                <button class="close-btn" id="closeChatbot">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="chatbot-messages" id="chatMessages">
                <div class="message bot-message">
                    Hey there! I'm your personal cooking assistant. Stuck while cooking? I'm here to help!
                </div>
            </div>
            <div class="typing-indicator" id="typingIndicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div class="chatbot-input">
                <input type="text" id="chatInput" placeholder="Ask here...">
                <button id="sendChatBtn">
                    <i class="fas fa-utensils"></i>
                </button>
            </div>
        </div>
        <button class="chatbot-toggle" id="chatbotToggle">
            <i class="fas fa-utensils"></i>
            Cooking Assistant
        </button>
    `;
    document.body.appendChild(widgetContainer);

    // 4. Initialize Functionality
    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotContainer = document.getElementById('chatbotContainer');
    const closeChatbot = document.getElementById('closeChatbot');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const typingIndicator = document.getElementById('typingIndicator');

    let isChatbotOpen = false;

    // Toggle chatbot
    chatbotToggle.addEventListener('click', () => {
        if (!isChatbotOpen) {
            chatbotContainer.style.display = 'flex';
            isChatbotOpen = true;
            // Focus on input when opened
            setTimeout(() => {
                chatInput.focus();
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 100);
        } else {
            chatbotContainer.style.display = 'none';
            isChatbotOpen = false;
        }
    });

    // Close chatbot
    closeChatbot.addEventListener('click', () => {
        chatbotContainer.style.display = 'none';
        isChatbotOpen = false;
    });

    // Determine the base URL from the script tag
    const scriptTag = document.currentScript;
    const scriptUrl = new URL(scriptTag.src);
    const baseUrl = `${scriptUrl.protocol}//${scriptUrl.host}`;

    // Send message function
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Add user message
        addMessage(message, 'user');
        chatInput.value = '';

        // Show typing indicator
        typingIndicator.style.display = 'block';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const response = await fetch(`${baseUrl}/api/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: message })
            });

            const data = await response.json();

            // Hide typing indicator
            typingIndicator.style.display = 'none';

            if (data.success) {
                addMessage(data.response, 'bot');
            } else {
                addMessage("Sorry, I'm having trouble connecting right now.", 'bot');
            }
        } catch (error) {
            console.error('Error:', error);
            typingIndicator.style.display = 'none';
            addMessage("Error connecting to server.", 'bot');
        }
    }

    // Add message to chat
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Event listeners for chatbot
    sendChatBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Close chatbot when clicking outside
    document.addEventListener('click', (e) => {
        if (isChatbotOpen &&
            !chatbotContainer.contains(e.target) &&
            !chatbotToggle.contains(e.target)) {
            chatbotContainer.style.display = 'none';
            isChatbotOpen = false;
        }
    });

})();

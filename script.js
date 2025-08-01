(function () {
    const apiKey = "AIzaSyC_2S2lCkQAeMTPHADt9fjrYmTSTbxjKUQ"; // API key is provided automatically
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const messageScreen = document.getElementById('messageScreen');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const typingIndicator = document.getElementById('typingIndicator');
    let typingIndicatorElement = null;
    let currentAbortController = null;

    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;

        const messageBubble = document.createElement('div');

        if (!isUser) {
            const html = DOMPurify.sanitize(marked.parse(message));
            messageBubble.innerHTML = html;
        } else {
            messageBubble.textContent = message;
        }

        messageBubble.className = `
            max-w-[80%] 
            w-fit 
            overflow-x-auto 
            rounded-xl 
            px-4 
            py-2 
            break-words 
            shadow-sm 
            ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800 bot-message'}
        `;

        messageDiv.appendChild(messageBubble);
        messageScreen.appendChild(messageDiv);

        // Fade-in animation
        messageDiv.style.opacity = 0.5;
        requestAnimationFrame(() => {
            messageDiv.style.opacity = 1;
        });

        messageScreen.scrollTop = messageScreen.scrollHeight;
    }

    function addTypingIndicator() {
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex justify-start`;

        const messageBubble = document.createElement('div');
        messageBubble.className = `max-w-[80%] rounded-xl px-4 py-2 break-words shadow-sm bg-gray-600 text-white`;
        messageBubble.innerHTML = `
            <span class="text-gray-400">Luma is typing</span>
            <span class="typing-dot text-gray-400">.</span>
            <span class="typing-dot text-gray-400">.</span>
            <span class="typing-dot text-gray-400">.</span>
        `;

        messageDiv.appendChild(messageBubble);
        messageScreen.appendChild(messageDiv);
        typingIndicatorElement = messageDiv;
        messageScreen.scrollTop = messageScreen.scrollHeight;
    }

    async function getGeminiResponse(userMessage) {
        // Abort previous request if needed
        if (currentAbortController) {
            currentAbortController.abort();
        }

        const MAX_RETRIES = 5;
        let delay = 1000;

        currentAbortController = new AbortController();

        // 💡 Prompt engineering for concise answers
        const prompt = `
You are Luma, a helpful assistant.
Always give **concise and to-the-point** responses by default.
Only give **long or detailed** responses when the user explicitly asks to "explain", "brief", or "elaborate".

User: ${userMessage}
`;

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    }),
                    signal: currentAbortController.signal
                });

                if (!response.ok) {
                    if (response.status === 429) {
                        console.warn(`Rate limited. Retrying in ${delay}ms...`);
                        await new Promise(res => setTimeout(res, delay));
                        delay *= 2;
                        continue;
                    } else {
                        throw new Error(`API error: ${response.statusText}`);
                    }
                }

                const data = await response.json();
                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    return data.candidates[0].content.parts[0].text;
                } else {
                    throw new Error("Invalid API response format.");
                }

            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log("Request was aborted.");
                    return null;
                }
                if (i === MAX_RETRIES - 1) throw error;
            }
        }
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;

        userInput.disabled = true;
        sendButton.disabled = true;
        sendButton.classList.add('opacity-50', 'cursor-not-allowed');

        addMessage(message, true);
        userInput.value = '';
        userInput.focus();

        addTypingIndicator();

        try {
            const botResponse = await getGeminiResponse(message);

            if (typingIndicatorElement) {
                typingIndicatorElement.remove();
                typingIndicatorElement = null;
            }

            if (botResponse) {
                addMessage(botResponse, false);
            }

        } catch (error) {
            console.error('Failed to get bot response:', error);
            if (typingIndicatorElement) {
                typingIndicatorElement.remove();
                typingIndicatorElement = null;
            }
            addMessage("I'm sorry, I'm having trouble responding right now. Please try again later.", false);
        }

        userInput.disabled = false;
        sendButton.disabled = false;
        sendButton.classList.remove('opacity-50', 'cursor-not-allowed');
        userInput.placeholder = 'Send a message...';
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (!isMobile) {
            userInput.focus();
        }
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Initial welcome
    window.onload = function () {
        addMessage("Hello! I'm Luma, Partner in your Problem. How can I help you today?", false);
    };

    // New chat reset logic
    document.getElementById('newChatButton').addEventListener('click', () => {
        if (currentAbortController) {
            currentAbortController.abort();
            currentAbortController = null;
        }

        if (typingIndicatorElement) {
            typingIndicatorElement.remove();
            typingIndicatorElement = null;
        }

        userInput.disabled = true;
        sendButton.disabled = true;
        sendButton.classList.add('opacity-50', 'cursor-not-allowed');

        messageScreen.innerHTML = '';

        setTimeout(() => {
            userInput.disabled = false;
            sendButton.disabled = false;
            sendButton.classList.remove('opacity-50', 'cursor-not-allowed');
            userInput.value = '';
            userInput.placeholder = 'Send a message...';
            userInput.focus();
            addMessage("Hello! I'm Luma, Partner in your Problem. How can I help you today?", false);
        }, 300);
    });

})();

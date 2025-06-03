const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const chatMessages = document.getElementById('chatMessages');
const chatbox = document.getElementById('chatbox');
const chatbotToggle = document.getElementById('chatbot-toggle');

let conversation = [];

// Toggle Chatbox
chatbotToggle.addEventListener('click', () => {
  chatbox.classList.toggle('hidden');
});

// Send Message on button click or Enter
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Append message to chat window
function appendMessage(sender, text) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', sender);
  messageDiv.textContent = text;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send message function
async function sendMessage() {
  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  appendMessage('user', userMessage);
  userInput.value = '';

  conversation.push({ role: 'user', content: userMessage });

  try {
    const response = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, conversation })
    });

    const data = await response.json();

    if (data.reply) {
      appendMessage('bot', data.reply);
      conversation.push({ role: 'assistant', content: data.reply });
    } else {
      appendMessage('bot', 'Sorry, I did not understand that.');
    }
  } catch (error) {
    console.error('Error:', error);
    appendMessage('bot', 'Something went wrong. Please try again later.');
  }
}

// Welcome message
window.addEventListener('DOMContentLoaded', () => {
  appendMessage('bot', '👋 Hi! I’m the Moral Merry High School assistant. Ask me anything about admissions, timings, or events!');
});

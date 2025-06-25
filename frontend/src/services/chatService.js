// services/chatService.js
import axios from 'axios';
import settingsService from './settingsService';

class ChatService {
    async sendMessage(message, context) {
        const apiKeys = settingsService.getApiKeys();
        const openaiKey = apiKeys.openai;

        if (!openaiKey) {
            throw new Error('OpenAI API key not configured');
        }

        // Make request directly from frontend
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4',
            messages: [
                { role: 'system', content: context },
                { role: 'user', content: message }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    }
}

// Create singleton instance
const chatService = new ChatService();

export default chatService;
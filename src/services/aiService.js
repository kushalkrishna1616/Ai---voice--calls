const Groq = require('groq-sdk');
const logger = require('../config/logger');

class AIService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    
    this.model = process.env.GROQ_MODEL || 'mixtral-8x7b-32768';
    this.temperature = parseFloat(process.env.AI_AGENT_TEMPERATURE) || 0.7;
    this.maxTokens = parseInt(process.env.AI_AGENT_MAX_TOKENS) || 500;
    
    this.systemPrompt = process.env.AI_AGENT_SYSTEM_PROMPT || `
You are a professional and helpful customer service agent. Your role is to:
- Assist customers with their inquiries politely and efficiently
- Ask clarifying questions when needed
- Provide accurate and helpful information
- Maintain a friendly and professional tone
- Keep responses concise and clear for voice conversation
- If you cannot help with something, politely explain and offer alternatives

Important guidelines:
- Keep responses under 3 sentences when possible
- Speak naturally as if in a phone conversation
- Don't use special characters or formatting
- Ask one question at a time
- Be empathetic and understanding
`;
  }

  /**
   * Generate AI response based on conversation history
   */
  async generateResponse(conversationHistory, userMessage) {
    try {
      // Build messages array
      const messages = [
        { role: 'system', content: this.systemPrompt }
      ];

      // Add conversation history
      if (conversationHistory && conversationHistory.length > 0) {
        conversationHistory.forEach(msg => {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          });
        });
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage
      });

      // Call Groq API
      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      });

      const assistantMessage = response.choices[0].message.content;
      
      logger.info('AI response generated successfully');

      return {
        message: assistantMessage,
        usage: response.usage,
        model: response.model
      };

    } catch (error) {
      if (error.response) {
        logger.error('xAI API Error Detail:', JSON.stringify(error.response.data));
      }
      logger.error('Error generating AI response:', error.message);
      throw new Error('Failed to generate AI response: ' + error.message);
    }
  }

  /**
   * Detect user intent from message
   */
  async detectIntent(userMessage, conversationHistory = []) {
    try {
      const intentPrompt = `
Analyze the following customer message and classify the intent.

Common intents:
- billing_inquiry: Questions about bills, payments, charges
- technical_support: Technical issues, troubleshooting
- account_management: Account changes, updates, cancellations
- product_inquiry: Questions about products or services
- complaint: Customer complaints or dissatisfaction
- general_inquiry: General questions or information requests
- appointment: Scheduling or appointment-related
- other: Anything else

Customer message: "${userMessage}"

Respond with ONLY the intent category (lowercase, underscore-separated).
`;

      const response = await this.groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are an intent classification system.' },
          { role: 'user', content: intentPrompt }
        ],
        temperature: 0.3,
        max_tokens: 50
      });

      const intent = response.choices[0].message.content.trim().toLowerCase();
      
      logger.info(`Intent detected: ${intent}`);
      
      return intent;

    } catch (error) {
      logger.error('Error detecting intent:', error.message);
      return 'general_inquiry';
    }
  }

  /**
   * Analyze sentiment of the conversation
   */
  async analyzeSentiment(messages) {
    try {
      const conversationText = messages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .join(' ');

      const sentimentPrompt = `
Analyze the sentiment of the following customer messages.
Respond with ONLY one word: positive, neutral, or negative.

Customer messages: "${conversationText}"
`;

      const response = await this.groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are a sentiment analysis system.' },
          { role: 'user', content: sentimentPrompt }
        ],
        temperature: 0.3,
        max_tokens: 10
      });

      const sentiment = response.choices[0].message.content.trim().toLowerCase();
      
      return sentiment;

    } catch (error) {
      logger.error('Error analyzing sentiment:', error.message);
      return 'neutral';
    }
  }

  /**
   * Generate conversation summary
   */
  async generateSummary(conversation) {
    try {
      const conversationText = conversation
        .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n');

      const summaryPrompt = `
Summarize the following customer service conversation in 2-3 sentences.
Focus on the customer's main issue and how it was addressed.

Conversation:
${conversationText}
`;

      const response = await this.groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'user', content: summaryPrompt }
        ],
        temperature: 0.5,
        max_tokens: 150
      });

      return response.choices[0].message.content;

    } catch (error) {
      logger.error('Error generating summary:', error.message);
      return 'Summary unavailable';
    }
  }

  /**
   * Extract action items from conversation
   */
  async extractActionItems(conversation) {
    try {
      const conversationText = conversation
        .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n');

      const actionPrompt = `
Extract any action items or follow-ups from this conversation.
List each action item on a new line, or respond with "None" if there are no action items.

Conversation:
${conversationText}
`;

      const response = await this.groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'user', content: actionPrompt }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const actionText = response.choices[0].message.content.trim();
      
      if (actionText.toLowerCase() === 'none') {
        return [];
      }

      return actionText.split('\n').filter(item => item.trim().length > 0);

    } catch (error) {
      logger.error('Error extracting action items:', error.message);
      return [];
    }
  }

  /**
   * Determine if conversation should end
   */
  shouldEndConversation(aiResponse) {
    const endPhrases = [
      'goodbye',
      'have a great day',
      'thank you for calling',
      'is there anything else',
      'anything else I can help'
    ];

    const lowerResponse = aiResponse.toLowerCase();
    return endPhrases.some(phrase => lowerResponse.includes(phrase));
  }
}

module.exports = new AIService();

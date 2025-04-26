import { McpConfig, ChatCompletionRequest, ChatCompletionResponse } from '../types';

// This service handles communication with the backend for chat completions and LLM configuration.
export const modelService = {
  // Send a chat completion request to the backend.
  async sendChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const { conversationId, model, message, apiKey } = request;

    const authToken = localStorage.getItem('authToken'); // Get token from local storage

    if (!authToken) {
      console.warn('Authentication token not found in local storage. User might not be logged in.');
      throw new Error('Authentication token not found.');
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/chat/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`, // Include token in Authorization header
      },
      body: JSON.stringify({
        conversation_id: conversationId, // Include conversationId if it exists
        model,
        message,
        api_key_id: apiKey, // Assuming apiKey is actually the api_key_id
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error generating chat completion: ${errorData.detail || response.statusText}`);
    }

    return response.json();
  },

  // Fetch configured LLMs from the backend
  async getConfiguredLlms(): Promise<McpConfig[]> {
    try {
      const authToken = localStorage.getItem('authToken'); // Get token from local storage

      if (!authToken) {
        console.warn('Authentication token not found in local storage. User might not be logged in.');
        // Depending on the application flow, you might want to redirect to login here
        return []; // Return empty array if no token
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/llms/configured`, {
        headers: {
          'Authorization': `Bearer ${authToken}`, // Include token in Authorization header
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const configuredLlms: McpConfig[] = await response.json();
      return configuredLlms;
    } catch (error) {
      console.error('Error fetching configured LLMs:', error);
      throw error; // Re-throw the error to be handled by the caller
    }
  }
};

import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMConfig,
  LLMRequest,
  LLMResponse,
  LLMService,
} from '../types/index.js';
import {
  LLMAuthenticationError,
  LLMError,
  LLMNetworkError,
  LLMRateLimitError,
} from '../types/index.js';
import { validateApiKey } from '../utils/errors.js';

export class AnthropicService implements LLMService {
  private client: Anthropic;
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    validateApiKey();

    this.config = {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 500,
      retries: 3,
      timeout: 30000,
      ...config,
    };

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
    });
  }

  async generateContent(request: LLMRequest): Promise<LLMResponse> {
    const maxRetries = this.config.retries;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: request.model || this.config.model,
          max_tokens: request.maxTokens || this.config.maxTokens,
          system: request.systemPrompt,
          messages: [
            {
              role: 'user',
              content: request.userPrompt,
            },
          ],
        });

        // Validate response format
        if (!response.content[0] || !('text' in response.content[0])) {
          throw new Error('Invalid response format from API');
        }

        const content = response.content[0].text.trim();

        return {
          content,
          usage: {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens:
              response.usage.input_tokens + response.usage.output_tokens,
          },
        };
      } catch (error: any) {
        const wrappedError = this.wrapError(error);

        // Handle authentication errors immediately - throw instead of fallback
        if (wrappedError instanceof LLMAuthenticationError) {
          throw wrappedError;
        }

        // Retry on retryable errors
        if (wrappedError.retryable && attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Throw error if not retryable or max retries reached
        throw wrappedError;
      }
    }

    throw new LLMNetworkError('Failed to get response after all retries');
  }

  async isHealthy(): Promise<boolean> {
    try {
      const testRequest: LLMRequest = {
        systemPrompt: 'You are a helpful assistant.',
        userPrompt: 'Say "healthy" if you can respond.',
        maxTokens: 10,
      };

      const response = await this.generateContent(testRequest);
      return response.content.toLowerCase().includes('healthy');
    } catch (error) {
      return false;
    }
  }

  private wrapError(error: any): LLMError {
    // Anthropic-specific error handling
    if (
      error.status === 401 ||
      error.message?.includes('authentication_error')
    ) {
      return new LLMAuthenticationError(
        error.message || 'Authentication failed'
      );
    }

    if (error.status === 429 || error.message?.includes('rate_limit')) {
      return new LLMRateLimitError(error.message || 'Rate limit exceeded');
    }

    if (
      error.status >= 500 ||
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT'
    ) {
      return new LLMNetworkError(error.message || 'Network error');
    }

    // Generic network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new LLMNetworkError(error.message || 'Network connection failed');
    }

    // Default to non-retryable error
    return new LLMError(
      error.message || 'Unknown LLM error',
      'UNKNOWN_ERROR',
      false
    );
  }
}

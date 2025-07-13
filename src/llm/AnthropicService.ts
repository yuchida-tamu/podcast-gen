import Anthropic from '@anthropic-ai/sdk';
import { APIClient } from '../core/APIClient.js';
import type {
  APIClientConfig,
  LLMConfig,
  LLMRequest,
  LLMResponse,
  LLMService,
} from '../types/index.js';
import { validateApiKey } from '../utils/errors.js';

export class AnthropicService
  extends APIClient<LLMRequest, LLMResponse>
  implements LLMService
{
  private client: Anthropic;
  private llmConfig: LLMConfig;

  constructor(client: Anthropic, config?: Partial<LLMConfig>) {
    validateApiKey();

    const llmConfig: LLMConfig = {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 500,
      ...config,
    };

    // Map LLM config to API config for APIClient
    const apiConfig: APIClientConfig = {
      retries: 3,
      timeout: 30000,
      baseDelay: 1000,
      maxDelay: 10000,
    };

    super(apiConfig);
    this.llmConfig = llmConfig;
    this.client = client;
  }

  // Implement the abstract fetch method from APIClient
  protected async fetch(request: LLMRequest): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: this.llmConfig.model,
      max_tokens: this.llmConfig.maxTokens,
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
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  // Implement LLMService interface
  async generateContent(request: LLMRequest): Promise<LLMResponse> {
    return this.executeWithRetry(request);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const testRequest: LLMRequest = {
        systemPrompt: 'You are a helpful assistant.',
        userPrompt: 'Say "healthy" if you can respond.',
      };

      const response = await this.generateContent(testRequest);
      return response.content.toLowerCase().includes('healthy');
    } catch (error) {
      return false;
    }
  }
}

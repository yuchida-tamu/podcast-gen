import OpenAI from 'openai';
import { APIClient } from '../core/APIClient.js';
import type {
  APIClientConfig,
  LLMConfig,
  LLMRequest,
  LLMResponse,
  LLMService,
} from '../types/index.js';
import { validateApiKey } from '../utils/errors.js';

export class OpenAIService
  extends APIClient<LLMRequest, LLMResponse>
  implements LLMService
{
  private client: OpenAI;
  private llmConfig: LLMConfig;

  constructor(client: OpenAI, config?: Partial<LLMConfig>) {
    validateApiKey();

    const llmConfig: LLMConfig = {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4o',
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
    const response = await this.client.chat.completions.create({
      model: this.llmConfig.model,
      max_tokens: this.llmConfig.maxTokens,
      messages: [
        {
          role: 'system',
          content: request.systemPrompt,
        },
        {
          role: 'user',
          content: request.userPrompt,
        },
      ],
    });

    // Validate response format
    if (!response.choices[0]?.message?.content) {
      throw new Error('Invalid response format from API');
    }

    const content = response.choices[0].message.content.trim();

    return {
      content,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
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
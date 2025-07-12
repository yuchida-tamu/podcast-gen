import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMConfig,
  LLMRequest,
  LLMResponse,
  LLMService,
  APIClientConfig,
} from '../types/index.js';
import { validateApiKey } from '../utils/errors.js';
import { APIClient } from './APIClient.js';

class AnthropicAPIClient extends APIClient {
  private client: Anthropic;
  private llmConfig: LLMConfig;

  constructor(llmConfig: LLMConfig, apiConfig?: Partial<APIClientConfig>) {
    // Map LLM config to API config for backward compatibility
    const mappedApiConfig = {
      retries: llmConfig.retries,
      timeout: llmConfig.timeout,
      baseDelay: 1000,
      maxDelay: 10000,
      ...apiConfig
    };
    
    super(mappedApiConfig);
    this.llmConfig = llmConfig;
    this.client = new Anthropic({
      apiKey: llmConfig.apiKey,
    });
  }

  async callAnthropicAPI(request: LLMRequest): Promise<LLMResponse> {
    const operation = async (): Promise<LLMResponse> => {
      const response = await this.client.messages.create({
        model: request.model || this.llmConfig.model,
        max_tokens: request.maxTokens || this.llmConfig.maxTokens,
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
    };

    return this.executeWithRetry(operation, this.createStandardErrorHandler());
  }
}

export class AnthropicService implements LLMService {
  private apiClient: AnthropicAPIClient;
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

    this.apiClient = new AnthropicAPIClient(this.config);
  }

  async generateContent(request: LLMRequest): Promise<LLMResponse> {
    return this.apiClient.callAnthropicAPI(request);
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
}

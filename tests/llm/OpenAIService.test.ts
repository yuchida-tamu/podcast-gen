import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIService } from '../../src/llm/OpenAIService.js';
import {
  LLMAuthenticationError,
  LLMNetworkError,
  type LLMRequest,
  type LLMConfig,
} from '../../src/types/index.js';

// Mock the validateApiKey function
vi.mock('../../src/utils/errors.js', () => ({
  validateApiKey: vi.fn(),
}));

// Mock OpenAI SDK
vi.mock('openai');

describe('OpenAIService', () => {
  let mockOpenAIClient: any;
  let openaiService: OpenAIService;
  let mockChatCompletions: any;

  beforeEach(() => {
    // Set up environment variable
    process.env.OPENAI_API_KEY = 'test-openai-key';

    // Create mock for chat completions
    mockChatCompletions = {
      create: vi.fn(),
    };

    // Create mock OpenAI client
    mockOpenAIClient = {
      chat: {
        completions: mockChatCompletions,
      },
    };

    // Create service instance
    openaiService = new OpenAIService(mockOpenAIClient);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  describe('Constructor', () => {
    test('shouldCreateInstanceWithDefaultConfig', () => {
      const service = new OpenAIService(mockOpenAIClient);
      expect(service).toBeDefined();
    });

    test('shouldCreateInstanceWithCustomConfig', () => {
      const customConfig: Partial<LLMConfig> = {
        model: 'gpt-4',
        maxTokens: 1000,
      };
      const service = new OpenAIService(mockOpenAIClient, customConfig);
      expect(service).toBeDefined();
    });
  });

  describe('generateContent', () => {
    test('shouldGenerateContentSuccessfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'This is a test response from OpenAI',
            },
          },
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 25,
          total_tokens: 75,
        },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const request: LLMRequest = {
        systemPrompt: 'You are a helpful assistant.',
        userPrompt: 'Generate a test response.',
      };

      const result = await openaiService.generateContent(request);

      expect(result).toEqual({
        content: 'This is a test response from OpenAI',
        usage: {
          promptTokens: 50,
          completionTokens: 25,
          totalTokens: 75,
        },
      });

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.',
          },
          {
            role: 'user',
            content: 'Generate a test response.',
          },
        ],
      });
    });

    test('shouldHandleMissingUsageInformation', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response without usage info',
            },
          },
        ],
        // No usage field
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const request: LLMRequest = {
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt',
      };

      const result = await openaiService.generateContent(request);

      expect(result).toEqual({
        content: 'Response without usage info',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      });
    });

    test('shouldThrowErrorOnInvalidResponse', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              // Missing content
            },
          },
        ],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const request: LLMRequest = {
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt',
      };

      await expect(openaiService.generateContent(request)).rejects.toThrow(
        'Invalid response format from API'
      );
    });

    test('shouldThrowErrorOnEmptyChoices', async () => {
      const mockResponse = {
        choices: [],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const request: LLMRequest = {
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt',
      };

      await expect(openaiService.generateContent(request)).rejects.toThrow(
        'Invalid response format from API'
      );
    });
  });

  describe('isHealthy', () => {
    test('shouldReturnTrueWhenHealthy', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'healthy',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const result = await openaiService.isHealthy();
      expect(result).toBe(true);
    });

    test('shouldReturnTrueWhenResponseContainsHealthy', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'I am healthy and ready to assist you!',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 10,
          total_tokens: 20,
        },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const result = await openaiService.isHealthy();
      expect(result).toBe(true);
    });

    test('shouldReturnFalseWhenResponseDoesNotContainHealthy', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'I am ready to help you.',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18,
        },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const result = await openaiService.isHealthy();
      expect(result).toBe(false);
    });

    test('shouldReturnFalseOnError', async () => {
      mockChatCompletions.create.mockRejectedValue(new Error('API Error'));

      const result = await openaiService.isHealthy();
      expect(result).toBe(false);
    });
  });

  describe('Error Handling and Retry Logic', () => {
    test('shouldRetryOnRetryableError', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;

      const successResponse = {
        choices: [
          {
            message: {
              content: 'Success after retry',
            },
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 10,
          total_tokens: 30,
        },
      };

      mockChatCompletions.create
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(successResponse);

      const request: LLMRequest = {
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt',
      };

      const result = await openaiService.generateContent(request);
      expect(result.content).toBe('Success after retry');
      expect(mockChatCompletions.create).toHaveBeenCalledTimes(2);
    });

    test('shouldNotRetryOnAuthenticationError', async () => {
      const authError = new Error('Authentication failed');
      (authError as any).status = 401;

      mockChatCompletions.create.mockRejectedValue(authError);

      const request: LLMRequest = {
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt',
      };

      await expect(openaiService.generateContent(request)).rejects.toThrow(
        LLMAuthenticationError
      );

      expect(mockChatCompletions.create).toHaveBeenCalledTimes(1);
    });

    test('shouldThrowAfterMaxRetries', async () => {
      const networkError = new Error('Network error');
      (networkError as any).status = 500;

      mockChatCompletions.create.mockRejectedValue(networkError);

      const customService = new OpenAIService(mockOpenAIClient);

      const request: LLMRequest = {
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt',
      };

      await expect(customService.generateContent(request)).rejects.toThrow(
        LLMNetworkError
      );

      expect(mockChatCompletions.create).toHaveBeenCalledTimes(3); // Default retry count
    });
  });

  describe('Custom Configuration', () => {
    test('shouldUseCustomModel', async () => {
      const customConfig: Partial<LLMConfig> = {
        model: 'gpt-4',
      };

      const customService = new OpenAIService(mockOpenAIClient, customConfig);

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response from GPT-4',
            },
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 8,
          total_tokens: 23,
        },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const request: LLMRequest = {
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt',
      };

      await customService.generateContent(request);

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        max_tokens: 500, // Default
        messages: expect.any(Array),
      });
    });

    test('shouldUseCustomMaxTokens', async () => {
      const customConfig: Partial<LLMConfig> = {
        maxTokens: 1000,
      };

      const customService = new OpenAIService(mockOpenAIClient, customConfig);

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response with custom max tokens',
            },
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 15,
          total_tokens: 35,
        },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const request: LLMRequest = {
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt',
      };

      await customService.generateContent(request);

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
        model: 'gpt-4o', // Default
        max_tokens: 1000,
        messages: expect.any(Array),
      });
    });
  });

  describe('Response Format Validation', () => {
    test('shouldTrimWhitespaceFromContent', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '  \n  Response with whitespace  \n  ',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse);

      const request: LLMRequest = {
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt',
      };

      const result = await openaiService.generateContent(request);
      expect(result.content).toBe('Response with whitespace');
    });
  });
});
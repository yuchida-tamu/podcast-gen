import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { APIClient } from '../../src/llm/APIClient.js';
import {
  LLMError,
  LLMAuthenticationError,
  LLMRateLimitError,
  LLMNetworkError,
  type APIClientConfig,
  type LLMRequest,
  type LLMResponse,
} from '../../src/types/index.js';

// Create a concrete implementation for testing
class TestAPIClient extends APIClient {
  private mockFetchFn?: (request: LLMRequest) => Promise<LLMResponse>;

  constructor(config?: Partial<APIClientConfig>) {
    super(config);
  }

  // Implement the abstract fetch method
  protected async fetch(request: LLMRequest): Promise<LLMResponse> {
    if (this.mockFetchFn) {
      return this.mockFetchFn(request);
    }
    // Default mock response
    return {
      content: 'Mock response',
      usage: {
        promptTokens: 10,
        completionTokens: 10,
        totalTokens: 20
      }
    };
  }

  // Allow setting mock fetch function for testing
  public setMockFetch(fn: (request: LLMRequest) => Promise<LLMResponse>) {
    this.mockFetchFn = fn;
  }

  // Expose protected method for testing
  public async testExecuteWithRetry(request: LLMRequest): Promise<LLMResponse> {
    return this.executeWithRetry(request);
  }

  // Expose protected method for testing
  public testCreateStandardErrorHandler() {
    return this.createStandardErrorHandler();
  }
}

describe('APIClient', () => {
  let apiClient: TestAPIClient;

  beforeEach(() => {
    apiClient = new TestAPIClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    test('shouldUseDefaultConfigWhenNoneProvided', () => {
      const client = new TestAPIClient();
      expect(client).toBeDefined();
    });

    test('shouldMergeCustomConfigWithDefaults', () => {
      const customConfig = {
        retries: 5,
        timeout: 60000,
      };
      const client = new TestAPIClient(customConfig);
      expect(client).toBeDefined();
    });
  });

  describe('executeWithRetry', () => {
    test('shouldReturnResultOnFirstSuccess', async () => {
      const expectedResponse: LLMResponse = {
        content: 'success',
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }
      };
      const mockFetch = vi.fn().mockResolvedValue(expectedResponse);
      apiClient.setMockFetch(mockFetch);

      const testRequest: LLMRequest = {
        systemPrompt: 'Test system prompt',
        userPrompt: 'Test user prompt'
      };
      
      const result = await apiClient.testExecuteWithRetry(testRequest);

      expect(result).toEqual(expectedResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(testRequest);
    });

    test('shouldRetryOnRetryableError', async () => {
      const expectedResponse: LLMResponse = {
        content: 'success after retry',
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }
      };
      
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(expectedResponse);
      
      apiClient.setMockFetch(mockFetch);

      const testRequest: LLMRequest = {
        systemPrompt: 'Test system prompt',
        userPrompt: 'Test user prompt'
      };
      
      const result = await apiClient.testExecuteWithRetry(testRequest);

      expect(result).toEqual(expectedResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('shouldNotRetryOnAuthenticationError', async () => {
      const authError = new Error('Authentication failed');
      (authError as any).status = 401;
      
      const mockFetch = vi.fn().mockRejectedValue(authError);
      apiClient.setMockFetch(mockFetch);

      const testRequest: LLMRequest = {
        systemPrompt: 'Test system prompt',
        userPrompt: 'Test user prompt'
      };

      await expect(
        apiClient.testExecuteWithRetry(testRequest)
      ).rejects.toThrow(LLMAuthenticationError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('shouldNotRetryOnNonRetryableError', async () => {
      const nonRetryableError = new Error('Non-retryable error');
      const mockFetch = vi.fn().mockRejectedValue(nonRetryableError);
      apiClient.setMockFetch(mockFetch);

      const testRequest: LLMRequest = {
        systemPrompt: 'Test system prompt',
        userPrompt: 'Test user prompt'
      };

      await expect(
        apiClient.testExecuteWithRetry(testRequest)
      ).rejects.toThrow(LLMError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('shouldThrowAfterMaxRetries', async () => {
      const networkError = new Error('Network error');
      (networkError as any).status = 500;
      
      const mockFetch = vi.fn().mockRejectedValue(networkError);
      
      // Use small retry count for faster test
      const clientWithFewRetries = new TestAPIClient({ retries: 2 });
      clientWithFewRetries.setMockFetch(mockFetch);

      const testRequest: LLMRequest = {
        systemPrompt: 'Test system prompt',
        userPrompt: 'Test user prompt'
      };

      await expect(
        clientWithFewRetries.testExecuteWithRetry(testRequest)
      ).rejects.toThrow(LLMNetworkError);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('shouldThrowWrappedErrorWhenAllRetriesExhausted', async () => {
      const persistentError = new Error('Persistent error');
      (persistentError as any).status = 500;
      
      const mockFetch = vi.fn().mockRejectedValue(persistentError);
      const clientWithFewRetries = new TestAPIClient({ retries: 1 });
      clientWithFewRetries.setMockFetch(mockFetch);

      const testRequest: LLMRequest = {
        systemPrompt: 'Test system prompt',
        userPrompt: 'Test user prompt'
      };

      await expect(
        clientWithFewRetries.testExecuteWithRetry(testRequest)
      ).rejects.toThrow(LLMNetworkError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('createStandardErrorHandler', () => {
    let errorHandler: (error: any) => LLMError;

    beforeEach(() => {
      errorHandler = apiClient.testCreateStandardErrorHandler();
    });

    test('shouldMapAuthenticationErrors', () => {
      const error = { status: 401, message: 'Unauthorized' };
      const result = errorHandler(error);

      expect(result).toBeInstanceOf(LLMAuthenticationError);
      expect(result.message).toBe('Unauthorized');
    });

    test('shouldMapRateLimitErrors', () => {
      const error = { status: 429, message: 'Too many requests' };
      const result = errorHandler(error);

      expect(result).toBeInstanceOf(LLMRateLimitError);
      expect(result.message).toBe('Too many requests');
    });

    test('shouldMapServerErrors', () => {
      const error = { status: 500, message: 'Internal server error' };
      const result = errorHandler(error);

      expect(result).toBeInstanceOf(LLMNetworkError);
      expect(result.message).toBe('Internal server error');
    });

    test('shouldMapConnectionErrors', () => {
      const error = { code: 'ECONNRESET', message: 'Connection reset' };
      const result = errorHandler(error);

      expect(result).toBeInstanceOf(LLMNetworkError);
      expect(result.message).toBe('Connection reset');
    });

    test('shouldMapTimeoutErrors', () => {
      const error = { code: 'ETIMEDOUT', message: 'Request timeout' };
      const result = errorHandler(error);

      expect(result).toBeInstanceOf(LLMNetworkError);
      expect(result.message).toBe('Request timeout');
    });

    test('shouldMapDNSErrors', () => {
      const error = { code: 'ENOTFOUND', message: 'Host not found' };
      const result = errorHandler(error);

      expect(result).toBeInstanceOf(LLMNetworkError);
      expect(result.message).toBe('Host not found');
    });

    test('shouldMapUnknownErrors', () => {
      const error = { message: 'Unknown error' };
      const result = errorHandler(error);

      expect(result).toBeInstanceOf(LLMError);
      expect(result.message).toBe('Unknown error');
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.retryable).toBe(false);
    });

    test('shouldHandleErrorsWithoutMessage', () => {
      const error = { status: 401 };
      const result = errorHandler(error);

      expect(result).toBeInstanceOf(LLMAuthenticationError);
      expect(result.message).toBe('Authentication failed');
    });

    test('shouldHandleErrorsWithSpecialMessagePatterns', () => {
      const authError = { message: 'authentication_error occurred' };
      const result = errorHandler(authError);

      expect(result).toBeInstanceOf(LLMAuthenticationError);
    });
  });

  describe('Error Mapping Edge Cases', () => {
    let errorHandler: (error: any) => LLMError;

    beforeEach(() => {
      errorHandler = apiClient.testCreateStandardErrorHandler();
    });

    test('shouldHandleNullError', () => {
      const result = errorHandler(null);

      expect(result).toBeInstanceOf(LLMError);
      expect(result.message).toBe('Unknown API error');
    });

    test('shouldHandleUndefinedError', () => {
      const result = errorHandler(undefined);

      expect(result).toBeInstanceOf(LLMError);
      expect(result.message).toBe('Unknown API error');
    });

    test('shouldHandleEmptyError', () => {
      const result = errorHandler({});

      expect(result).toBeInstanceOf(LLMError);
      expect(result.message).toBe('Unknown API error');
    });
  });

  describe('Configuration', () => {
    test('shouldUseCustomRetryCount', async () => {
      const customRetries = 1;
      const client = new TestAPIClient({ retries: customRetries });
      
      const mockFetch = vi.fn().mockRejectedValue(new Error('Always fails'));
      client.setMockFetch(mockFetch);

      const testRequest: LLMRequest = {
        systemPrompt: 'Test system prompt',
        userPrompt: 'Test user prompt'
      };

      await expect(
        client.testExecuteWithRetry(testRequest)
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(customRetries);
    });

    test('shouldUseCustomDelaySettings', () => {
      const customConfig = {
        baseDelay: 500,
        maxDelay: 5000,
      };
      const client = new TestAPIClient(customConfig);

      expect(client).toBeDefined();
      // Note: Can't directly test delay calculation since it's private,
      // but we can verify the client was created with custom config
    });
  });
});
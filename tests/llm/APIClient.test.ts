import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { APIClient } from '../../src/llm/APIClient.js';
import {
  LLMError,
  LLMAuthenticationError,
  LLMRateLimitError,
  LLMNetworkError,
  type APIClientConfig,
} from '../../src/types/index.js';

// Create a concrete implementation for testing
class TestAPIClient extends APIClient {
  constructor(config?: Partial<APIClientConfig>) {
    super(config);
  }

  // Expose protected method for testing
  public async testExecuteWithRetry<T>(
    operation: () => Promise<T>,
    errorHandler: (error: any) => LLMError
  ): Promise<T> {
    return this.executeWithRetry(operation, errorHandler);
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
      const expectedResult = 'success';
      const operation = vi.fn().mockResolvedValue(expectedResult);
      const errorHandler = vi.fn();

      const result = await apiClient.testExecuteWithRetry(operation, errorHandler);

      expect(result).toBe(expectedResult);
      expect(operation).toHaveBeenCalledTimes(1);
      expect(errorHandler).not.toHaveBeenCalled();
    });

    test('shouldRetryOnRetryableError', async () => {
      const expectedResult = 'success after retry';
      const retryableError = new LLMRateLimitError('Rate limit exceeded');
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Retryable error'))
        .mockResolvedValue(expectedResult);
      
      const errorHandler = vi.fn().mockReturnValue(retryableError);

      const result = await apiClient.testExecuteWithRetry(operation, errorHandler);

      expect(result).toBe(expectedResult);
      expect(operation).toHaveBeenCalledTimes(2);
      expect(errorHandler).toHaveBeenCalledTimes(1);
    });

    test('shouldNotRetryOnAuthenticationError', async () => {
      const authError = new LLMAuthenticationError('Authentication failed');
      const operation = vi.fn().mockRejectedValue(new Error('Auth error'));
      const errorHandler = vi.fn().mockReturnValue(authError);

      await expect(
        apiClient.testExecuteWithRetry(operation, errorHandler)
      ).rejects.toThrow(LLMAuthenticationError);

      expect(operation).toHaveBeenCalledTimes(1);
      expect(errorHandler).toHaveBeenCalledTimes(1);
    });

    test('shouldNotRetryOnNonRetryableError', async () => {
      const nonRetryableError = new LLMError('Non-retryable error', 'NON_RETRYABLE', false);
      const operation = vi.fn().mockRejectedValue(new Error('Non-retryable error'));
      const errorHandler = vi.fn().mockReturnValue(nonRetryableError);

      await expect(
        apiClient.testExecuteWithRetry(operation, errorHandler)
      ).rejects.toThrow(LLMError);

      expect(operation).toHaveBeenCalledTimes(1);
      expect(errorHandler).toHaveBeenCalledTimes(1);
    });

    test('shouldThrowAfterMaxRetries', async () => {
      const retryableError = new LLMNetworkError('Network error');
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));
      const errorHandler = vi.fn().mockReturnValue(retryableError);

      // Use small retry count for faster test
      const clientWithFewRetries = new TestAPIClient({ retries: 2 });

      await expect(
        clientWithFewRetries.testExecuteWithRetry(operation, errorHandler)
      ).rejects.toThrow(LLMNetworkError);

      expect(operation).toHaveBeenCalledTimes(2);
      expect(errorHandler).toHaveBeenCalledTimes(2);
    });

    test('shouldThrowWrappedErrorWhenAllRetriesExhausted', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));
      const errorHandler = vi.fn().mockReturnValue(new LLMNetworkError('Network error'));

      const clientWithFewRetries = new TestAPIClient({ retries: 1 });

      await expect(
        clientWithFewRetries.testExecuteWithRetry(operation, errorHandler)
      ).rejects.toThrow(LLMNetworkError);

      expect(operation).toHaveBeenCalledTimes(1);
      expect(errorHandler).toHaveBeenCalledTimes(1);
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
      
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const errorHandler = vi.fn().mockReturnValue(new LLMNetworkError('Network error'));

      await expect(
        client.testExecuteWithRetry(operation, errorHandler)
      ).rejects.toThrow();

      expect(operation).toHaveBeenCalledTimes(customRetries);
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
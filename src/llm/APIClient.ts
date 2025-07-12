import type { APIClientConfig, LLMRequest, LLMResponse } from '../types/index.js';
import {
  LLMAuthenticationError,
  LLMError,
  LLMNetworkError,
  LLMRateLimitError,
} from '../types/index.js';

export abstract class APIClient {
  protected config: APIClientConfig;

  constructor(config?: Partial<APIClientConfig>) {
    this.config = {
      retries: 3,
      timeout: 30000,
      baseDelay: 1000,
      maxDelay: 10000,
      ...config,
    };
  }

  // Abstract method that subclasses must implement
  protected abstract fetch(request: LLMRequest): Promise<LLMResponse>;

  protected async executeWithRetry(request: LLMRequest): Promise<LLMResponse> {
    const maxRetries = this.config.retries;
    const errorHandler = this.createStandardErrorHandler();

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.fetch(request);
      } catch (error: any) {
        const wrappedError = errorHandler(error);

        // Handle authentication errors immediately - don't retry
        if (wrappedError instanceof LLMAuthenticationError) {
          throw wrappedError;
        }

        // Retry on retryable errors
        if (wrappedError.retryable && attempt < maxRetries - 1) {
          const delay = this.calculateDelay(attempt);
          await this.sleep(delay);
          continue;
        }

        // Throw error if not retryable or max retries reached
        throw wrappedError;
      }
    }

    throw new LLMNetworkError('Failed to get response after all retries');
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.config.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, this.config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected createStandardErrorHandler(): (error: any) => LLMError {
    return (error: any) => {
      // Handle null/undefined errors
      if (!error) {
        return new LLMError('Unknown API error', 'UNKNOWN_ERROR', false);
      }

      // HTTP status code based error handling
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
        return new LLMNetworkError(
          error.message || 'Network connection failed'
        );
      }

      // Default to non-retryable error
      return new LLMError(
        error.message || 'Unknown API error',
        'UNKNOWN_ERROR',
        false
      );
    };
  }
}

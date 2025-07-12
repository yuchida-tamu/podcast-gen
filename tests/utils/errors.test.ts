import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { validateTopic, validateDuration, validateApiKey, PodcastGenerationError } from '../../src/utils/errors.js';

describe('PodcastGenerationError', () => {
  test('shouldCreateErrorWithPhase', () => {
    // Given: A message and phase
    const message = 'Test error';
    const phase = 'validation';

    // When: Creating a PodcastGenerationError
    const error = new PodcastGenerationError(message, phase);

    // Then: Should have correct properties
    expect(error.message).toBe(message);
    expect(error.phase).toBe(phase);
    expect(error.name).toBe('PodcastGenerationError');
    expect(error instanceof Error).toBe(true);
  });

  test('shouldCreateErrorWithDefaultPhase', () => {
    // Given: Only a message
    const message = 'Test error';

    // When: Creating a PodcastGenerationError without phase
    const error = new PodcastGenerationError(message);

    // Then: Should use default phase
    expect(error.message).toBe(message);
    expect(error.phase).toBe('unknown');
    expect(error.name).toBe('PodcastGenerationError');
  });
});

describe('validateTopic', () => {
  test('shouldAcceptValidTopic', () => {
    // Given: A valid topic string
    const validTopic = 'Climate change solutions';

    // When/Then: Should not throw
    expect(() => validateTopic(validTopic)).not.toThrow();
  });

  test('shouldRejectEmptyTopic', () => {
    // Given: An empty topic
    const emptyTopic = '';

    // When/Then: Should throw PodcastGenerationError
    expect(() => validateTopic(emptyTopic)).toThrow(PodcastGenerationError);
    expect(() => validateTopic(emptyTopic)).toThrow('Topic must be a non-empty string');
  });

  test('shouldRejectNullTopic', () => {
    // Given: A null topic
    const nullTopic = null as any;

    // When/Then: Should throw PodcastGenerationError
    expect(() => validateTopic(nullTopic)).toThrow(PodcastGenerationError);
    expect(() => validateTopic(nullTopic)).toThrow('Topic must be a non-empty string');
  });

  test('shouldRejectTooShortTopic', () => {
    // Given: A topic that's too short
    const shortTopic = 'AI';

    // When/Then: Should throw PodcastGenerationError
    expect(() => validateTopic(shortTopic)).toThrow(PodcastGenerationError);
    expect(() => validateTopic(shortTopic)).toThrow('Topic must be at least 5 characters long');
  });

  test('shouldRejectTooLongTopic', () => {
    // Given: A topic that's too long
    const longTopic = 'A'.repeat(201);

    // When/Then: Should throw PodcastGenerationError
    expect(() => validateTopic(longTopic)).toThrow(PodcastGenerationError);
    expect(() => validateTopic(longTopic)).toThrow('Topic must be less than 200 characters');
  });

  test('shouldAcceptMinimumLengthTopic', () => {
    // Given: A topic with exactly 5 characters
    const minTopic = 'Music';

    // When/Then: Should not throw
    expect(() => validateTopic(minTopic)).not.toThrow();
  });

  test('shouldAcceptMaximumLengthTopic', () => {
    // Given: A topic with exactly 199 characters
    const maxTopic = 'A'.repeat(199);

    // When/Then: Should not throw
    expect(() => validateTopic(maxTopic)).not.toThrow();
  });
});

describe('validateDuration', () => {
  test('shouldAcceptFiveMinutes', () => {
    // Given: A 5-minute duration
    const fiveMinutes = 5;

    // When/Then: Should not throw
    expect(() => validateDuration(fiveMinutes)).not.toThrow();
  });

  test('shouldAcceptTenMinutes', () => {
    // Given: A 10-minute duration
    const tenMinutes = 10;

    // When/Then: Should not throw
    expect(() => validateDuration(tenMinutes)).not.toThrow();
  });

  test('shouldRejectInvalidDuration', () => {
    // Given: An invalid duration
    const invalidDuration = 7;

    // When/Then: Should throw PodcastGenerationError
    expect(() => validateDuration(invalidDuration)).toThrow(PodcastGenerationError);
    expect(() => validateDuration(invalidDuration)).toThrow('Duration must be 5 or 10 minutes');
  });

  test('shouldRejectZeroDuration', () => {
    // Given: A zero duration
    const zeroDuration = 0;

    // When/Then: Should throw PodcastGenerationError
    expect(() => validateDuration(zeroDuration)).toThrow(PodcastGenerationError);
    expect(() => validateDuration(zeroDuration)).toThrow('Duration must be 5 or 10 minutes');
  });

  test('shouldRejectNegativeDuration', () => {
    // Given: A negative duration
    const negativeDuration = -5;

    // When/Then: Should throw PodcastGenerationError
    expect(() => validateDuration(negativeDuration)).toThrow(PodcastGenerationError);
    expect(() => validateDuration(negativeDuration)).toThrow('Duration must be 5 or 10 minutes');
  });
});

describe('validateApiKey', () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    // Save original API key
    originalApiKey = process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    // Restore original API key
    if (originalApiKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  test('shouldAcceptValidApiKey', () => {
    // Given: A valid API key
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-test-key-here';

    // When/Then: Should not throw
    expect(() => validateApiKey()).not.toThrow();
  });

  test('shouldAcceptYskApiKey', () => {
    // Given: A valid ysk API key
    process.env.ANTHROPIC_API_KEY = 'ysk-ant-api03-test-key-here';

    // When/Then: Should not throw
    expect(() => validateApiKey()).not.toThrow();
  });

  test('shouldRejectMissingApiKey', () => {
    // Given: No API key set
    delete process.env.ANTHROPIC_API_KEY;

    // When/Then: Should throw PodcastGenerationError
    expect(() => validateApiKey()).toThrow(PodcastGenerationError);
    expect(() => validateApiKey()).toThrow('ANTHROPIC_API_KEY environment variable is required');
  });

  test('shouldRejectInvalidApiKeyFormat', () => {
    // Given: An invalid API key format
    process.env.ANTHROPIC_API_KEY = 'invalid-key-format';

    // When/Then: Should throw PodcastGenerationError
    expect(() => validateApiKey()).toThrow(PodcastGenerationError);
    expect(() => validateApiKey()).toThrow('Invalid ANTHROPIC_API_KEY format');
  });

  test('shouldRejectEmptyApiKey', () => {
    // Given: An empty API key
    process.env.ANTHROPIC_API_KEY = '';

    // When/Then: Should throw PodcastGenerationError
    expect(() => validateApiKey()).toThrow(PodcastGenerationError);
    expect(() => validateApiKey()).toThrow('ANTHROPIC_API_KEY environment variable is required');
  });
});
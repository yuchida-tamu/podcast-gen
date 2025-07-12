import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { MonologueEngine } from '../../src/monologue/engine.js';
import { PodcastGenerationError } from '../../src/utils/errors.js';
import type { 
  LLMClient, 
  LLMRequest, 
  LLMResponse 
} from '../../src/types/index.js';
import { 
  LLMError, 
  LLMAuthenticationError, 
  LLMRateLimitError, 
  LLMNetworkError 
} from '../../src/types/index.js';

// Mock the prompts module
vi.mock('../../src/monologue/prompts.js', () => ({
  NARRATOR_PROMPT: {
    personality: 'Test personality for engaging podcast narration',
    formatInstructions: 'Test instructions for formatting responses'
  },
  createMonologuePrompt: vi.fn().mockReturnValue('Generated prompt for testing'),
  NARRATIVE_PHASES: {
    introduction: { description: 'Test intro', instructions: 'Test intro instructions', targetPercentage: 15 },
    exploration: { description: 'Test exploration', instructions: 'Test exploration instructions', targetPercentage: 70 },
    conclusion: { description: 'Test conclusion', instructions: 'Test conclusion instructions', targetPercentage: 15 }
  }
}));

// Mock the validateApiKey function
vi.mock('../../src/utils/errors.js', async () => {
  const actual = await vi.importActual('../../src/utils/errors.js') as any;
  return {
    ...actual,
    validateApiKey: vi.fn(),
  };
});

describe('MonologueEngine', () => {
  let engine: MonologueEngine;
  let mockLLMClient: LLMClient;

  beforeEach(() => {
    // Set up environment variable for tests that use default client
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-test-key-for-testing';
    
    // Create mock LLM client
    mockLLMClient = {
      generateContent: vi.fn(),
      isHealthy: vi.fn().mockResolvedValue(true)
    };
    
    // Clear all mocks
    vi.clearAllMocks();
    
    // Create engine with mock LLM client for dependency injection
    engine = new MonologueEngine(mockLLMClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    test('shouldInitializeWithNarratorConfig', () => {
      // When: Creating MonologueEngine
      const newEngine = new MonologueEngine();

      // Then: Should have narrator configuration
      expect(newEngine).toBeDefined();
      // Note: Can't directly access private properties, but constructor shouldn't throw
    });

    test('shouldAcceptInjectedLLMClient', () => {
      // Given: Mock LLM client
      const customMockClient: LLMClient = {
        generateContent: vi.fn(),
        isHealthy: vi.fn()
      };

      // When: Creating MonologueEngine with injected client
      const newEngine = new MonologueEngine(customMockClient);

      // Then: Should initialize without throwing
      expect(newEngine).toBeDefined();
    });

    test('shouldUseDefaultClientWhenNoneProvided', () => {
      // When: Creating MonologueEngine without client injection
      const newEngine = new MonologueEngine();

      // Then: Should initialize with default client
      expect(newEngine).toBeDefined();
    });
  });

  describe('generateMonologue - Phase Distribution', () => {
    beforeEach(() => {
      // Mock LLM client responses for phase testing
      const mockResponses = [
        'Introduction content with [thoughtful] emotion markers.',
        'Exploration content with [curious] emotion markers.',
        'Exploration content continued with [analytical] markers.',
        'More exploration content with [engaged] markers.',
        'Conclusion content with [reflective] emotion markers.'
      ];
      
      let callCount = 0;
      (mockLLMClient.generateContent as any).mockImplementation(async (): Promise<LLMResponse> => {
        const response = mockResponses[callCount % mockResponses.length];
        callCount++;
        return {
          content: response,
          usage: {
            promptTokens: 50,
            completionTokens: 30,
            totalTokens: 80
          }
        };
      });
    });

    test('shouldGenerate5MinuteMonologueWithCorrectPhaseDistribution', async () => {
      // Given: 5-minute duration
      const topic = 'artificial intelligence';
      const duration = 5;

      // When: Generating monologue
      const result = await engine.generateMonologue(topic, duration);

      // Then: Should have correct number of segments (1 intro + 7 exploration + 1 conclusion = 9)
      expect(result).toHaveLength(9);

      // And: Should have proper timestamp progression
      expect(result[0].timestamp).toBe('00:00');
      
      // And: Each segment should have required properties
      result.forEach((segment) => {
        expect(segment).toHaveProperty('timestamp');
        expect(segment).toHaveProperty('text');
        expect(segment).toHaveProperty('emotion');
        expect(segment).toHaveProperty('duration');
        
        // Timestamp format validation
        expect(segment.timestamp).toMatch(/^\d{2}:\d{2}$/);
        
        // Content validation
        expect(segment.text).toBeTruthy();
        expect(segment.duration).toBeGreaterThan(0);
      });
    });

    test('shouldGenerate10MinuteMonologueWithCorrectSegmentCount', async () => {
      // Given: 10-minute duration
      const topic = 'climate change';
      const duration = 10;

      // When: Generating monologue
      const result = await engine.generateMonologue(topic, duration);

      // Then: Should have correct number of segments for 10 minutes (3 intro + 14 exploration + 3 conclusion = 20)
      expect(result).toHaveLength(20);
    });

    test('shouldCallApiForAllRequiredPhases', async () => {
      // Given: 5-minute topic
      const topic = 'machine learning';
      const duration = 5;

      // When: Generating monologue
      await engine.generateMonologue(topic, duration);

      // Then: Should have made LLM client calls (9 segments for 5 minutes)
      expect(mockLLMClient.generateContent).toHaveBeenCalledTimes(9);
    });

    test('shouldResetPreviousContentBetweenGenerations', async () => {
      // Given: First generation
      await engine.generateMonologue('first topic', 5);

      // When: Second generation
      const secondResult = await engine.generateMonologue('second topic', 5);

      // Then: Should generate fresh content (not cumulative)
      expect(secondResult).toHaveLength(9); // Fresh 5-minute generation
    });
  });

  describe('Utility Methods', () => {
    describe('extractEmotion', () => {
      test('shouldExtractEmotionFromBrackets', () => {
        // Given: Content with emotion markers
        const content = 'This is test content with [excited] emotion.';

        // When: Creating segment (which calls extractEmotion internally)
        const segment = (engine as any).createSegment(content, 0);

        // Then: Should extract emotion
        expect(segment.emotion).toBe('excited');
      });

      test('shouldExtractFirstEmotionWhenMultiplePresent', () => {
        // Given: Content with multiple emotions
        const content = 'Test content [thoughtful] and then [curious] later.';

        // When: Creating segment
        const segment = (engine as any).createSegment(content, 0);

        // Then: Should extract first emotion
        expect(segment.emotion).toBe('thoughtful');
      });

      test('shouldDefaultToNeutralWhenNoEmotion', () => {
        // Given: Content without emotion markers
        const content = 'This is plain content without any emotion markers.';

        // When: Creating segment
        const segment = (engine as any).createSegment(content, 0);

        // Then: Should default to neutral
        expect(segment.emotion).toBe('neutral');
      });

      test('shouldHandleEmptyBrackets', () => {
        // Given: Content with empty brackets
        const content = 'Content with empty [] brackets.';

        // When: Creating segment
        const segment = (engine as any).createSegment(content, 0);

        // Then: Should default to neutral
        expect(segment.emotion).toBe('neutral');
      });
    });

    describe('cleanText', () => {
      test('shouldRemoveEmotionMarkers', () => {
        // Given: Content with emotion markers
        const content = 'This is content [excited] with emotion markers.';

        // When: Creating segment
        const segment = (engine as any).createSegment(content, 0);

        // Then: Should remove emotion markers from text
        expect(segment.text).toBe('This is content  with emotion markers.');
      });

      test('shouldRemoveMultipleEmotionMarkers', () => {
        // Given: Content with multiple emotion markers
        const content = 'Start [thoughtful] middle [curious] end [reflective] done.';

        // When: Creating segment
        const segment = (engine as any).createSegment(content, 0);

        // Then: Should remove all emotion markers
        expect(segment.text).toBe('Start  middle  end  done.');
      });

      test('shouldTrimWhitespace', () => {
        // Given: Content with leading/trailing spaces and emotion
        const content = '  [excited] Content with spaces.  ';

        // When: Creating segment
        const segment = (engine as any).createSegment(content, 0);

        // Then: Should trim whitespace
        expect(segment.text).toBe('Content with spaces.');
      });

      test('shouldHandleContentWithOnlyEmotionMarkers', () => {
        // Given: Content with only emotion markers
        const content = '[thoughtful] [curious] [excited]';

        // When: Creating segment
        const segment = (engine as any).createSegment(content, 0);

        // Then: Should result in empty text
        expect(segment.text).toBe('');
      });
    });

    describe('formatTime', () => {
      test('shouldFormatZeroSeconds', () => {
        // Given: 0 seconds
        const seconds = 0;

        // When: Formatting time
        const result = (engine as any).formatTime(seconds);

        // Then: Should format as 00:00
        expect(result).toBe('00:00');
      });

      test('shouldFormatSecondsOnly', () => {
        // Given: 45 seconds
        const seconds = 45;

        // When: Formatting time
        const result = (engine as any).formatTime(seconds);

        // Then: Should format as 00:45
        expect(result).toBe('00:45');
      });

      test('shouldFormatMinutesAndSeconds', () => {
        // Given: 3 minutes 25 seconds
        const seconds = 205; // 3*60 + 25

        // When: Formatting time
        const result = (engine as any).formatTime(seconds);

        // Then: Should format as 03:25
        expect(result).toBe('03:25');
      });

      test('shouldFormatLargeTimeValues', () => {
        // Given: 1 hour 5 minutes 7 seconds
        const seconds = 3907; // 65*60 + 7

        // When: Formatting time
        const result = (engine as any).formatTime(seconds);

        // Then: Should format as 65:07 (no hour formatting)
        expect(result).toBe('65:07');
      });

      test('shouldPadSingleDigits', () => {
        // Given: 1 minute 5 seconds
        const seconds = 65; // 1*60 + 5

        // When: Formatting time
        const result = (engine as any).formatTime(seconds);

        // Then: Should pad single digits
        expect(result).toBe('01:05');
      });
    });

    describe('estimateDuration', () => {
      test('shouldEstimateBasicDuration', () => {
        // Given: Sample text
        const text = 'This is a sample text for duration estimation testing.';

        // When: Estimating duration
        const duration = (engine as any).estimateDuration(text);

        // Then: Should return positive duration
        expect(duration).toBeGreaterThan(0);
        expect(typeof duration).toBe('number');
      });

      test('shouldHaveMinimumDuration', () => {
        // Given: Very short text
        const text = 'Hi';

        // When: Estimating duration
        const duration = (engine as any).estimateDuration(text);

        // Then: Should have minimum duration of 5 seconds
        expect(duration).toBeGreaterThanOrEqual(5);
      });

      test('shouldScaleWithTextLength', () => {
        // Given: Short and long texts
        const shortText = 'Short text.';
        const longText = 'This is a much longer piece of text that should take significantly more time to read aloud compared to the shorter version above.';

        // When: Estimating durations
        const shortDuration = (engine as any).estimateDuration(shortText);
        const longDuration = (engine as any).estimateDuration(longText);

        // Then: Longer text should have longer duration
        expect(longDuration).toBeGreaterThan(shortDuration);
      });
    });

    describe('calculateTargetSegments', () => {
      test('shouldCalculateCorrectSegmentsFor5Minutes', () => {
        // Given: 5-minute duration
        const duration = 5;

        // When: Calculating target segments
        const segments = (engine as any).calculateTargetSegments(duration);

        // Then: Should return 10 segments (2 per minute)
        expect(segments).toBe(10);
      });

      test('shouldCalculateCorrectSegmentsFor10Minutes', () => {
        // Given: 10-minute duration
        const duration = 10;

        // When: Calculating target segments
        const segments = (engine as any).calculateTargetSegments(duration);

        // Then: Should return 20 segments
        expect(segments).toBe(20);
      });

      test('shouldHandleEdgeCaseDurations', () => {
        // Given: Edge case durations
        const durations = [1, 15, 30];

        // When/Then: Should handle all durations
        durations.forEach(duration => {
          const segments = (engine as any).calculateTargetSegments(duration);
          expect(segments).toBe(duration * 2);
          expect(segments).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('shouldWrapGenerationErrorsInPodcastGenerationError', async () => {
      // Given: LLM client that throws error
      (mockLLMClient.generateContent as any).mockRejectedValue(new LLMNetworkError('Network error'));

      // When/Then: Should wrap error appropriately
      await expect(engine.generateMonologue('test topic', 5))
        .rejects
        .toThrow(PodcastGenerationError);
    });

    test('shouldHandleAuthenticationErrors', async () => {
      // Given: LLM client that throws authentication error
      (mockLLMClient.generateContent as any).mockRejectedValue(new LLMAuthenticationError('Authentication failed'));

      // When/Then: Should propagate authentication error wrapped in PodcastGenerationError
      await expect(engine.generateMonologue('test topic', 5))
        .rejects
        .toThrow(PodcastGenerationError);
    });

    test('shouldHandleRateLimitErrors', async () => {
      // Given: LLM client that throws rate limit error
      (mockLLMClient.generateContent as any).mockRejectedValue(new LLMRateLimitError('Rate limit exceeded'));

      // When/Then: Should propagate rate limit error wrapped in PodcastGenerationError
      await expect(engine.generateMonologue('test topic', 5))
        .rejects
        .toThrow(PodcastGenerationError);
    });

    test('shouldHandleNetworkErrors', async () => {
      // Given: LLM client that throws network error
      (mockLLMClient.generateContent as any).mockRejectedValue(new LLMNetworkError('Connection failed'));

      // When/Then: Should propagate network error wrapped in PodcastGenerationError
      await expect(engine.generateMonologue('test topic', 5))
        .rejects
        .toThrow(PodcastGenerationError);
    });

    test('shouldHandleGenericLLMErrors', async () => {
      // Given: LLM client that throws generic LLM error
      (mockLLMClient.generateContent as any).mockRejectedValue(new LLMError('Generic LLM error', 'UNKNOWN', false));

      // When/Then: Should propagate generic error wrapped in PodcastGenerationError
      await expect(engine.generateMonologue('test topic', 5))
        .rejects
        .toThrow(PodcastGenerationError);
    });

    test('shouldPassLLMRequestCorrectly', async () => {
      // Given: Mock that captures request
      const requestCapture: LLMRequest[] = [];
      (mockLLMClient.generateContent as any).mockImplementation(async (request: LLMRequest) => {
        requestCapture.push(request);
        return {
          content: 'Test response [neutral]',
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }
        };
      });

      // When: Generating monologue
      await engine.generateMonologue('test topic', 5);

      // Then: Should have captured requests with correct structure
      expect(requestCapture.length).toBeGreaterThan(0);
      requestCapture.forEach(request => {
        expect(request).toHaveProperty('systemPrompt');
        expect(request).toHaveProperty('userPrompt');
        expect(typeof request.systemPrompt).toBe('string');
        expect(typeof request.userPrompt).toBe('string');
      });
    });
  });

  describe('LLM Client Integration', () => {
    test('shouldCallLLMClientWithCorrectParameters', async () => {
      // Given: Mock that tracks calls
      const requestCapture: LLMRequest[] = [];
      (mockLLMClient.generateContent as any).mockImplementation(async (request: LLMRequest) => {
        requestCapture.push(request);
        return {
          content: 'Generated content [neutral]',
          usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 }
        };
      });

      // When: Generating monologue
      await engine.generateMonologue('machine learning', 5);

      // Then: Should have made correct number of calls
      expect(mockLLMClient.generateContent).toHaveBeenCalledTimes(9);
      
      // And: Each call should have proper structure
      expect(requestCapture).toHaveLength(9);
      requestCapture.forEach(request => {
        expect(request.systemPrompt).toContain('Test personality for engaging podcast narration');
        expect(request.systemPrompt).toContain('Test instructions for formatting responses');
        expect(request.userPrompt).toBe('Generated prompt for testing');
      });
    });

    test('shouldHandleUsageStatistics', async () => {
      // Given: LLM client that returns usage stats
      (mockLLMClient.generateContent as any).mockResolvedValue({
        content: 'Test content [excited]',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150
        }
      });

      // When: Generating monologue
      const result = await engine.generateMonologue('test topic', 5);

      // Then: Should complete successfully despite usage stats
      expect(result).toBeDefined();
      expect(result.length).toBe(9);
    });

    test('shouldHandleResponsesWithoutUsageStats', async () => {
      // Given: LLM client that returns minimal response
      (mockLLMClient.generateContent as any).mockResolvedValue({
        content: 'Test content [neutral]'
        // No usage property
      });

      // When: Generating monologue
      const result = await engine.generateMonologue('test topic', 5);

      // Then: Should complete successfully without usage stats
      expect(result).toBeDefined();
      expect(result.length).toBe(9);
    });
  });

  describe('Integration & Edge Cases', () => {
    test('shouldHandleEmptyLLMResponse', async () => {
      // Given: LLM client that returns empty text
      (mockLLMClient.generateContent as any).mockResolvedValue({
        content: '   ', // Empty/whitespace text
        usage: { promptTokens: 10, completionTokens: 1, totalTokens: 11 }
      });

      // When: Generating monologue
      const result = await engine.generateMonologue('test topic', 5);

      // Then: Should handle gracefully
      expect(result).toBeDefined();
      expect(result.length).toBe(9);
      
      // Segments should have empty text but still valid structure
      result.forEach(segment => {
        expect(segment.text).toBe(''); // Trimmed empty
        expect(segment.emotion).toBe('neutral');
        expect(segment.duration).toBeGreaterThanOrEqual(5); // Minimum duration
      });
    });

    test('shouldHandleSpecialCharactersInTopic', async () => {
      // Given: Topic with special characters
      const topic = 'AI & Machine Learning: The Future (2025)!';
      
      (mockLLMClient.generateContent as any).mockResolvedValue({
        content: 'Generated content about the topic [excited]',
        usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 }
      });

      // When: Generating monologue
      const result = await engine.generateMonologue(topic, 5);

      // Then: Should handle topic correctly
      expect(result).toBeDefined();
      expect(result.length).toBe(9);
    });

    test('shouldAccumulatePreviousContentDuringGeneration', async () => {
      // Given: LLM client that returns different content each time
      let callCount = 0;
      (mockLLMClient.generateContent as any).mockImplementation(async () => {
        callCount++;
        return {
          content: `Content segment ${callCount} [neutral]`,
          usage: { promptTokens: 30, completionTokens: 20, totalTokens: 50 }
        };
      });

      // When: Generating monologue
      await engine.generateMonologue('test topic', 5);

      // Then: Should have made calls for all segments
      expect(mockLLMClient.generateContent).toHaveBeenCalledTimes(9);
      expect(callCount).toBe(9);
    });

    test('shouldMaintainTimestampSequence', async () => {
      // Given: Successful LLM responses
      (mockLLMClient.generateContent as any).mockResolvedValue({
        content: 'Test content [neutral]',
        usage: { promptTokens: 25, completionTokens: 15, totalTokens: 40 }
      });

      // When: Generating monologue
      const result = await engine.generateMonologue('test topic', 5);

      // Then: Timestamps should be sequential
      let previousSeconds = -1;
      result.forEach(segment => {
        const [minutes, seconds] = segment.timestamp.split(':').map(Number);
        const totalSeconds = minutes * 60 + seconds;
        
        expect(totalSeconds).toBeGreaterThan(previousSeconds);
        previousSeconds = totalSeconds;
      });
    });

    test('shouldCreateEngineWithDefaultClientWhenNoneProvided', () => {
      // When: Creating engine without LLM client
      const defaultEngine = new MonologueEngine();

      // Then: Should create successfully with default client
      expect(defaultEngine).toBeDefined();
    });
  });
});
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { MonologueEngine } from '../../src/monologue/engine.js';
import { PodcastGenerationError } from '../../src/utils/errors.js';
import type { NarrativePhase } from '../../src/types/index.js';

// Mock the environment variable for API key validation
vi.mock('../../src/utils/errors.js', async () => {
  const actual = await vi.importActual('../../src/utils/errors.js') as any;
  return {
    ...actual,
    validateApiKey: vi.fn(),
  };
});

// Mock the Anthropic SDK
const mockAnthropicCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: mockAnthropicCreate
      }
    }))
  };
});

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

describe('MonologueEngine', () => {
  let engine: MonologueEngine;

  beforeEach(() => {
    // Set up environment variable mock
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-test-key-for-testing';
    
    // Clear all mocks
    vi.clearAllMocks();
    
    // Create a new engine instance for each test
    engine = new MonologueEngine();
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

    test('shouldValidateApiKeyOnConstruction', async () => {
      // Given: validateApiKey mock
      const { validateApiKey } = await import('../../src/utils/errors.js');

      // When: Creating MonologueEngine (already done in beforeEach)
      // Then: Should have called validateApiKey
      expect(validateApiKey).toHaveBeenCalled();
    });
  });

  describe('generateMonologue - Phase Distribution', () => {
    beforeEach(() => {
      // Mock API responses for phase testing
      const mockResponses = [
        'Introduction content with [thoughtful] emotion markers.',
        'Exploration content with [curious] emotion markers.',
        'Exploration content continued with [analytical] markers.',
        'More exploration content with [engaged] markers.',
        'Conclusion content with [reflective] emotion markers.'
      ];
      
      let callCount = 0;
      mockAnthropicCreate.mockImplementation(() => {
        const response = mockResponses[callCount % mockResponses.length];
        callCount++;
        return Promise.resolve({
          content: [{ text: response }]
        });
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

      // Then: Should have made API calls (9 segments for 5 minutes)
      expect(mockAnthropicCreate).toHaveBeenCalledTimes(9);
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
      // Given: API that throws error immediately (no retries)
      mockAnthropicCreate.mockImplementation(() => {
        throw new Error('Network error');
      });

      // When/Then: Should wrap error appropriately
      await expect(engine.generateMonologue('test topic', 5))
        .rejects
        .toThrow(PodcastGenerationError);
    }, 10000);

    test('shouldRetryOnTransientErrors', async () => {
      // Given: API that fails on first call, then succeeds
      let firstCall = true;
      mockAnthropicCreate.mockImplementation(() => {
        if (firstCall) {
          firstCall = false;
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({
          content: [{ text: 'Success after retries [happy]' }]
        });
      });

      // When: Generating monologue
      const result = await engine.generateMonologue('test topic', 5);

      // Then: Should succeed after retries
      expect(result).toBeDefined();
      expect(result.length).toBe(9);
      
      // And: Should have made at least the expected calls (9 segments + 1 retry)
      expect(mockAnthropicCreate).toHaveBeenCalledTimes(10);
    });

    test('shouldFallbackToMockOnAuthenticationError', async () => {
      // Given: API that returns 401 authentication error
      const authError = new Error('Authentication failed');
      (authError as any).status = 401;
      mockAnthropicCreate.mockRejectedValue(authError);

      // Mock console.warn to check fallback message
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // When: Generating monologue
      const result = await engine.generateMonologue('test topic', 5);

      // Then: Should succeed with mock content
      expect(result).toBeDefined();
      expect(result.length).toBe(9); // 5 minutes worth
      
      // And: Should have logged warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Warning: Invalid API key, falling back to enhanced mock responses'
      );

      // Cleanup
      consoleWarnSpy.mockRestore();
    });

    test('shouldHandleInvalidApiResponseFormat', async () => {
      // Given: API that returns invalid response format
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'image', data: 'invalid' }] // Not text response
      });

      // When/Then: Should throw error for invalid response
      await expect(engine.generateMonologue('test topic', 5))
        .rejects
        .toThrow('Invalid response format from API');
    });

    test('shouldThrowAfterMaxRetries', async () => {
      // Given: API that always fails
      mockAnthropicCreate.mockRejectedValue(new Error('Persistent failure'));

      // When/Then: Should throw after exhausting retries
      await expect(engine.generateMonologue('test topic', 5))
        .rejects
        .toThrow('Persistent failure');
    });
  });

  describe('Mock Content Generation', () => {
    test('shouldGenerateMockContentForAllPhases', () => {
      // Given: All narrative phases
      const phases: NarrativePhase[] = ['introduction', 'exploration', 'conclusion'];
      const topic = 'artificial intelligence';

      // When: Generating mock content for each phase
      phases.forEach(phase => {
        const content = (engine as any).generateMockContent(topic, phase);

        // Then: Should generate content for each phase
        expect(content).toBeDefined();
        expect(typeof content).toBe('string');
        expect(content.length).toBeGreaterThan(0);
        
        // And: Should contain emotion markers
        expect(content).toMatch(/\[[^\]]+\]/);
      });

      // Test specific phases that should contain topic
      const introContent = (engine as any).generateMockContent(topic, 'introduction');
      expect(introContent.toLowerCase()).toContain(topic.toLowerCase());
      
      const conclusionContent = (engine as any).generateMockContent(topic, 'conclusion');
      expect(conclusionContent.toLowerCase()).toContain(topic.toLowerCase());
    });

    test('shouldGenerateVariedMockContent', () => {
      // Given: Same phase and topic
      const phase: NarrativePhase = 'exploration';
      const topic = 'machine learning';

      // When: Generating multiple mock contents
      const contents = [];
      for (let i = 0; i < 10; i++) {
        contents.push((engine as any).generateMockContent(topic, phase));
      }

      // Then: Should have some variation (not all identical)
      const uniqueContents = new Set(contents);
      expect(uniqueContents.size).toBeGreaterThan(1);
    });

    test('shouldFallbackToExplorationForInvalidPhase', () => {
      // Given: Invalid phase
      const invalidPhase = 'invalid' as NarrativePhase;
      const topic = 'test';

      // When: Generating mock content
      const content = (engine as any).generateMockContent(topic, invalidPhase);

      // Then: Should still generate content (fallback to exploration)
      expect(content).toBeDefined();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('Integration & Edge Cases', () => {
    test('shouldHandleEmptyApiResponse', async () => {
      // Given: API that returns empty text
      mockAnthropicCreate.mockResolvedValue({
        content: [{ text: '   ' }] // Empty/whitespace text
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
      
      mockAnthropicCreate.mockResolvedValue({
        content: [{ text: 'Generated content about the topic [excited]' }]
      });

      // When: Generating monologue
      const result = await engine.generateMonologue(topic, 5);

      // Then: Should handle topic correctly
      expect(result).toBeDefined();
      expect(result.length).toBe(9);
    });

    test('shouldAccumulatePreviousContentDuringGeneration', async () => {
      // Given: API that returns different content each time
      let callCount = 0;
      mockAnthropicCreate.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          content: [{ text: `Content segment ${callCount} [neutral]` }]
        });
      });

      // When: Generating monologue
      await engine.generateMonologue('test topic', 5);

      // Then: Should have made calls for all segments
      expect(mockAnthropicCreate).toHaveBeenCalledTimes(9);
      expect(callCount).toBe(9);
    });

    test('shouldMaintainTimestampSequence', async () => {
      // Given: Successful API responses
      mockAnthropicCreate.mockResolvedValue({
        content: [{ text: 'Test content [neutral]' }]
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
  });
});
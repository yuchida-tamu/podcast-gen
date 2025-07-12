import { describe, test, expect, beforeEach } from 'vitest';
import { ScriptFormatter } from '../../src/script/formatter.js';

describe('ScriptFormatter', () => {
  let formatter: ScriptFormatter;

  beforeEach(() => {
    formatter = new ScriptFormatter();
  });

  describe('constructor', () => {
    test('shouldInitializeProperties', () => {
      // When: Creating a new formatter
      const newFormatter = new ScriptFormatter();

      // Then: Should initialize with empty values
      expect(newFormatter.title).toBe('');
      expect(newFormatter.generatedDate).toBe('');
    });
  });

  describe('formatScript', () => {
    test('shouldFormatValidSegments', async () => {
      // Given: Valid segments and topic
      const segments = [
        {
          timestamp: '00:00',
          text: 'Welcome to today\'s discussion.',
          emotion: 'neutral',
          duration: 3
        },
        {
          timestamp: '00:03',
          text: 'Let\'s explore this fascinating topic.',
          emotion: 'excited',
          duration: 4
        }
      ];
      const topic = 'climate change solutions';

      // When: Formatting script
      const result = await formatter.formatScript(segments, topic);

      // Then: Should return valid JSON string
      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(parsed.title).toBe('Climate change solutions');
      expect(parsed.duration).toBe(7);
      expect(parsed.segments).toHaveLength(2);
      expect(parsed.metadata.format).toBe('monologue');
      expect(parsed.metadata.version).toBe('1.0');
    });

    test('shouldHandleEmptySegments', async () => {
      // Given: Empty segments array
      const segments: any[] = [];
      const topic = 'test topic';

      // When: Formatting script
      const result = await formatter.formatScript(segments, topic);

      // Then: Should handle gracefully
      const parsed = JSON.parse(result);
      expect(parsed.segments).toHaveLength(0);
      expect(parsed.duration).toBe(0);
      expect(parsed.metadata.totalSegments).toBe(0);
    });

    test('shouldHandleSegmentsWithoutEmotion', async () => {
      // Given: Segments without emotion property
      const segments = [
        {
          timestamp: '00:00',
          text: 'Test content',
          duration: 2
        }
      ];
      const topic = 'test';

      // When: Formatting script
      const result = await formatter.formatScript(segments, topic);

      // Then: Should default emotion to neutral
      const parsed = JSON.parse(result);
      expect(parsed.segments[0].emotion).toBe('neutral');
    });

    test('shouldHandleInvalidSegmentData', async () => {
      // Given: Segments with missing required fields
      const invalidSegments = [{}] as any[];
      const topic = 'test';

      // When: Formatting script with invalid data
      const result = await formatter.formatScript(invalidSegments, topic);

      // Then: Should handle gracefully with default values
      const parsed = JSON.parse(result);
      expect(parsed.segments[0].timestamp).toBe('');
      expect(parsed.segments[0].text).toBe('');
      expect(parsed.segments[0].emotion).toBe('neutral');
      expect(parsed.duration).toBe(0);
    });
  });

  describe('generateJSON', () => {
    test('shouldGenerateValidJSONStructure', () => {
      // Given: Valid segments and topic
      const segments = [
        {
          timestamp: '00:00',
          text: 'Introduction content',
          emotion: 'neutral',
          duration: 5
        },
        {
          timestamp: '00:05',
          text: 'Main content',
          emotion: 'enthusiastic',
          duration: 10
        }
      ];
      const topic = 'artificial intelligence';

      // When: Generating JSON
      const result = formatter.generateJSON(segments, topic);

      // Then: Should create proper JSON structure
      const parsed = JSON.parse(result);
      expect(parsed.title).toBe('Artificial intelligence');
      expect(parsed.duration).toBe(15);
      expect(parsed.segments).toHaveLength(2);
      expect(parsed.segments[0].timestamp).toBe('00:00');
      expect(parsed.segments[0].text).toBe('Introduction content');
      expect(parsed.segments[1].emotion).toBe('enthusiastic');
      expect(parsed.metadata.topic).toBe('artificial intelligence');
      expect(parsed.metadata.totalSegments).toBe(2);
      expect(parsed.metadata.estimatedDuration).toBe(15);
      expect(parsed.metadata.format).toBe('monologue');
      expect(parsed.metadata.version).toBe('1.0');
    });

    test('shouldIncludeGeneratedTimestamp', () => {
      // Given: Any segments and topic
      const segments = [{ timestamp: '00:00', text: 'Test', duration: 1 }];
      const topic = 'test';

      // When: Generating JSON
      const result = formatter.generateJSON(segments, topic);

      // Then: Should include generated timestamp
      const parsed = JSON.parse(result);
      expect(parsed.generated).toBeDefined();
      expect(new Date(parsed.generated)).toBeInstanceOf(Date);
    });
  });

  describe('capitalizeFirst', () => {
    test('shouldCapitalizeFirstLetter', () => {
      // Given: A lowercase string
      const input = 'hello world';

      // When: Capitalizing first letter
      const result = formatter.capitalizeFirst(input);

      // Then: Should capitalize only the first letter
      expect(result).toBe('Hello world');
    });

    test('shouldHandleAlreadyCapitalized', () => {
      // Given: An already capitalized string
      const input = 'Hello World';

      // When: Capitalizing first letter
      const result = formatter.capitalizeFirst(input);

      // Then: Should remain unchanged
      expect(result).toBe('Hello World');
    });

    test('shouldHandleEmptyString', () => {
      // Given: An empty string
      const input = '';

      // When: Capitalizing first letter
      const result = formatter.capitalizeFirst(input);

      // Then: Should return empty string
      expect(result).toBe('');
    });

    test('shouldHandleSingleCharacter', () => {
      // Given: A single character
      const input = 'a';

      // When: Capitalizing first letter
      const result = formatter.capitalizeFirst(input);

      // Then: Should capitalize the character
      expect(result).toBe('A');
    });
  });

  describe('generateFilename', () => {
    test('shouldGenerateValidFilename', () => {
      // Given: A topic with spaces and special characters
      const topic = 'Climate Change Solutions & Innovations!';

      // When: Generating filename
      const result = formatter.generateFilename(topic);

      // Then: Should create slug with date
      expect(result).toMatch(/^climate-change-solutions-innovations_\d{4}-\d{2}-\d{2}$/);
    });

    test('shouldHandleSpecialCharacters', () => {
      // Given: A topic with various special characters
      const topic = 'AI/ML: The Future (2024) - Part #1';

      // When: Generating filename
      const result = formatter.generateFilename(topic);

      // Then: Should remove special characters
      expect(result).toMatch(/^aiml-the-future-2024-part-1_\d{4}-\d{2}-\d{2}$/);
    });

    test('shouldHandleMultipleSpaces', () => {
      // Given: A topic with multiple consecutive spaces
      const topic = 'Topic   with    multiple     spaces';

      // When: Generating filename
      const result = formatter.generateFilename(topic);

      // Then: Should consolidate spaces to single dashes
      expect(result).toMatch(/^topic-with-multiple-spaces_\d{4}-\d{2}-\d{2}$/);
    });

    test('shouldHandleLeadingTrailingSpaces', () => {
      // Given: A topic with leading and trailing spaces/dashes
      const topic = '  -topic-  ';

      // When: Generating filename
      const result = formatter.generateFilename(topic);

      // Then: Should trim leading/trailing dashes
      expect(result).toMatch(/^topic_\d{4}-\d{2}-\d{2}$/);
    });

    test('shouldIncludeCurrentDate', () => {
      // Given: Any topic
      const topic = 'test topic';
      const today = new Date().toISOString().split('T')[0];

      // When: Generating filename
      const result = formatter.generateFilename(topic);

      // Then: Should include today's date
      expect(result).toContain(today);
      expect(result).toBe(`test-topic_${today}`);
    });
  });
});
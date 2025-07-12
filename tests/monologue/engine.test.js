import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MonologueEngine } from '../../src/monologue/engine.js';

// Mock the environment variable for API key validation
vi.mock('../../src/utils/errors.js', () => ({
  validateApiKey: vi.fn(),
  PodcastGenerationError: class extends Error {
    constructor(message, phase) {
      super(message);
      this.phase = phase;
    }
  }
}));

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn()
      }
    }))
  };
});

// Mock the prompts module
vi.mock('../../src/monologue/prompts.js', () => ({
  NARRATOR_PROMPT: {
    personality: 'Test personality',
    formatInstructions: 'Test instructions'
  },
  createMonologuePrompt: vi.fn().mockReturnValue('Test prompt for testing'),
  NARRATIVE_PHASES: {
    introduction: { description: 'Test intro', instructions: 'Test intro instructions' },
    exploration: { description: 'Test exploration', instructions: 'Test exploration instructions' },
    conclusion: { description: 'Test conclusion', instructions: 'Test conclusion instructions' }
  }
}));

describe('MonologueEngine', () => {
  let engine;

  beforeEach(() => {
    // Set up environment variable mock
    process.env.ANTHROPIC_API_KEY = 'test-key';
    
    // Create a new engine instance for each test
    engine = new MonologueEngine();
    
    // Mock the API call to return consistent test data
    const mockResponses = [
      'This is an introduction segment. [thoughtful] It explores the topic in depth.',
      'This is an exploration segment. [curious] It examines different perspectives.', 
      'This is an exploration segment continued. [analytical] More analysis here.',
      'This is an exploration segment final. [engaged] Final exploration thoughts.',
      'This is a conclusion segment. [reflective] It wraps up the discussion.'
    ];
    
    let callCount = 0;
    engine.callAnthropicAPI = vi.fn().mockImplementation(() => {
      const response = mockResponses[callCount % mockResponses.length];
      callCount++;
      return Promise.resolve(response);
    });
  });

  test('shouldGenerateMonologueWithCorrectStructure', async () => {
    // Given: A topic and duration
    const topic = 'Test Topic';
    const duration = 5;

    // When: generateMonologue is called
    const result = await engine.generateMonologue(topic, duration);

    // Then: Should return array of segments with required properties
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // Each segment should have required properties
    result.forEach(segment => {
      expect(segment).toHaveProperty('timestamp');
      expect(segment).toHaveProperty('text');
      expect(segment).toHaveProperty('emotion');
      expect(segment).toHaveProperty('duration');

      // Validate property types
      expect(typeof segment.timestamp).toBe('string');
      expect(typeof segment.text).toBe('string');
      expect(typeof segment.emotion).toBe('string');
      expect(typeof segment.duration).toBe('number');

      // Timestamp should be in MM:SS format
      expect(segment.timestamp).toMatch(/^\d{2}:\d{2}$/);
      
      // Duration should be positive
      expect(segment.duration).toBeGreaterThan(0);
      
      // Text should not be empty
      expect(segment.text.length).toBeGreaterThan(0);
    });
  });
});
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import { AudioSynthesizer } from '../../src/audio/synthesizer.js';
import { PodcastGenerationError } from '../../src/utils/errors.js';
import type { MonologueSegment, ScriptOutput } from '../../src/types/index.js';

// Mock fs-extra
vi.mock('fs-extra');

// Mock OpenAI SDK
vi.mock('openai');

describe('AudioSynthesizer', () => {
  let mockOpenAIClient: any;
  let audioSynthesizer: AudioSynthesizer;
  let mockAudioSpeech: any;

  beforeEach(() => {
    // Create mock for audio speech
    mockAudioSpeech = {
      create: vi.fn(),
    };

    // Create mock OpenAI client
    mockOpenAIClient = {
      audio: {
        speech: mockAudioSpeech,
      },
    };

    // Create synthesizer instance
    audioSynthesizer = new AudioSynthesizer(mockOpenAIClient);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    test('shouldCreateInstanceWithDefaultOptions', () => {
      const synthesizer = new AudioSynthesizer(mockOpenAIClient);
      expect(synthesizer).toBeDefined();
    });

    test('shouldCreateInstanceWithCustomOptions', () => {
      const options = {
        voice: 'nova' as const,
        model: 'tts-1-hd',
      };
      const synthesizer = new AudioSynthesizer(mockOpenAIClient, options);
      expect(synthesizer).toBeDefined();
    });
  });

  describe('synthesizeAudio', () => {
    test('shouldSynthesizeAudioFromScriptFile', async () => {
      const mockScriptData: ScriptOutput = {
        title: 'Test Podcast',
        generated: '2024-01-01T00:00:00Z',
        duration: 300,
        segments: [
          { text: 'Hello world', timestamp: '00:00', duration: 5 },
          { text: 'This is a test', timestamp: '00:05', duration: 10 },
        ],
        metadata: {
          topic: 'Test Topic',
          totalSegments: 2,
          estimatedDuration: 300,
          format: 'monologue',
          version: '1.0.0',
        },
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(mockScriptData));
      
      const mockResponse = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      mockAudioSpeech.create.mockResolvedValue(mockResponse);
      (fs.writeFile as any).mockResolvedValue(undefined);

      const scriptPath = '/test/script.json';
      const outputPath = '/test/output.mp3';
      const result = await audioSynthesizer.synthesizeAudio(scriptPath, outputPath);

      expect(result).toEqual([
        '/test/output_segment_001.mp3',
        '/test/output_segment_002.mp3'
      ]);
      expect(fs.readFile).toHaveBeenCalledWith(scriptPath, 'utf-8');
      expect(mockAudioSpeech.create).toHaveBeenCalledTimes(2);
      expect(mockAudioSpeech.create).toHaveBeenNthCalledWith(1, {
        model: 'tts-1',
        voice: 'coral',
        input: 'Hello world',
      });
      expect(mockAudioSpeech.create).toHaveBeenNthCalledWith(2, {
        model: 'tts-1',
        voice: 'coral',
        input: 'This is a test',
      });
    });

    test('shouldFilterEmptySegments', async () => {
      const mockScriptData = {
        segments: [
          { text: 'Hello world', timestamp: '00:00' },
          { text: '', timestamp: '00:05' },
          { text: '   ', timestamp: '00:10' },
          { text: 'This is a test', timestamp: '00:15' },
        ],
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(mockScriptData));
      
      const mockResponse = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      mockAudioSpeech.create.mockResolvedValue(mockResponse);
      (fs.writeFile as any).mockResolvedValue(undefined);

      const scriptPath = '/test/script.json';
      const outputPath = '/test/output.mp3';
      await audioSynthesizer.synthesizeAudio(scriptPath, outputPath);

      expect(mockAudioSpeech.create).toHaveBeenCalledTimes(2);
      expect(mockAudioSpeech.create).toHaveBeenNthCalledWith(1, {
        model: 'tts-1',
        voice: 'coral',
        input: 'Hello world',
      });
      expect(mockAudioSpeech.create).toHaveBeenNthCalledWith(2, {
        model: 'tts-1',
        voice: 'coral',
        input: 'This is a test',
      });
    });

    test('shouldThrowErrorOnEmptyContent', async () => {
      const mockScriptData = {
        segments: [
          { text: '', timestamp: '00:00' },
          { text: '   ', timestamp: '00:05' },
        ],
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(mockScriptData));

      const scriptPath = '/test/script.json';
      const outputPath = '/test/output.mp3';

      await expect(
        audioSynthesizer.synthesizeAudio(scriptPath, outputPath)
      ).rejects.toThrow(PodcastGenerationError);

      expect(mockAudioSpeech.create).not.toHaveBeenCalled();
    });

    test('shouldThrowErrorOnNoTextContent', async () => {
      const mockScriptData = {
        segments: [
          { timestamp: '00:00' },
          { timestamp: '00:05' },
        ],
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(mockScriptData));

      const scriptPath = '/test/script.json';
      const outputPath = '/test/output.mp3';

      await expect(
        audioSynthesizer.synthesizeAudio(scriptPath, outputPath)
      ).rejects.toThrow(PodcastGenerationError);
    });

    test('shouldHandleOpenAIAPIError', async () => {
      const mockScriptData = {
        segments: [{ text: 'Hello world', timestamp: '00:00' }],
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(mockScriptData));
      
      const apiError = new Error('OpenAI API error');
      mockAudioSpeech.create.mockRejectedValue(apiError);

      const scriptPath = '/test/script.json';
      const outputPath = '/test/output.mp3';

      await expect(
        audioSynthesizer.synthesizeAudio(scriptPath, outputPath)
      ).rejects.toThrow(PodcastGenerationError);

      expect(mockAudioSpeech.create).toHaveBeenCalledOnce();
    });

    test('shouldHandleFileWriteError', async () => {
      const mockScriptData = {
        segments: [{ text: 'Hello world', timestamp: '00:00' }],
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(mockScriptData));
      
      const mockResponse = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      mockAudioSpeech.create.mockResolvedValue(mockResponse);
      (fs.writeFile as any).mockRejectedValue(new Error('File write error'));

      const scriptPath = '/test/script.json';
      const outputPath = '/test/output.mp3';

      await expect(
        audioSynthesizer.synthesizeAudio(scriptPath, outputPath)
      ).rejects.toThrow(PodcastGenerationError);
    });

    test('shouldThrowErrorOnFileNotFound', async () => {
      const fileError = new Error('File not found');
      (fileError as any).code = 'ENOENT';
      (fs.readFile as any).mockRejectedValue(fileError);

      const scriptPath = '/test/nonexistent.json';
      const outputPath = '/test/output.mp3';

      await expect(
        audioSynthesizer.synthesizeAudio(scriptPath, outputPath)
      ).rejects.toThrow(PodcastGenerationError);
    });

    test('shouldThrowErrorOnInvalidJSON', async () => {
      (fs.readFile as any).mockResolvedValue('invalid json content');

      const scriptPath = '/test/invalid.json';
      const outputPath = '/test/output.mp3';

      await expect(
        audioSynthesizer.synthesizeAudio(scriptPath, outputPath)
      ).rejects.toThrow(PodcastGenerationError);
    });
  });

  describe('Custom Configuration', () => {
    test('shouldUseCustomVoiceAndModel', async () => {
      const customSynthesizer = new AudioSynthesizer(mockOpenAIClient, {
        voice: 'nova',
        model: 'tts-1-hd',
      });

      const mockScriptData = {
        segments: [{ text: 'Hello world', timestamp: '00:00' }],
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(mockScriptData));

      const mockResponse = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };
      mockAudioSpeech.create.mockResolvedValue(mockResponse);
      (fs.writeFile as any).mockResolvedValue(undefined);

      const scriptPath = '/test/script.json';
      const outputPath = '/test/output.mp3';
      await customSynthesizer.synthesizeAudio(scriptPath, outputPath);

      expect(mockAudioSpeech.create).toHaveBeenCalledWith({
        model: 'tts-1-hd',
        voice: 'nova',
        input: 'Hello world',
      });
    });
  });

  describe('estimateAudioDuration', () => {
    test('shouldEstimateDurationCorrectly', () => {
      const segments: Partial<MonologueSegment>[] = [
        { text: 'Hello world this is a test', timestamp: '00:00' },
        { text: 'Another segment with more text', timestamp: '00:05' },
      ];

      const duration = audioSynthesizer.estimateAudioDuration(segments);
      
      // Total characters: 26 + 31 = 57
      // At 15 chars/second: 57/15 = 3.8, rounded up to 4
      expect(duration).toBe(4);
    });

    test('shouldHandleEmptySegments', () => {
      const segments: Partial<MonologueSegment>[] = [];
      const duration = audioSynthesizer.estimateAudioDuration(segments);
      expect(duration).toBe(0);
    });

    test('shouldHandleSegmentsWithoutText', () => {
      const segments: Partial<MonologueSegment>[] = [
        { timestamp: '00:00' },
        { timestamp: '00:05' },
      ];

      const duration = audioSynthesizer.estimateAudioDuration(segments);
      expect(duration).toBe(0);
    });
  });
});
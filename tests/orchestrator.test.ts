import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Dependencies, generatePodcast } from '../src/orchestrator';
import type { CliOptions } from '../src/types/index.js';

describe('CLI - generatePodcast', () => {
  let mockDeps: Dependencies;
  let mockMonologueEngine: any;
  let mockScriptFormatter: any;
  let mockAudioSynthesizer: any;

  beforeEach(() => {
    // Mock class instances
    mockMonologueEngine = {
      generateMonologue: vi.fn().mockResolvedValue([
        {
          timestamp: '00:00',
          text: 'Test content',
          emotion: 'neutral',
          duration: 30,
        },
      ]),
    };

    mockScriptFormatter = {
      formatScript: vi.fn().mockResolvedValue('{"test": "json"}'),
      generateFilename: vi.fn().mockReturnValue('test-topic_2025-07-12'),
    };

    mockAudioSynthesizer = {
      synthesizeAudio: vi.fn().mockResolvedValue('/path/to/audio.mp3'),
    };

    // Mock dependencies
    mockDeps = {
      fs: {
        ensureDir: vi.fn().mockResolvedValue(undefined),
        writeFile: vi.fn().mockResolvedValue(undefined),
      } as any,
      path: {
        resolve: vi.fn().mockReturnValue('/resolved/output/path'),
        join: vi.fn().mockImplementation((...parts) => parts.join('/')),
      } as any,
      MonologueEngine: vi
        .fn()
        .mockImplementation(() => mockMonologueEngine) as any,
      ScriptFormatter: vi
        .fn()
        .mockImplementation(() => mockScriptFormatter) as any,
      AudioSynthesizer: vi
        .fn()
        .mockImplementation(() => mockAudioSynthesizer) as any,
      validateTopic: vi.fn() as any,
      validateDuration: vi.fn() as any,
      validateApiKey: vi.fn() as any,
      handleError: vi.fn() as any,
      showProgress: vi.fn() as any,
      showStep: vi.fn() as any,
      showSuccess: vi.fn() as any,
      showError: vi.fn() as any,
      showFileOutput: vi.fn() as any,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful podcast generation', () => {
    test('shouldGeneratePodcastWithValidInputs', async () => {
      // Given: Valid topic and options
      const topic = 'artificial intelligence';
      const options: CliOptions = {
        duration: '5',
        output: './test-output',
      };

      // When: Generating podcast
      await generatePodcast(topic, options, mockDeps);

      // Then: All validation functions should be called
      expect(mockDeps.validateTopic).toHaveBeenCalledWith(
        'artificial intelligence'
      );
      expect(mockDeps.validateDuration).toHaveBeenCalledWith(5);
      expect(mockDeps.validateApiKey).toHaveBeenCalled();
    });

    test('shouldCreateOutputDirectoryAndInstantiateEngines', async () => {
      // Given: Valid inputs
      const topic = 'test topic';
      const options: CliOptions = { duration: '10', output: './output' };

      // When: Generating podcast
      await generatePodcast(topic, options, mockDeps);

      // Then: Should create output directory
      expect(mockDeps.fs.ensureDir).toHaveBeenCalledWith(
        '/resolved/output/path'
      );

      // And: Should instantiate all engines
      expect(mockDeps.MonologueEngine).toHaveBeenCalled();
      expect(mockDeps.ScriptFormatter).toHaveBeenCalled();
      expect(mockDeps.AudioSynthesizer).toHaveBeenCalled();
    });

    test('shouldExecuteGenerationStepsInCorrectOrder', async () => {
      // Given: Valid inputs
      const topic = 'machine learning';
      const options: CliOptions = { duration: '5', output: './test' };

      // When: Generating podcast
      await generatePodcast(topic, options, mockDeps);

      // Then: Steps should be called in correct order
      const stepCalls = (mockDeps.showStep as any).mock.calls;
      expect(stepCalls).toHaveLength(4);
      expect(stepCalls[0]).toEqual([1, 4, 'Analyzing topic...']);
      expect(stepCalls[1]).toEqual([2, 4, 'Creating narrative content...']);
      expect(stepCalls[2]).toEqual([3, 4, 'Formatting script...']);
      expect(stepCalls[3]).toEqual([4, 4, 'Synthesizing voice...']);

      // And: Methods should be called in correct order
      expect(mockMonologueEngine.generateMonologue).toHaveBeenCalledWith(
        'machine learning',
        5
      );
      expect(mockScriptFormatter.formatScript).toHaveBeenCalledWith(
        [
          {
            timestamp: '00:00',
            text: 'Test content',
            emotion: 'neutral',
            duration: 30,
          },
        ],
        'machine learning'
      );
      expect(mockAudioSynthesizer.synthesizeAudio).toHaveBeenCalled();
    });

    test('shouldWriteFilesToCorrectPaths', async () => {
      // Given: Valid inputs
      const topic = 'climate change';
      const options: CliOptions = { duration: '5', output: './custom-output' };

      // When: Generating podcast
      await generatePodcast(topic, options, mockDeps);

      // Then: Files should be written to correct paths
      expect(mockDeps.fs.writeFile).toHaveBeenCalledWith(
        '/resolved/output/path/test-topic_2025-07-12.json',
        '{"test": "json"}'
      );
      expect(mockAudioSynthesizer.synthesizeAudio).toHaveBeenCalledWith(
        [
          {
            timestamp: '00:00',
            text: 'Test content',
            emotion: 'neutral',
            duration: 30,
          },
        ],
        '/resolved/output/path/test-topic_2025-07-12.mp3'
      );
    });

    test('shouldShowProgressAndSuccessMessages', async () => {
      // Given: Valid inputs
      const topic = 'quantum computing';
      const options: CliOptions = { duration: '5', output: './output' };

      // When: Generating podcast
      await generatePodcast(topic, options, mockDeps);

      // Then: Should show progress messages
      expect(mockDeps.showProgress).toHaveBeenCalledWith(
        "Generating podcast on: 'quantum computing'"
      );
      expect(mockDeps.showSuccess).toHaveBeenCalledWith(
        'Podcast generated successfully!'
      );

      // And: Should show file outputs
      expect(mockDeps.showFileOutput).toHaveBeenCalledWith(
        'script',
        '/resolved/output/path/test-topic_2025-07-12.json'
      );
      expect(mockDeps.showFileOutput).toHaveBeenCalledWith(
        'audio',
        '/resolved/output/path/test-topic_2025-07-12.mp3'
      );
    });
  });

  describe('Input validation and processing', () => {
    test('shouldParseDurationStringToNumber', async () => {
      // Given: Duration as string
      const topic = 'test';
      const options: CliOptions = { duration: '10', output: './output' };

      // When: Generating podcast
      await generatePodcast(topic, options, mockDeps);

      // Then: Duration should be converted to number
      expect(mockDeps.validateDuration).toHaveBeenCalledWith(10);
      expect(mockMonologueEngine.generateMonologue).toHaveBeenCalledWith(
        'test',
        10
      );
    });

    test('shouldResolveOutputPath', async () => {
      // Given: Relative output path
      const topic = 'test';
      const options: CliOptions = { duration: '5', output: '../relative/path' };

      // When: Generating podcast
      await generatePodcast(topic, options, mockDeps);

      // Then: Path should be resolved
      expect(mockDeps.path.resolve).toHaveBeenCalledWith('../relative/path');
    });

    test('shouldHandleSpecialCharactersInTopic', async () => {
      // Given: Topic with special characters
      const topic = 'AI & Machine Learning: The Future (2025)!';
      const options: CliOptions = { duration: '5', output: './output' };

      // When: Generating podcast
      await generatePodcast(topic, options, mockDeps);

      // Then: Topic should be passed to validation and generation
      expect(mockDeps.validateTopic).toHaveBeenCalledWith(
        'AI & Machine Learning: The Future (2025)!'
      );
      expect(mockMonologueEngine.generateMonologue).toHaveBeenCalledWith(
        'AI & Machine Learning: The Future (2025)!',
        5
      );
    });
  });

  describe('Error handling', () => {
    test('shouldThrowWhenValidationFails', async () => {
      // Given: Validation that throws
      const topic = '';
      const options: CliOptions = { duration: '5', output: './output' };
      (mockDeps.validateTopic as any).mockImplementation(() => {
        throw new Error('Topic validation failed');
      });

      // When/Then: Should throw validation error
      await expect(generatePodcast(topic, options, mockDeps)).rejects.toThrow(
        'Topic validation failed'
      );

      // And: Should not proceed to create engines
      expect(mockDeps.MonologueEngine).not.toHaveBeenCalled();
    });

    test('shouldThrowWhenDurationValidationFails', async () => {
      // Given: Invalid duration
      const topic = 'test';
      const options: CliOptions = { duration: '15', output: './output' };
      (mockDeps.validateDuration as any).mockImplementation(() => {
        throw new Error('Duration must be 5 or 10 minutes');
      });

      // When/Then: Should throw duration validation error
      await expect(generatePodcast(topic, options, mockDeps)).rejects.toThrow(
        'Duration must be 5 or 10 minutes'
      );
    });

    test('shouldThrowWhenApiKeyValidationFails', async () => {
      // Given: Missing API key
      const topic = 'test';
      const options: CliOptions = { duration: '5', output: './output' };
      (mockDeps.validateApiKey as any).mockImplementation(() => {
        throw new Error('API key required');
      });

      // When/Then: Should throw API key validation error
      await expect(generatePodcast(topic, options, mockDeps)).rejects.toThrow(
        'API key required'
      );
    });

    test('shouldThrowWhenFileSystemOperationFails', async () => {
      // Given: File system error
      const topic = 'test';
      const options: CliOptions = { duration: '5', output: './output' };
      (mockDeps.fs.ensureDir as any).mockRejectedValue(
        new Error('Permission denied')
      );

      // When/Then: Should throw file system error
      await expect(generatePodcast(topic, options, mockDeps)).rejects.toThrow(
        'Permission denied'
      );

      // And: Should have shown progress before error
      expect(mockDeps.showProgress).toHaveBeenCalledWith(
        "Generating podcast on: 'test'"
      );
    });

    test('shouldThrowWhenMonologueGenerationFails', async () => {
      // Given: MonologueEngine that throws
      const topic = 'test';
      const options: CliOptions = { duration: '5', output: './output' };
      mockMonologueEngine.generateMonologue.mockRejectedValue(
        new Error('API failure')
      );

      // When/Then: Should throw monologue generation error
      await expect(generatePodcast(topic, options, mockDeps)).rejects.toThrow(
        'API failure'
      );

      // And: Should have shown step 1
      expect(mockDeps.showStep).toHaveBeenCalledWith(
        1,
        4,
        'Analyzing topic...'
      );
      // But: Should not have proceeded to step 2
      expect(mockDeps.showStep).not.toHaveBeenCalledWith(
        2,
        4,
        'Creating narrative content...'
      );
    });

    test('shouldThrowWhenScriptFormattingFails', async () => {
      // Given: ScriptFormatter that throws
      const topic = 'test';
      const options: CliOptions = { duration: '5', output: './output' };
      mockScriptFormatter.formatScript.mockRejectedValue(
        new Error('Formatting error')
      );

      // When/Then: Should throw script formatting error
      await expect(generatePodcast(topic, options, mockDeps)).rejects.toThrow(
        'Formatting error'
      );

      // And: Should have completed step 1 but failed at step 2
      expect(mockDeps.showStep).toHaveBeenCalledWith(
        2,
        4,
        'Creating narrative content...'
      );
    });

    test('shouldThrowWhenFileWriteFails', async () => {
      // Given: File write error
      const topic = 'test';
      const options: CliOptions = { duration: '5', output: './output' };
      (mockDeps.fs.writeFile as any).mockRejectedValue(new Error('Disk full'));

      // When/Then: Should throw file write error
      await expect(generatePodcast(topic, options, mockDeps)).rejects.toThrow(
        'Disk full'
      );
    });

    test('shouldThrowWhenAudioSynthesisFails', async () => {
      // Given: AudioSynthesizer that throws
      const topic = 'test';
      const options: CliOptions = { duration: '5', output: './output' };
      mockAudioSynthesizer.synthesizeAudio.mockRejectedValue(
        new Error('Audio generation failed')
      );

      // When/Then: Should throw audio synthesis error
      await expect(generatePodcast(topic, options, mockDeps)).rejects.toThrow(
        'Audio generation failed'
      );

      // And: Should have completed step 3 but failed at step 4
      expect(mockDeps.showStep).toHaveBeenCalledWith(
        4,
        4,
        'Synthesizing voice...'
      );
    });
  });

  describe('Edge cases', () => {
    test('shouldHandleEmptySegmentsFromMonologueEngine', async () => {
      // Given: MonologueEngine returns empty segments
      const topic = 'test';
      const options: CliOptions = { duration: '5', output: './output' };
      mockMonologueEngine.generateMonologue.mockResolvedValue([]);

      // When: Generating podcast
      await generatePodcast(topic, options, mockDeps);

      // Then: Should pass empty segments to formatter and synthesizer
      expect(mockScriptFormatter.formatScript).toHaveBeenCalledWith([], 'test');
      expect(mockAudioSynthesizer.synthesizeAudio).toHaveBeenCalledWith(
        [],
        expect.any(String)
      );
    });

    test('shouldHandleEmptyJsonFromScriptFormatter', async () => {
      // Given: ScriptFormatter returns empty JSON
      const topic = 'test';
      const options: CliOptions = { duration: '5', output: './output' };
      mockScriptFormatter.formatScript.mockResolvedValue('{}');

      // When: Generating podcast
      await generatePodcast(topic, options, mockDeps);

      // Then: Should write empty JSON to file
      expect(mockDeps.fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '{}'
      );
    });

    test('shouldHandleComplexFilenames', async () => {
      // Given: Topic that generates complex filename
      const topic = 'Complex Topic with Symbols!';
      const options: CliOptions = { duration: '5', output: './output' };
      mockScriptFormatter.generateFilename.mockReturnValue(
        'complex-topic-with-symbols_2025-07-12'
      );

      // When: Generating podcast
      await generatePodcast(topic, options, mockDeps);

      // Then: Should use the generated filename
      expect(mockDeps.fs.writeFile).toHaveBeenCalledWith(
        '/resolved/output/path/complex-topic-with-symbols_2025-07-12.json',
        expect.any(String)
      );
      expect(mockAudioSynthesizer.synthesizeAudio).toHaveBeenCalledWith(
        expect.any(Array),
        '/resolved/output/path/complex-topic-with-symbols_2025-07-12.mp3'
      );
    });
  });
});

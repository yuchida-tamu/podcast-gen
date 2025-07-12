import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { showProgress, showSuccess, showError, showStep, showFileOutput } from '../../src/utils/progress.js';

describe('Progress Utilities', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('showProgress', () => {
    test('shouldDisplayProgressMessage', () => {
      // Given: A progress message
      const message = 'Generating dialogue...';

      // When: Showing progress
      showProgress(message);

      // Then: Should log with blue microphone icon
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🎙️')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(message)
      );
    });

    test('shouldHandleEmptyMessage', () => {
      // Given: An empty message
      const message = '';

      // When: Showing progress
      showProgress(message);

      // Then: Should still show icon
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🎙️')
      );
    });
  });

  describe('showSuccess', () => {
    test('shouldDisplaySuccessMessage', () => {
      // Given: A success message
      const message = 'Dialogue generated successfully!';

      // When: Showing success
      showSuccess(message);

      // Then: Should log with green checkmark
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(message)
      );
    });
  });

  describe('showError', () => {
    test('shouldDisplayErrorMessage', () => {
      // Given: An error message
      const message = 'Failed to generate dialogue';

      // When: Showing error
      showError(message);

      // Then: Should log with red X mark
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✗')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(message)
      );
    });
  });

  describe('showStep', () => {
    test('shouldDisplayStepProgress', () => {
      // Given: Step information
      const step = 2;
      const total = 4;
      const message = 'Processing dialogue';

      // When: Showing step
      showStep(step, total, message);

      // Then: Should log with step counter
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[2/4]')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(message)
      );
    });

    test('shouldHandleFirstStep', () => {
      // Given: First step
      const step = 1;
      const total = 3;
      const message = 'Starting process';

      // When: Showing step
      showStep(step, total, message);

      // Then: Should log with correct counter
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[1/3]')
      );
    });

    test('shouldHandleFinalStep', () => {
      // Given: Final step
      const step = 5;
      const total = 5;
      const message = 'Completing process';

      // When: Showing step
      showStep(step, total, message);

      // Then: Should log with correct counter
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[5/5]')
      );
    });
  });

  describe('showFileOutput', () => {
    test('shouldDisplayScriptFileOutput', () => {
      // Given: Script file output
      const type = 'script';
      const path = './output/climate-change_2024-01-15.json';

      // When: Showing file output
      showFileOutput(type, path);

      // Then: Should log with script icon
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📝')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(type)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(path)
      );
    });

    test('shouldDisplayAudioFileOutput', () => {
      // Given: Audio file output  
      const type = 'audio';
      const path = './output/climate-change_2024-01-15.mp3';

      // When: Showing file output
      showFileOutput(type, path);

      // Then: Should log with audio icon
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🎵')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(type)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(path)
      );
    });

    test('shouldHandleUnknownFileType', () => {
      // Given: Unknown file type
      const type = 'Unknown';
      const path = './output/file.txt';

      // When: Showing file output
      showFileOutput(type, path);

      // Then: Should default to audio icon
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🎵')
      );
    });
  });
});
import fs from 'fs-extra';
import OpenAI from 'openai';
import path from 'path';
import type { MonologueSegment, ScriptOutput } from '../types/index.js';
import { PodcastGenerationError } from '../utils/errors.js';

export class AudioSynthesizer {
  private client: OpenAI;
  private voice: 'coral' | 'nova' | 'ember' | 'aurora' | 'sage' | 'alloy';
  private model: string;

  constructor(
    client: OpenAI,
    options?: {
      voice?: 'coral' | 'nova' | 'ember' | 'aurora' | 'sage' | 'alloy';
      model?: string;
    }
  ) {
    this.client = client;
    this.voice = options?.voice || 'coral';
    this.model = options?.model || 'tts-1';
  }

  async synthesizeAudio(
    inputPath: string,
    outputPath: string
  ): Promise<string[]> {
    try {
      // Read and parse the script file
      const fileContent = await fs.readFile(inputPath, 'utf-8');
      const scriptData: ScriptOutput = JSON.parse(fileContent);
      const validSegments = scriptData.segments.filter(
        (segment) => segment.text && segment.text.trim()
      );

      if (validSegments.length === 0) {
        throw new Error('No valid text content found in segments');
      }

      const segmentFiles: string[] = [];
      const baseDir = path.dirname(outputPath);
      const baseName = path.basename(outputPath, path.extname(outputPath));

      // Generate audio for each segment
      for (let i = 0; i < validSegments.length; i++) {
        const segment = validSegments[i];
        const segmentPath = path.join(
          baseDir,
          `${baseName}_segment_${String(i + 1).padStart(3, '0')}.mp3`
        );

        try {
          await this.synthesizeSegment(segment, segmentPath);
          segmentFiles.push(segmentPath);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          console.warn(
            `Failed to synthesize segment ${i + 1}: ${errorMessage}`
          );
          // Continue with other segments instead of failing completely
        }
      }

      if (segmentFiles.length === 0) {
        throw new Error('Failed to generate audio for any segments');
      }

      return segmentFiles;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new PodcastGenerationError(
        `Failed to synthesize audio: ${errorMessage}`,
        'audio'
      );
    }
  }

  private async synthesizeSegment(
    segment: Partial<MonologueSegment>,
    outputPath: string
  ): Promise<string> {
    if (!segment.text || !segment.text.trim()) {
      throw new Error('Segment has no text content');
    }

    const text = segment.text.trim();

    // Check if text exceeds OpenAI's character limit (4096)
    if (text.length > 4096) {
      throw new Error(
        `Segment text too long (${text.length} characters, max 4096)`
      );
    }

    // Generate speech using OpenAI TTS
    const mp3 = await this.client.audio.speech.create({
      model: this.model,
      voice: this.voice,
      input: text,
    });

    // Convert to buffer and write to file
    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.writeFile(outputPath, buffer);

    return outputPath;
  }

  estimateAudioDuration(segments: Partial<MonologueSegment>[]): number {
    const totalCharacters = segments.reduce(
      (sum, segment) => sum + (segment.text?.length || 0),
      0
    );
    const avgCharactersPerSecond = 15;
    return Math.ceil(totalCharacters / avgCharactersPerSecond);
  }
}

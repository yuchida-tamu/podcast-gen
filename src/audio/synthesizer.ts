import OpenAI from 'openai';
import { PodcastGenerationError } from '../utils/errors.js';
import type { MonologueSegment, ScriptOutput } from '../types/index.js';
import fs from 'fs-extra';

export class AudioSynthesizer {
  private client: OpenAI;
  private voice: 'coral' | 'nova' | 'ember' | 'aurora' | 'sage' | 'alloy';
  private model: string;

  constructor(client: OpenAI, options?: { voice?: 'coral' | 'nova' | 'ember' | 'aurora' | 'sage' | 'alloy'; model?: string }) {
    this.client = client;
    this.voice = options?.voice || 'coral';
    this.model = options?.model || 'tts-1';
  }

  async synthesizeAudio(segments: Partial<MonologueSegment>[], outputPath: string): Promise<string> {
    try {
      // Combine all segment texts into a single script
      const fullText = segments
        .map(segment => segment.text || '')
        .filter(text => text.trim())
        .join(' ');

      if (!fullText.trim()) {
        throw new Error('No text content found in segments');
      }

      // Generate speech using OpenAI TTS
      const mp3 = await this.client.audio.speech.create({
        model: this.model,
        voice: this.voice,
        input: fullText,
      });

      // Convert to buffer and write to file
      const buffer = Buffer.from(await mp3.arrayBuffer());
      await fs.writeFile(outputPath, buffer);
      
      return outputPath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new PodcastGenerationError(`Failed to synthesize audio: ${errorMessage}`, 'audio');
    }
  }

  async synthesizeFromFile(scriptFilePath: string, outputPath: string): Promise<string> {
    try {
      // Read and parse the script file
      const fileContent = await fs.readFile(scriptFilePath, 'utf-8');
      const scriptData: ScriptOutput = JSON.parse(fileContent);

      // Validate the script structure
      if (!scriptData.segments || !Array.isArray(scriptData.segments)) {
        throw new Error('Invalid script format: missing or invalid segments array');
      }

      // Use existing synthesizeAudio method
      return await this.synthesizeAudio(scriptData.segments, outputPath);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new PodcastGenerationError('Invalid JSON format in script file', 'audio');
      }
      if ((error as any).code === 'ENOENT') {
        throw new PodcastGenerationError(`Script file not found: ${scriptFilePath}`, 'audio');
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new PodcastGenerationError(`Failed to synthesize audio from file: ${errorMessage}`, 'audio');
    }
  }

  estimateAudioDuration(segments: Partial<MonologueSegment>[]): number {
    const totalCharacters = segments.reduce((sum, segment) => sum + (segment.text?.length || 0), 0);
    const avgCharactersPerSecond = 15;
    return Math.ceil(totalCharacters / avgCharactersPerSecond);
  }
}

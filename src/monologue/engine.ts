import type {
  LLMRequest,
  LLMService,
  MonologueSegment,
  NarrativePhase,
  NarratorConfig,
} from '../types/index.js';
import { PodcastGenerationError } from '../utils/errors.js';
import { createMonologuePrompt, NARRATOR_PROMPT } from './prompts.js';

export class MonologueEngine {
  private llmClient: LLMService;
  private narrator: NarratorConfig;
  private previousContent: MonologueSegment[];

  constructor(llmClient: LLMService) {
    this.llmClient = llmClient;

    this.narrator = {
      name: 'Narrator',
      personality: 'Engaging podcast host with balanced perspective',
      voice: 'conversational',
      systemPrompt: NARRATOR_PROMPT,
    };

    this.previousContent = [];
  }

  async generateMonologue(
    topic: string,
    duration: number = 5
  ): Promise<MonologueSegment[]> {
    try {
      this.previousContent = [];

      const segments: MonologueSegment[] = [];
      let currentTime = 0;

      // Calculate target segments based on duration
      const targetSegments = this.calculateTargetSegments(duration);

      // Phase 1: Introduction (15% of content)
      const introSegments = Math.max(1, Math.floor(targetSegments * 0.15));
      for (let i = 0; i < introSegments; i++) {
        const content = await this.generateContent(topic, 'introduction');
        const segment = this.createSegment(content, currentTime);
        segments.push(segment);
        currentTime += segment.duration;
        this.previousContent.push(segment);
      }

      // Phase 2: Exploration (70% of content)
      const explorationSegments = Math.floor(targetSegments * 0.7);
      for (let i = 0; i < explorationSegments; i++) {
        const content = await this.generateContent(topic, 'exploration');
        const segment = this.createSegment(content, currentTime);
        segments.push(segment);
        currentTime += segment.duration;
        this.previousContent.push(segment);
      }

      // Phase 3: Conclusion (15% of content)
      const conclusionSegments = Math.max(1, Math.floor(targetSegments * 0.15));
      for (let i = 0; i < conclusionSegments; i++) {
        const content = await this.generateContent(topic, 'conclusion');
        const segment = this.createSegment(content, currentTime);
        segments.push(segment);
        currentTime += segment.duration;
        this.previousContent.push(segment);
      }

      return segments;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new PodcastGenerationError(
        `Failed to generate monologue: ${errorMessage}`,
        'monologue'
      );
    }
  }

  private async generateContent(
    topic: string,
    phase: NarrativePhase
  ): Promise<string> {
    const systemPrompt =
      this.narrator.systemPrompt.personality +
      '\n\n' +
      this.narrator.systemPrompt.formatInstructions;
    const userPrompt = createMonologuePrompt(
      topic,
      phase,
      this.previousContent
    );

    const request: LLMRequest = {
      systemPrompt,
      userPrompt,
    };

    const response = await this.llmClient.generateContent(request);
    return response.content;
  }

  private createSegment(content: string, startTime: number): MonologueSegment {
    const emotion = this.extractEmotion(content);
    const cleanText = this.cleanText(content);
    const duration = this.estimateDuration(cleanText);

    return {
      timestamp: this.formatTime(startTime),
      text: cleanText,
      emotion: emotion,
      duration: duration,
    };
  }

  private extractEmotion(text: string): string {
    const emotionMatch = text.match(/\[([^\]]+)\]/);
    return emotionMatch ? emotionMatch[1] : 'neutral';
  }

  private cleanText(text: string): string {
    // Remove emotion indicators from the main text
    return text.replace(/\[([^\]]+)\]/g, '').trim();
  }

  private calculateTargetSegments(duration: number): number {
    // Aim for segments of about 20-30 seconds each
    return Math.floor(duration * 2);
  }

  private estimateDuration(text: string): number {
    // Estimate speaking time: ~150 words per minute, ~5 characters per word
    const wordsPerMinute = 150;
    const charactersPerWord = 5;
    const charactersPerSecond = (wordsPerMinute * charactersPerWord) / 60;
    const baseDuration = text.length / charactersPerSecond;

    // Add some natural variation (±20%)
    const variation = (Math.random() - 0.5) * 0.4;
    return Math.max(5, Math.floor(baseDuration * (1 + variation)));
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }
}

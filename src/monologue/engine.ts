import Anthropic from '@anthropic-ai/sdk';
import { PodcastGenerationError, validateApiKey } from '../utils/errors.js';
import { createMonologuePrompt, NARRATOR_PROMPT } from './prompts.js';
import type { MonologueSegment, NarratorConfig, NarrativePhase } from '../types/index.js';

export class MonologueEngine {
  private anthropic: Anthropic;
  private narrator: NarratorConfig;
  private previousContent: MonologueSegment[];

  constructor() {
    validateApiKey();

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.narrator = {
      name: 'Narrator',
      personality: 'Engaging podcast host with balanced perspective',
      voice: 'conversational',
      systemPrompt: NARRATOR_PROMPT
    };

    this.previousContent = [];
  }

  async generateMonologue(topic: string, duration: number = 5): Promise<MonologueSegment[]> {
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
      const explorationSegments = Math.floor(targetSegments * 0.70);
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new PodcastGenerationError(
        `Failed to generate monologue: ${errorMessage}`,
        'monologue'
      );
    }
  }

  private async generateContent(topic: string, phase: NarrativePhase): Promise<string> {
    const systemPrompt = this.narrator.systemPrompt.personality + '\n\n' + this.narrator.systemPrompt.formatInstructions;
    const userPrompt = createMonologuePrompt(topic, phase, this.previousContent);
    
    const response = await this.callAnthropicAPI(systemPrompt, userPrompt, topic, phase);
    return response;
  }

  private async callAnthropicAPI(systemPrompt: string, userPrompt: string, topic: string, phase: NarrativePhase, retries: number = 3): Promise<string> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        });

        if (response.content[0] && 'text' in response.content[0]) {
          return response.content[0].text.trim();
        }
        throw new Error('Invalid response format from API');
      } catch (error: any) {
        if (
          error.status === 401 ||
          error.message?.includes('authentication_error')
        ) {
          // API key is invalid, fall back to enhanced mock responses
          console.warn(
            'Warning: Invalid API key, falling back to enhanced mock responses'
          );
          return this.generateMockContent(topic, phase);
        }

        if (attempt === retries - 1) {
          throw error;
        }
        // Wait before retry
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1))
        );
      }
    }
    throw new Error('Failed to get response after all retries');
  }

  private generateMockContent(topic: string, phase: NarrativePhase): string {
    const mockContent: Record<NarrativePhase, string[]> = {
      introduction: [
        `You know, I've been thinking a lot about ${topic.toLowerCase()} lately, and it's really fascinating when you start to dig into it. [thoughtful] I mean, this is something that affects so many of us, yet we rarely take the time to really examine it properly.`,
        `So let's talk about ${topic.toLowerCase()} today. [engaging] This is one of those topics that seems straightforward on the surface, but the more you explore it, the more complex and interesting it becomes.`,
        `[curious] Have you ever really stopped to think about ${topic.toLowerCase()}? I mean, really think about it? Because I have to say, when I started researching this topic, I was surprised by what I discovered.`
      ],
      exploration: [
        `Now, here's where it gets really interesting. [animated] When you look at the different perspectives on this, you start to see just how nuanced the whole thing really is.`,
        `I think what's fascinating is how ${topic.toLowerCase()} connects to so many other aspects of our lives. [thoughtful] It's not just an isolated issue - it's part of this bigger web of interconnected challenges and opportunities.`,
        `You know what really struck me when I was researching this? [excited] The sheer variety of approaches people have taken to understanding ${topic.toLowerCase()}. Some focus on the practical aspects, others on the theoretical implications.`,
        `But here's the thing that really gets me thinking... [contemplative] What if we're approaching ${topic.toLowerCase()} from entirely the wrong angle? What if there's a perspective we haven't considered?`
      ],
      conclusion: [
        `So where does all this leave us? [reflective] Well, I think the key takeaway here is that ${topic.toLowerCase()} isn't as simple as we might first think.`,
        `You know, after exploring all these different angles, I'm left with more questions than answers about ${topic.toLowerCase()}, and honestly? [thoughtful] I think that's exactly as it should be.`,
        `[contemplative] The more I think about ${topic.toLowerCase()}, the more I realize that maybe the real value isn't in finding definitive answers, but in asking better questions.`
      ]
    };

    const phaseContent = mockContent[phase] || mockContent.exploration;
    return phaseContent[Math.floor(Math.random() * phaseContent.length)];
  }

  private createSegment(content: string, startTime: number): MonologueSegment {
    const emotion = this.extractEmotion(content);
    const cleanText = this.cleanText(content);
    const duration = this.estimateDuration(cleanText);

    return {
      timestamp: this.formatTime(startTime),
      text: cleanText,
      emotion: emotion,
      duration: duration
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

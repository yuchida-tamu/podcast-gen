import { PodcastGenerationError } from '../utils/errors.js';
import type { MonologueSegment, ScriptOutput } from '../types/index.js';

export class ScriptFormatter {
  public title: string;
  public generatedDate: string;

  constructor() {
    this.title = '';
    this.generatedDate = '';
  }

  async formatScript(segments: Partial<MonologueSegment>[], topic: string): Promise<string> {
    try {
      const jsonScript = this.generateJSON(segments, topic);
      return jsonScript;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new PodcastGenerationError(`Failed to format script: ${errorMessage}`, 'script');
    }
  }

  generateJSON(segments: Partial<MonologueSegment>[], topic: string): string {
    const generated = new Date().toISOString();
    const totalDuration = segments.reduce((sum, segment) => sum + (segment.duration || 0), 0);
    
    const script: ScriptOutput = {
      title: this.capitalizeFirst(topic),
      generated: generated,
      duration: totalDuration,
      segments: segments.map(segment => ({
        timestamp: segment.timestamp || '',
        text: segment.text || '',
        emotion: segment.emotion || 'neutral',
        duration: segment.duration || 0
      })),
      metadata: {
        topic: topic,
        totalSegments: segments.length,
        estimatedDuration: totalDuration,
        format: 'monologue',
        version: '1.0'
      }
    };
    
    return JSON.stringify(script, null, 2);
  }

  capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  generateFilename(topic: string): string {
    const date = new Date().toISOString().split('T')[0];
    const slug = topic
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    return `${slug}_${date}`;
  }
}

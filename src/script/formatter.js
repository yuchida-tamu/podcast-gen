import { PodcastGenerationError } from '../utils/errors.js';

export class ScriptFormatter {
  constructor() {
    this.title = '';
    this.generatedDate = '';
  }

  async formatScript(segments, topic) {
    try {
      const jsonScript = this.generateJSON(segments, topic);
      return jsonScript;
    } catch (error) {
      throw new PodcastGenerationError(`Failed to format script: ${error.message}`, 'script');
    }
  }

  generateJSON(segments, topic) {
    const generated = new Date().toISOString();
    const totalDuration = segments.reduce((sum, segment) => sum + segment.duration, 0);
    
    const script = {
      title: this.capitalizeFirst(topic),
      generated: generated,
      duration: totalDuration,
      segments: segments.map(segment => ({
        timestamp: segment.timestamp,
        text: segment.text,
        emotion: segment.emotion || 'neutral',
        duration: segment.duration
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

  capitalizeFirst(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  
  
  generateFilename(topic) {
    const date = new Date().toISOString().split('T')[0];
    const slug = topic
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    return `${slug}_${date}`;
  }
  
  capitalizeFirst(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
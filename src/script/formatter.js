import { PodcastGenerationError } from '../utils/errors.js';

export class ScriptFormatter {
  constructor() {
    this.title = '';
    this.generatedDate = '';
  }

  async formatScript(dialogue, topic) {
    try {
      const script = this.generateMarkdown(dialogue, topic);
      return script;
    } catch (error) {
      throw new PodcastGenerationError(`Failed to format script: ${error.message}`, 'script');
    }
  }

  generateMarkdown(dialogue, topic) {
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    let markdown = `# ${this.capitalizeFirst(topic)}\n`;
    markdown += `Generated: ${date} ${time}\n\n`;
    
    dialogue.forEach(entry => {
      const emotionText = entry.emotion ? ` [${entry.emotion}]` : '';
      markdown += `[${entry.timestamp}] ${entry.speaker}:${emotionText} ${entry.text}\n\n`;
    });
    
    return markdown;
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
}
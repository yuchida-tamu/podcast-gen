import { PodcastGenerationError } from '../utils/errors.js';

export class DialogueEngine {
  constructor() {
    this.agents = {
      thesis: {
        name: 'Alex',
        personality: 'Thoughtful advocate who presents structured arguments',
        voice: 'confident'
      },
      antithesis: {
        name: 'Jordan',
        personality: 'Critical thinker who challenges assumptions',
        voice: 'analytical'
      }
    };
  }

  async generateDialogue(topic, duration = 5) {
    try {
      await this.simulateApiCall(1000);
      
      const dialogue = this.createMockDialogue(topic, duration);
      return dialogue;
    } catch (error) {
      throw new PodcastGenerationError(`Failed to generate dialogue: ${error.message}`, 'dialogue');
    }
  }

  createMockDialogue(topic, duration) {
    const totalSeconds = duration * 60;
    const exchanges = Math.floor(totalSeconds / 30);
    
    const dialogue = [];
    let currentTime = 0;
    
    dialogue.push({
      timestamp: this.formatTime(currentTime),
      speaker: this.agents.thesis.name,
      text: `You know, I've been thinking about ${topic.toLowerCase()}, and I think there's a compelling case to be made here.`,
      emotion: 'thoughtful'
    });
    
    currentTime += 6;
    
    dialogue.push({
      timestamp: this.formatTime(currentTime),
      speaker: this.agents.antithesis.name,
      text: `[curious] Really? I'm not so sure about that. What makes you think so?`,
      emotion: 'skeptical'
    });
    
    currentTime += 5;
    
    for (let i = 0; i < exchanges - 2; i++) {
      const isThesis = i % 2 === 0;
      const speaker = isThesis ? this.agents.thesis.name : this.agents.antithesis.name;
      
      dialogue.push({
        timestamp: this.formatTime(currentTime),
        speaker: speaker,
        text: this.generateMockArgument(topic, isThesis, i),
        emotion: isThesis ? 'confident' : 'challenging'
      });
      
      currentTime += Math.floor(Math.random() * 15) + 10;
    }
    
    const synthesisDuration = Math.min(60, totalSeconds - currentTime);
    if (synthesisDuration > 10) {
      dialogue.push({
        timestamp: this.formatTime(currentTime),
        speaker: this.agents.thesis.name,
        text: `You know what, Jordan? I think we're both touching on something important here. Maybe the real question isn't whether we're completely right or wrong, but how we can find a middle ground.`,
        emotion: 'reflective'
      });
    }
    
    return dialogue;
  }

  generateMockArgument(topic, isThesis, index) {
    const thesisArgs = [
      `I think the key point is that ${topic.toLowerCase()} has proven benefits in similar contexts.`,
      `The evidence suggests that when we look at the data objectively, there's a clear pattern here.`,
      `What we're seeing is a fundamental shift in how people approach this issue.`,
      `I'd argue that the traditional concerns about this are becoming less relevant.`
    ];
    
    const antithesisArgs = [
      `But wait, are we really considering all the potential downsides here?`,
      `I'm not convinced that correlation equals causation in this case.`,
      `That's an interesting point, but what about the counterexamples we've seen?`,
      `Hmm, I think you might be overlooking some important nuances.`
    ];
    
    const args = isThesis ? thesisArgs : antithesisArgs;
    return args[index % args.length];
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  async simulateApiCall(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}
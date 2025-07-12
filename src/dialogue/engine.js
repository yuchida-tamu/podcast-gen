import Anthropic from '@anthropic-ai/sdk';
import { PodcastGenerationError, validateApiKey } from '../utils/errors.js';
import { createContextPrompt, SYSTEM_PROMPTS } from './prompts.js';

export class DialogueEngine {
  constructor() {
    validateApiKey();

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.agents = {
      thesis: {
        name: 'Alex',
        personality: 'Thoughtful advocate who presents structured arguments',
        voice: 'confident',
        systemPrompt: SYSTEM_PROMPTS.thesis,
      },
      antithesis: {
        name: 'Jordan',
        personality: 'Critical thinker who challenges assumptions',
        voice: 'analytical',
        systemPrompt: SYSTEM_PROMPTS.antithesis,
      },
    };

    this.conversationHistory = [];
    this.currentPhase = 'opening';
  }

  async generateDialogue(topic, duration = 5) {
    try {
      this.conversationHistory = [];
      this.currentPhase = 'opening';

      const targetExchanges = this.calculateTargetExchanges(duration);
      const dialogue = [];
      let currentTime = 0;

      // Phase 1: Opening (20% of conversation)
      const openingExchanges = Math.max(2, Math.floor(targetExchanges * 0.2));
      for (let i = 0; i < openingExchanges; i++) {
        const isThesis = i % 2 === 0;
        const response = await this.generateResponse(
          topic,
          isThesis,
          'opening'
        );
        const dialogueEntry = this.createDialogueEntry(
          response,
          isThesis,
          currentTime
        );
        dialogue.push(dialogueEntry);
        currentTime += this.estimateResponseDuration(response);
      }

      // Phase 2: Argumentation (60% of conversation)
      this.currentPhase = 'argumentation';
      const argumentationExchanges = Math.floor(targetExchanges * 0.6);
      for (let i = 0; i < argumentationExchanges; i++) {
        const isThesis = (openingExchanges + i) % 2 === 0;
        const response = await this.generateResponse(
          topic,
          isThesis,
          'argumentation'
        );
        const dialogueEntry = this.createDialogueEntry(
          response,
          isThesis,
          currentTime
        );
        dialogue.push(dialogueEntry);
        currentTime += this.estimateResponseDuration(response);
      }

      // Phase 3: Synthesis (20% of conversation)
      this.currentPhase = 'synthesis';
      const synthesisExchanges = Math.max(1, Math.floor(targetExchanges * 0.2));
      for (let i = 0; i < synthesisExchanges; i++) {
        const isThesis =
          (openingExchanges + argumentationExchanges + i) % 2 === 0;
        const response = await this.generateResponse(
          topic,
          isThesis,
          'synthesis'
        );
        const dialogueEntry = this.createDialogueEntry(
          response,
          isThesis,
          currentTime
        );
        dialogue.push(dialogueEntry);
        currentTime += this.estimateResponseDuration(response);
      }

      return dialogue;
    } catch (error) {
      throw new PodcastGenerationError(
        `Failed to generate dialogue: ${error.message}`,
        'dialogue'
      );
    }
  }

  async generateResponse(topic, isThesis, phase) {
    const agent = isThesis ? this.agents.thesis : this.agents.antithesis;
    const systemPrompt =
      agent.systemPrompt.personality +
      '\n\n' +
      agent.systemPrompt.formatInstructions;
    const contextPrompt = createContextPrompt(
      topic,
      phase,
      this.conversationHistory
    );

    const response = await this.callAnthropicAPI(systemPrompt, contextPrompt);

    // Add to conversation history
    this.conversationHistory.push({
      speaker: agent.name,
      text: response,
    });

    return response;
  }

  async callAnthropicAPI(systemPrompt, userPrompt, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await this.anthropic.messages.create({
          model: 'claude-opus-4-20250514',
          max_tokens: 300,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        });

        return response.content[0].text.trim();
      } catch (error) {
        if (
          error.status === 401 ||
          error.message.includes('authentication_error')
        ) {
          // API key is invalid, fall back to enhanced mock responses
          console.warn(
            'Warning: Invalid API key, falling back to enhanced mock responses'
          );
          return this.generateEnhancedMockResponse(systemPrompt, userPrompt);
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
  }

  generateEnhancedMockResponse(systemPrompt, userPrompt) {
    const isAlex = systemPrompt.includes('Alex');
    const phase = this.currentPhase;
    const topic =
      userPrompt.match(/<topic>(.*?)<\/topic>/)?.[1] || 'this topic';

    const alexResponses = {
      opening: [
        `You know, I've been thinking about ${topic.toLowerCase()}, and I really think there's a strong case to be made here. [thoughtful] I mean, when you look at the evidence...`,
        `[excited] This is such an important topic! I believe ${topic.toLowerCase()} could really transform how we approach things. Let me tell you why...`,
        `Well, ${topic.toLowerCase()} is something I'm quite passionate about. [confident] I think if we really examine the benefits...`,
      ],
      argumentation: [
        `But that's exactly my point! [animated] When we consider the real-world applications, ${topic.toLowerCase()} has shown remarkable results.`,
        `I hear what you're saying, but I think you're missing a key aspect here. [thoughtful] The data actually suggests...`,
        `[laughs] Jordan, I love how you challenge everything! But consider this perspective...`,
      ],
      synthesis: [
        `You know what, Jordan? [reflective] I think we're both touching on something important here. Maybe the real question isn't whether we're completely right or wrong...`,
        `[thoughtful] This conversation has really made me think. Perhaps there's a middle ground we haven't considered...`,
        `I have to say, your points have given me a lot to think about. [contemplative] Maybe the answer lies somewhere in between...`,
      ],
    };

    const jordanResponses = {
      opening: [
        `[skeptical] Really? I'm not so sure about that, Alex. What makes you think ${topic.toLowerCase()} is the right approach?`,
        `Hmm, that's interesting, but I have some serious concerns about ${topic.toLowerCase()}. [curious] Have you considered the potential downsides?`,
        `[questioning] I appreciate your enthusiasm, but I think we need to be more critical here. What about the counterarguments?`,
      ],
      argumentation: [
        `[challenging] But wait, are we really considering all the potential downsides here? I think you might be overlooking some important nuances.`,
        `That's a fair point, but I'm not convinced. [analytical] What about the cases where ${topic.toLowerCase()} has actually caused problems?`,
        `[laughs] I appreciate your optimism, Alex, but I think you're being a bit too rosy here. Let me throw some cold water on this...`,
      ],
      synthesis: [
        `[reflective] You know what, Alex? I think this debate has really highlighted the complexity of the issue. Maybe we're both right in different ways.`,
        `[thoughtful] I have to admit, some of your points have merit. Perhaps the solution isn't as black and white as I initially thought.`,
        `[contemplative] This has been a really enlightening discussion. I think we've both learned something here.`,
      ],
    };

    const responses = isAlex ? alexResponses : jordanResponses;
    const phaseResponses = responses[phase] || responses.argumentation;

    return phaseResponses[Math.floor(Math.random() * phaseResponses.length)];
  }

  createDialogueEntry(response, isThesis, currentTime) {
    const speaker = isThesis
      ? this.agents.thesis.name
      : this.agents.antithesis.name;
    const emotion = this.extractEmotion(response);
    const cleanText = this.cleanResponseText(response);

    return {
      timestamp: this.formatTime(currentTime),
      speaker: speaker,
      text: cleanText,
      emotion: emotion,
    };
  }

  extractEmotion(text) {
    const emotionMatch = text.match(/\[([^\]]+)\]/);
    return emotionMatch ? emotionMatch[1] : null;
  }

  cleanResponseText(text) {
    // Remove emotion indicators from the main text while preserving natural flow
    return text.replace(/\[([^\]]+)\]/g, '').trim();
  }

  calculateTargetExchanges(duration) {
    // Aim for about 2-3 exchanges per minute
    return Math.floor(duration * 2.5);
  }

  estimateResponseDuration(text) {
    // Estimate speaking time: ~150 words per minute, ~5 characters per word
    const wordsPerMinute = 150;
    const charactersPerWord = 5;
    const charactersPerSecond = (wordsPerMinute * charactersPerWord) / 60;
    const baseDuration = text.length / charactersPerSecond;

    // Add some natural variation (±20%)
    const variation = (Math.random() - 0.5) * 0.4;
    return Math.max(3, Math.floor(baseDuration * (1 + variation)));
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }
}

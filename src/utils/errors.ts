import type { ValidationResult, TopicString, DurationMinutes } from '../types/index.js';

export class PodcastGenerationError extends Error {
  public readonly phase: string;
  
  constructor(message: string, phase: string = 'unknown') {
    super(message);
    this.name = 'PodcastGenerationError';
    this.phase = phase;
  }
}

export function handleError(error: Error): never {
  if (error instanceof PodcastGenerationError) {
    console.error(`Error in ${error.phase}: ${error.message}`);
  } else {
    console.error(`Unexpected error: ${error.message}`);
  }
  process.exit(1);
}

export function validateTopic(topic: TopicString): ValidationResult {
  if (!topic || typeof topic !== 'string') {
    throw new PodcastGenerationError('Topic must be a non-empty string', 'validation');
  }
  
  if (topic.length < 5) {
    throw new PodcastGenerationError('Topic must be at least 5 characters long', 'validation');
  }
  
  if (topic.length > 200) {
    throw new PodcastGenerationError('Topic must be less than 200 characters', 'validation');
  }
}

export function validateDuration(duration: number): ValidationResult {
  const validDurations: DurationMinutes[] = [5, 10];
  if (!validDurations.includes(duration as DurationMinutes)) {
    throw new PodcastGenerationError('Duration must be 5 or 10 minutes', 'validation');
  }
}

export function validateApiKey(): ValidationResult {
  // Check OpenAI API Key
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey || openaiKey.trim() === '') {
    throw new PodcastGenerationError(
      'OpenAI API key is required. Please provide it via --openai-key flag or set OPENAI_API_KEY environment variable. Get your key at: https://platform.openai.com/api-keys',
      'configuration'
    );
  }
  
  // Basic format check for OpenAI key
  if (!openaiKey.startsWith('sk-')) {
    throw new PodcastGenerationError(
      'Invalid OpenAI API key format. Keys should start with "sk-"',
      'configuration'
    );
  }
  
  // Check Anthropic API Key
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey || anthropicKey.trim() === '') {
    throw new PodcastGenerationError(
      'ANTHROPIC_API_KEY environment variable is required',
      'configuration'
    );
  }
  
  // Basic format check - should start with sk-ant or ysk-ant
  if (!anthropicKey.startsWith('sk-ant') && !anthropicKey.startsWith('ysk-ant')) {
    throw new PodcastGenerationError(
      'Invalid ANTHROPIC_API_KEY format',
      'configuration'
    );
  }
}

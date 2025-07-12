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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey || apiKey.trim() === '') {
    throw new PodcastGenerationError(
      'ANTHROPIC_API_KEY environment variable is required',
      'configuration'
    );
  }
  
  // Basic format check - should start with sk-ant or ysk-ant
  if (!apiKey.startsWith('sk-ant') && !apiKey.startsWith('ysk-ant')) {
    throw new PodcastGenerationError(
      'Invalid ANTHROPIC_API_KEY format',
      'configuration'
    );
  }
}

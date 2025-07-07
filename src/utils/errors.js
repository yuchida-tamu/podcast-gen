export class PodcastGenerationError extends Error {
  constructor(message, phase = 'unknown') {
    super(message);
    this.name = 'PodcastGenerationError';
    this.phase = phase;
  }
}

export function handleError(error) {
  if (error instanceof PodcastGenerationError) {
    console.error(`Error in ${error.phase}: ${error.message}`);
  } else {
    console.error(`Unexpected error: ${error.message}`);
  }
  process.exit(1);
}

export function validateTopic(topic) {
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

export function validateDuration(duration) {
  const validDurations = [5, 10];
  if (!validDurations.includes(duration)) {
    throw new PodcastGenerationError('Duration must be 5 or 10 minutes', 'validation');
  }
}
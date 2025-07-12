// Core data structures for the podcast generator

export interface MonologueSegment {
  timestamp: string;
  text: string;
  emotion?: string;
  duration: number;
}

export interface ScriptMetadata {
  topic: string;
  totalSegments: number;
  estimatedDuration: number;
  format: 'monologue';
  version: string;
}

export interface ScriptOutput {
  title: string;
  generated: string;
  duration: number;
  segments: MonologueSegment[];
  metadata: ScriptMetadata;
}

// Narrator configuration
export interface NarratorConfig {
  name: string;
  personality: string;
  voice: string;
  systemPrompt: NarratorPrompt;
}

export interface NarratorPrompt {
  personality: string;
  formatInstructions: string;
}

// Narrative phases for monologue structure
export type NarrativePhase = 'introduction' | 'exploration' | 'conclusion';

export interface PhaseConfig {
  description: string;
  instructions: string;
  targetPercentage: number;
}

export type NarrativePhases = Record<NarrativePhase, PhaseConfig>;

// API and Error types
export interface ApiResponse {
  content: Array<{ text: string }>;
}

// CLI types
export interface CliOptions {
  duration: string;
  output: string;
}

// Progress types
export type ProgressStep = number;
export type ProgressMessage = string;

// File output types
export type OutputFileType = 'Script (JSON)' | 'Audio';

// Validation types
export type ValidationResult = void; // throws on failure
export type TopicString = string;
export type DurationMinutes = 5 | 10;
export type ApiKey = string;

// LLM Client types
export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  model?: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  retries: number;
  timeout: number;
}

export interface APIClientConfig {
  retries: number;
  timeout: number;
  baseDelay: number;
  maxDelay: number;
}

export interface LLMService {
  generateContent(request: LLMRequest): Promise<LLMResponse>;
  isHealthy(): Promise<boolean>;
}

// LLM Error types
export class LLMError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;

  constructor(message: string, code: string, retryable: boolean = false) {
    super(message);
    this.name = 'LLMError';
    this.code = code;
    this.retryable = retryable;
  }
}

export class LLMAuthenticationError extends LLMError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', false);
  }
}

export class LLMRateLimitError extends LLMError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', true);
  }
}

export class LLMNetworkError extends LLMError {
  constructor(message: string = 'Network error') {
    super(message, 'NETWORK_ERROR', true);
  }
}

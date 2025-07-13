import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs-extra';
import path from 'path';
import { AudioSynthesizer } from './audio/synthesizer.js';
import { AnthropicService } from './llm/AnthropicService.js';
import { MonologueEngine } from './monologue/engine.js';
import { ScriptFormatter } from './script/formatter.js';
import { CliOptions } from './types';
import {
  handleError,
  validateApiKey,
  validateDuration,
  validateTopic,
} from './utils/errors.js';
import {
  showError,
  showFileOutput,
  showProgress,
  showStep,
  showSuccess,
} from './utils/progress.js';

// Dependencies interface for testing
export interface Dependencies {
  fs: typeof fs;
  path: typeof path;
  MonologueEngine: typeof MonologueEngine;
  ScriptFormatter: typeof ScriptFormatter;
  AudioSynthesizer: typeof AudioSynthesizer;
  validateTopic: typeof validateTopic;
  validateDuration: typeof validateDuration;
  validateApiKey: typeof validateApiKey;
  handleError: typeof handleError;
  showProgress: typeof showProgress;
  showStep: typeof showStep;
  showSuccess: typeof showSuccess;
  showError: typeof showError;
  showFileOutput: typeof showFileOutput;
}

// Default dependencies
const defaultDependencies: Dependencies = {
  fs,
  path,
  MonologueEngine,
  ScriptFormatter,
  AudioSynthesizer,
  validateTopic,
  validateDuration,
  validateApiKey,
  handleError,
  showProgress,
  showStep,
  showSuccess,
  showError,
  showFileOutput,
};

export async function generatePodcast(
  topic: string,
  options: CliOptions,
  deps: Dependencies = defaultDependencies
): Promise<void> {
  const duration = parseInt(options.duration);
  const outputDir = deps.path.resolve(options.output);

  // Validation
  deps.validateTopic(topic);
  deps.validateDuration(duration);
  deps.validateApiKey();

  deps.showProgress(`Generating podcast on: '${topic}'`);

  // Ensure output directory exists
  await deps.fs.ensureDir(outputDir);

  // Initialize engines
  const llmService = new AnthropicService(
    new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  );
  const monologueEngine = new deps.MonologueEngine(llmService);
  const scriptFormatter = new deps.ScriptFormatter();
  const audioSynthesizer = new deps.AudioSynthesizer();

  // Step 1: Generate monologue
  deps.showStep(1, 4, 'Analyzing topic...');
  const segments = await monologueEngine.generateMonologue(topic, duration);

  // Step 2: Format script
  deps.showStep(2, 4, 'Creating narrative content...');
  const jsonScript = await scriptFormatter.formatScript(segments, topic);

  // Step 3: Save script file
  deps.showStep(3, 4, 'Formatting script...');
  const filename = scriptFormatter.generateFilename(topic);
  const jsonPath = deps.path.join(outputDir, `${filename}.json`);
  await deps.fs.writeFile(jsonPath, jsonScript);

  // Step 4: Generate audio
  deps.showStep(4, 4, 'Synthesizing voice...');
  const audioPath = deps.path.join(outputDir, `${filename}.mp3`);
  await audioSynthesizer.synthesizeAudio(segments, audioPath);

  // Success
  deps.showSuccess('Podcast generated successfully!');
  deps.showFileOutput('script', jsonPath);
  deps.showFileOutput('audio', audioPath);
}

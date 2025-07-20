import fs from 'fs-extra';
import OpenAI from 'openai';
import path from 'path';
import { AudioDataTransformer } from './audio/dataTransformer.js';
import { AudioSynthesizer } from './audio/synthesizer.js';
import { OpenAIService } from './llm/OpenAIService';
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
  AudioDataTransformer: typeof AudioDataTransformer;
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
  AudioDataTransformer,
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
  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const llmService = new OpenAIService(openaiClient);
  const monologueEngine = new deps.MonologueEngine(llmService);
  const scriptFormatter = new deps.ScriptFormatter();
  const audioSynthesizer = new deps.AudioSynthesizer(openaiClient);
  const audioDataTransformer = new deps.AudioDataTransformer();

  let jsonPath = options.script;
  let filename = '';

  if (jsonPath === '') {
    // Step 1: Generate monologue
    deps.showStep(1, 5, 'Analyzing topic...');
    const segments = await monologueEngine.generateMonologue(topic, duration);

    // Step 2: Format script
    deps.showStep(2, 5, 'Creating narrative content...');
    const jsonScript = await scriptFormatter.formatScript(segments, topic);

    // Step 3: Save script file
    deps.showStep(3, 5, 'Formatting script...');
    filename = scriptFormatter.generateFilename(topic);
    jsonPath = deps.path.join(outputDir, `${filename}.json`);
    await deps.fs.writeFile(jsonPath, jsonScript);
  }

  // Step 4: Generate audio
  deps.showStep(4, 5, 'Synthesizing voice...');
  const audioPath = deps.path.join(outputDir, `${filename}.mp3`);
  const segmentFiles = await audioSynthesizer.synthesizeAudio(
    jsonPath,
    audioPath
  );

  // Step 5: Concatenate audio segments
  deps.showStep(5, 5, 'Combining audio segments...');
  try {
    await audioDataTransformer.concatenate(segmentFiles, audioPath);
    deps.showSuccess('Audio segments successfully concatenated!');
  } catch (error) {
    deps.handleError(
      new Error(`Failed to concatenate audio segments: ${error}`)
    );
  }

  // Success
  deps.showSuccess('Podcast generated successfully!');
  deps.showFileOutput('script', jsonPath);

  // Show final concatenated audio file
  deps.showFileOutput('audio', audioPath);
  
  // Show all generated audio segment files
  segmentFiles.forEach((segmentPath, index) => {
    deps.showFileOutput(`audio segment ${index + 1}`, segmentPath);
  });
}

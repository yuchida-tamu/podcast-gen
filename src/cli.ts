#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import { AudioSynthesizer } from './audio/synthesizer.js';
import { MonologueEngine } from './monologue/engine.js';
import { ScriptFormatter } from './script/formatter.js';
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
import type { CliOptions } from './types/index.js';

dotenv.config();

const program = new Command();

program
  .name('podcast-gen')
  .description('AI-Powered Monologue Podcast Generator')
  .version('1.0.0');

program
  .argument('<topic>', 'Topic for the monologue podcast')
  .option('-d, --duration <minutes>', 'Duration in minutes (5 or 10)', '5')
  .option('-o, --output <path>', 'Output directory', './output')
  .action(async (topic: string, options: CliOptions) => {
    try {
      const duration = parseInt(options.duration);
      const outputDir = path.resolve(options.output);

      validateTopic(topic);
      validateDuration(duration);
      validateApiKey();

      showProgress(`Generating podcast on: '${topic}'`);

      await fs.ensureDir(outputDir);

      const monologueEngine = new MonologueEngine();
      const scriptFormatter = new ScriptFormatter();
      const audioSynthesizer = new AudioSynthesizer();

      showStep(1, 4, 'Analyzing topic...');
      const segments = await monologueEngine.generateMonologue(topic, duration);

      showStep(2, 4, 'Creating narrative content...');
      const jsonScript = await scriptFormatter.formatScript(segments, topic);

      showStep(3, 4, 'Formatting script...');
      const filename = scriptFormatter.generateFilename(topic);
      const jsonPath = path.join(outputDir, `${filename}.json`);
      await fs.writeFile(jsonPath, jsonScript);

      showStep(4, 4, 'Synthesizing voice...');
      const audioPath = path.join(outputDir, `${filename}.mp3`);
      await audioSynthesizer.synthesizeAudio(segments, audioPath);

      showSuccess('Podcast generated successfully!');
      showFileOutput('script', jsonPath);
      showFileOutput('audio', audioPath);
    } catch (error) {
      showError('Failed to generate podcast');
      handleError(error as Error);
    }
  });

program.parse();

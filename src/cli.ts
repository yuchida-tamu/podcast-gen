#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { generatePodcast } from './orchestrator';
import type { CliOptions } from './types/index.js';
import { handleError } from './utils/errors.js';
import { showError } from './utils/progress.js';

// CLI setup - only runs when this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
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
    .option('-s, --script <script>', 'Script path for audio synthesis', '')
    .action(async (topic: string, options: CliOptions) => {
      try {
        await generatePodcast(topic, options);
      } catch (error) {
        showError('Failed to generate podcast');
        handleError(error as Error);
      }
    });

  program.parse();
}

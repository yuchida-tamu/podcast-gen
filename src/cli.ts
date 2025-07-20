#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { generatePodcast } from './orchestrator.js';
import type { CliOptions } from './types/index.js';
import { handleError } from './utils/errors.js';
import { showError } from './utils/progress.js';

// CLI setup - runs when this file is executed directly
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
    .option('--openai-key <key>', 'OpenAI API key (alternatively set OPENAI_API_KEY env var)')
    .action(async (topic: string, options: CliOptions) => {
      try {
        // Set OpenAI API key from CLI flag if provided
        if (options.openaiKey) {
          process.env.OPENAI_API_KEY = options.openaiKey;
        }
        
        await generatePodcast(topic, options);
      } catch (error) {
        showError('Failed to generate podcast');
        handleError(error as Error);
      }
    });

  program.parse();

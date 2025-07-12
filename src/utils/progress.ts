import chalk from 'chalk';
import type { ProgressStep, ProgressMessage } from '../types/index.js';

export function showProgress(message: ProgressMessage): void {
  console.log(chalk.blue('🎙️ ') + message);
}

export function showSuccess(message: ProgressMessage): void {
  console.log(chalk.green('✓ ') + message);
}

export function showError(message: ProgressMessage): void {
  console.log(chalk.red('✗ ') + message);
}

export function showStep(step: ProgressStep, total: ProgressStep, message: ProgressMessage): void {
  console.log(chalk.cyan(`[${step}/${total}] `) + message);
}

export function showFileOutput(type: string, path: string): void {
  const icon = type === 'script' ? '📝' : '🎵';
  console.log(chalk.yellow(`${icon} ${type}: `) + chalk.underline(path));
}

import chalk from 'chalk';

export function showProgress(message) {
  console.log(chalk.blue('🎙️ ') + message);
}

export function showSuccess(message) {
  console.log(chalk.green('✓ ') + message);
}

export function showError(message) {
  console.log(chalk.red('✗ ') + message);
}

export function showStep(step, total, message) {
  console.log(chalk.cyan(`[${step}/${total}] `) + message);
}

export function showFileOutput(type, path) {
  const icon = type === 'script' ? '📝' : '🎵';
  console.log(chalk.yellow(`${icon} ${type}: `) + chalk.underline(path));
}
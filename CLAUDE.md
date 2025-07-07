# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DialecticCast is an AI-powered dialectical podcast generator that creates natural-sounding conversations between two AI agents engaged in dialectical debates. The system takes a topic as input and produces both an audio file and a transcript following the thesis-antithesis-synthesis structure.

## Development Commands

### Setup
```bash
npm install
```

### Development
```bash
npm run dev        # Start development mode
npm run build      # Build the project
npm run start      # Run the built application
```

### Testing
```bash
npm test           # Run all tests
npm run test:watch # Run tests in watch mode
```

### Linting
```bash
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint issues
```

## Architecture

### Core Components

1. **CLI Interface** (`src/cli.js`)
   - Command-line argument parsing using Commander.js
   - Progress indicators and user feedback
   - Error handling and validation

2. **Dialogue Engine** (`src/dialogue/`)
   - LLM integration for generating natural conversations
   - Dialectical structure implementation (thesis-antithesis-synthesis)
   - Agent personality management

3. **Script Generator** (`src/script/`)
   - Markdown formatting with timestamps
   - Speaker labels and emotion indicators
   - Natural speech pattern formatting

4. **Audio Synthesis** (`src/audio/`)
   - ElevenLabs API integration
   - Voice selection and management
   - MP3 output generation

### Key Dependencies

- **Commander.js**: CLI framework
- **OpenAI/Anthropic SDK**: LLM integration for dialogue generation
- **ElevenLabs SDK**: Voice synthesis
- **Chalk**: Terminal styling
- **Dotenv**: Environment variable management

## Environment Variables

Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=your_openai_key_here
ELEVENLABS_API_KEY=your_elevenlabs_key_here
```

## Project Structure

```
src/
├── cli.js              # Main CLI entry point
├── dialogue/           # Dialogue generation logic
│   ├── engine.js       # Core dialogue generation
│   └── agents.js       # Agent configuration
├── script/             # Script formatting
│   └── formatter.js    # Markdown/timestamp formatting
├── audio/              # Audio synthesis
│   └── synthesizer.js  # ElevenLabs integration
└── utils/              # Shared utilities
    ├── progress.js     # Progress indicators
    └── errors.js       # Error handling
```

## CLI Usage

```bash
# Basic usage
podcast-gen "Is universal basic income feasible?"

# With options
podcast-gen "Climate change solutions" --duration 10 --output ./my-podcasts
```

## Technical Requirements

- **Node.js**: 18+ required
- **Memory**: Keep usage under 512MB
- **API Timeouts**: 30-second timeout with retry logic
- **Generation Time**: Target under 5 minutes for 10-minute podcast

## Output Format

- **Script**: Markdown file with timestamps (`MM:SS` format)
- **Audio**: MP3 file, 128kbps minimum
- **Naming**: `topic-slug_YYYY-MM-DD.{md,mp3}`

## Development Guidelines

### Dialogue Generation
- Ensure natural conversation flow with interruptions and overlaps
- Include thinking pauses and emotional reactions
- Maintain balanced perspectives without bias
- Follow dialectical structure: opening → argumentation → synthesis

### Audio Quality
- Use distinct voices for each agent
- Ensure natural pacing and intonation
- Match emotional expression to dialogue content
- Maintain consistent audio quality throughout

### Error Handling
- Graceful handling of API failures
- Clear, helpful error messages
- Automatic retry logic for transient failures
- Input validation for topics and parameters

## Content Guidelines

- Avoid generating harmful or offensive content
- Maintain balanced, respectful perspectives
- Focus on ideas rather than personal attacks
- Ensure appropriate conversation length for specified duration
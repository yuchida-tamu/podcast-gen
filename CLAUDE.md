# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Always follow the instructions in plan.md. When I say "go", find the next unmarked test in plan.md, implement the test, then implement only enough code to make that test pass.

# ROLE AND EXPERTISE

You are a senior software engineer who follows Kent Beck's Test-Driven Development (TDD) and Tidy First principles. Your purpose is to guide development following these methodologies precisely.

# CORE DEVELOPMENT PRINCIPLES

- Always follow the TDD cycle: Red → Green → Refactor
- Write the simplest failing test first
- Implement the minimum code needed to make tests pass
- Refactor only after tests are passing
- Follow Beck's "Tidy First" approach by separating structural changes from behavioral changes
- Maintain high code quality throughout development

# TDD METHODOLOGY GUIDANCE

- Start by writing a failing test that defines a small increment of functionality
- Use meaningful test names that describe behavior (e.g., "shouldSumTwoPositiveNumbers")
- Make test failures clear and informative
- Write just enough code to make the test pass - no more
- Once tests pass, consider if refactoring is needed
- Repeat the cycle for new functionality
- When fixing a defect, first write an API-level failing test then write the smallest possible test that replicates the problem then get both tests to pass.

# TIDY FIRST APPROACH

- Separate all changes into two distinct types:
  1. STRUCTURAL CHANGES: Rearranging code without changing behavior (renaming, extracting methods, moving code)
  2. BEHAVIORAL CHANGES: Adding or modifying actual functionality
- Never mix structural and behavioral changes in the same commit
- Always make structural changes first when both are needed
- Validate structural changes do not alter behavior by running tests before and after

# COMMIT DISCIPLINE

- Only commit when:
  1. ALL tests are passing
  2. ALL compiler/linter warnings have been resolved
  3. The change represents a single logical unit of work
  4. Commit messages clearly state whether the commit contains structural or behavioral changes
- Use small, frequent commits rather than large, infrequent ones

# CODE QUALITY STANDARDS

- Eliminate duplication ruthlessly
- Express intent clearly through naming and structure
- Make dependencies explicit
- Keep methods small and focused on a single responsibility
- Minimize state and side effects
- Use the simplest solution that could possibly work

# REFACTORING GUIDELINES

- Refactor only when tests are passing (in the "Green" phase)
- Use established refactoring patterns with their proper names
- Make one refactoring change at a time
- Run tests after each refactoring step
- Prioritize refactorings that remove duplication or improve clarity

# EXAMPLE WORKFLOW

When approaching a new feature:

1. Write a simple failing test for a small part of the feature
2. Implement the bare minimum to make it pass
3. Run tests to confirm they pass (Green)
4. Make any necessary structural changes (Tidy First), running tests after each change
5. Commit structural changes separately
6. Add another test for the next small increment of functionality
7. Repeat until the feature is complete, committing behavioral changes separately from structural ones

Follow this process precisely, always prioritizing clean, well-tested code over quick implementation.

Always write one test at a time, make it run, then improve structure. Always run all the tests (except long-running tests) each time.

# Project

## Project Overview

DialecticCast is an AI-powered podcast generator that creates natural-sounding monologues delivered by an AI narrator. The system takes a topic as input and produces both an audio file and a JSON script following a narrative structure.

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

2. **Monologue Engine** (`src/monologue/`)

   - LLM integration for generating natural monologues
   - Narrative structure implementation (introduction-exploration-conclusion)
   - Single narrator personality management

3. **Script Generator** (`src/script/`)

   - JSON formatting with timestamps and metadata
   - Emotion indicators for TTS optimization
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

- **Script**: JSON file with timestamps and metadata
- **Audio**: MP3 file, 128kbps minimum
- **Naming**: `topic-slug_YYYY-MM-DD.{json,mp3}`

## Development Guidelines

### Monologue Generation

- Ensure natural narrative flow with smooth transitions
- Include thinking pauses and emotional reactions
- Maintain balanced perspectives without bias
- Follow narrative structure: introduction → exploration → conclusion

### Audio Quality

- Use consistent narrator voice
- Ensure natural pacing and intonation
- Match emotional expression to monologue content
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

# MonologueCast 🎙️

AI-Powered Monologue Podcast Generator

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

MonologueCast is a command-line application that generates natural-sounding podcast episodes featuring an AI narrator delivering engaging monologues. Users input a topic, and the system produces both a concatenated audio file and a structured JSON script of a thoughtful, balanced exploration following a narrative structure.

## 🌟 Features

- **Natural Monologue Generation**: Single AI narrator delivers engaging, balanced explorations
- **Narrative Structure**: Follows introduction-exploration-conclusion flow
- **JSON Output Format**: Generates structured JSON scripts with timestamps and metadata
- **Audio Concatenation**: Automatically combines audio segments into a single MP3 file
- **Flexible Duration**: Support for 5 or 10-minute podcast episodes
- **CLI Interface**: Simple command-line interface with progress indicators
- **Error Handling**: Robust validation and helpful error messages

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed on your system
- npm package manager

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd podcast-gen
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

### Basic Usage

Generate a 5-minute podcast (default):
```bash
npm run dev "Is universal basic income feasible?"
```

Generate a 10-minute podcast with custom output directory:
```bash
npm run dev "Climate change solutions" --duration 10 --output ./my-podcasts
```

Use existing script:
```bash
npm run dev "" --script ./path/to/script.json
```

### Command Options

```bash
podcast-gen <topic> [options]

Arguments:
  topic                    Topic for the monologue podcast

Options:
  -d, --duration <minutes> Duration in minutes (5 or 10) (default: "5")
  -o, --output <path>      Output directory (default: "./output")
  -s, --script <path>      Use existing script file instead of generating new content
  -h, --help              Display help for command
```

## 📁 Output Files

The generator creates multiple files for each podcast:

- **Script**: `topic-slug_YYYY-MM-DD.json` - Structured JSON script with timestamps and metadata
- **Audio**: `topic-slug_YYYY-MM-DD.mp3` - Final concatenated MP3 audio file
- **Segments**: `topic-slug_YYYY-MM-DD_segment_001.mp3` - Individual audio segments

### Example Output Structure

```
output/
├── is-universal-basic-income-feasible_2025-07-07.json
├── is-universal-basic-income-feasible_2025-07-07.mp3
├── is-universal-basic-income-feasible_2025-07-07_segment_001.mp3
├── is-universal-basic-income-feasible_2025-07-07_segment_002.mp3
├── climate-change-solutions_2025-07-07.json
├── climate-change-solutions_2025-07-07.mp3
├── climate-change-solutions_2025-07-07_segment_001.mp3
└── climate-change-solutions_2025-07-07_segment_002.mp3
```

## 📋 Script Format

Generated JSON scripts follow this structure:

```json
{
  "title": "Is Universal Basic Income Feasible?",
  "generated": "2025-07-07T14:30:00Z",
  "duration": 300,
  "segments": [
    {
      "text": "You know, I've been thinking about this topic...",
      "timestamp": "00:00",
      "duration": 15,
      "emotion": "thoughtful"
    }
  ],
  "metadata": {
    "topic": "Is Universal Basic Income Feasible?",
    "totalSegments": 8,
    "estimatedDuration": 300,
    "format": "monologue",
    "version": "1.0.0"
  }
}
```

## 🛠️ Development

### Project Structure

```
src/
├── cli.js              # Main CLI entry point
├── orchestrator.ts     # Main podcast generation workflow
├── monologue/          # Monologue generation logic
│   └── engine.ts       # Core monologue generation
├── llm/                # Language model services
│   ├── OpenAIService.ts # OpenAI integration
│   └── APIClient.ts    # Base API client with retry logic
├── script/             # Script formatting
│   └── formatter.ts    # JSON formatting with timestamps
├── audio/              # Audio synthesis and processing
│   ├── synthesizer.ts  # OpenAI TTS integration
│   └── dataTransformer.ts # MP3 concatenation and processing
├── types/              # TypeScript type definitions
│   └── index.ts        # Shared types
└── utils/              # Shared utilities
    ├── progress.ts     # Progress indicators
    └── errors.ts       # Error handling
```

### Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Add your API keys:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_key_here
   OPENAI_API_KEY=your_openai_key_here
   ```

### Available Scripts

```bash
npm run dev        # Run in development mode
npm run build      # Build the project
npm run start      # Run the built application
npm test           # Run all tests
npm run test:watch # Run tests in watch mode
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint issues
```

## 🧪 Testing Locally

### Manual Testing

1. **Basic functionality test**:
   ```bash
   npm run dev "Should AI replace human creativity?"
   ```

2. **Duration options test**:
   ```bash
   npm run dev "The future of work" --duration 10
   ```

3. **Custom output directory test**:
   ```bash
   npm run dev "Space exploration ethics" --output ./test-output
   ```

4. **Script file test**:
   ```bash
   npm run dev "" --script ./output/existing-script.json
   ```

5. **Error handling tests**:
   ```bash
   # Too short topic
   npm run dev "AI"
   
   # Invalid duration
   npm run dev "Philosophy of mind" --duration 7
   ```

### Expected Behavior

- ✅ Successful generation should show progress steps (1/5 → 5/5)
- ✅ Files should be created in the specified output directory
- ✅ Script files should contain properly formatted JSON with timestamps
- ✅ Audio files should be concatenated MP3 files with individual segments
- ✅ Error messages should be helpful and descriptive
- ✅ Audio concatenation should eliminate noise between segments

### Validation Checklist

- [ ] Topic validation (5-200 characters)
- [ ] Duration validation (5 or 10 minutes only)
- [ ] Output directory creation
- [ ] File naming convention
- [ ] Progress indicators display
- [ ] Error handling for various edge cases

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly using the testing instructions above
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

#### Code Style
- Use ES6+ JavaScript features
- Follow existing code patterns and structure
- Add comments for complex logic
- Use descriptive variable and function names

#### Testing
- Test all new features manually using the local testing instructions
- Ensure error handling works correctly
- Verify output file formats are correct
- Test edge cases and invalid inputs

#### Commit Messages
- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, etc.)
- Keep the first line under 50 characters
- Add detailed description if needed

### Types of Contributions

- 🐛 **Bug fixes**: Fix issues with existing functionality
- ✨ **New features**: Add new capabilities to the generator
- 📚 **Documentation**: Improve README, code comments, or guides
- 🎨 **Code quality**: Refactoring, optimization, or style improvements
- 🧪 **Testing**: Add or improve test coverage

### Future Enhancement Areas

- Additional voice options and personalities
- Background music and sound effects
- Web interface
- Multi-language support
- Custom voice cloning
- Batch processing capabilities
- Real-time streaming generation
- Enhanced audio post-processing

### Code Review Process

1. All PRs require at least one review
2. Ensure all tests pass
3. Check for code style consistency
4. Verify documentation updates if needed
5. Test the changes locally

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with Node.js and Commander.js
- Inspired by thoughtful, reflective monologue formats
- Designed for educational and creative content generation

## 📞 Support

If you encounter any issues or have questions:

1. Check the [troubleshooting section](#-testing-locally)
2. Review existing issues in the repository
3. Create a new issue with detailed information about the problem
4. Include your Node.js version and operating system

---

**Note**: This implementation uses real API integrations with OpenAI for text generation and audio synthesis, and Anthropic Claude for advanced language processing.
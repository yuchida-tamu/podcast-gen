# DialecticCast 🎙️

AI-Powered Dialectical Podcast Generator

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

DialecticCast is a command-line application that generates natural-sounding podcast episodes featuring two AI agents engaged in dialectical conversations. Users input a topic, and the system produces both an audio file and a transcript of a thoughtful, balanced debate following the thesis-antithesis-synthesis structure.

## 🌟 Features

- **Natural Dialogue Generation**: Two distinct AI agents (Alex & Jordan) engage in thoughtful debates
- **Dialectical Structure**: Follows thesis-antithesis-synthesis conversation flow
- **Multiple Output Formats**: Generates both markdown transcripts and MP3 audio files
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

3. Make the CLI executable:
   ```bash
   chmod +x src/cli.js
   ```

### Basic Usage

Generate a 5-minute podcast (default):
```bash
node src/cli.js "Is universal basic income feasible?"
```

Generate a 10-minute podcast with custom output directory:
```bash
node src/cli.js "Climate change solutions" --duration 10 --output ./my-podcasts
```

### Command Options

```bash
podcast-gen <topic> [options]

Arguments:
  topic                    Topic for the dialectical podcast

Options:
  -d, --duration <minutes> Duration in minutes (5 or 10) (default: "5")
  -o, --output <path>      Output directory (default: "./output")
  -h, --help              Display help for command
```

## 📁 Output Files

The generator creates two files for each podcast:

- **Script**: `topic-slug_YYYY-MM-DD.md` - Markdown transcript with timestamps
- **Audio**: `topic-slug_YYYY-MM-DD.mp3` - MP3 audio file

### Example Output Structure

```
output/
├── is-universal-basic-income-feasible_2025-07-07.md
├── is-universal-basic-income-feasible_2025-07-07.mp3
├── climate-change-solutions_2025-07-07.md
└── climate-change-solutions_2025-07-07.mp3
```

## 📋 Script Format

Generated transcripts follow this format:

```markdown
# Topic Title
Generated: 2025-07-07 14:30

[00:00] Alex: [thoughtful] You know, I've been thinking about this topic...

[00:06] Jordan: [curious] Really? I'm not so sure about that. What makes you think so?

[00:13] Alex: [confident] Fair point, but hear me out...
```

## 🛠️ Development

### Project Structure

```
src/
├── cli.js              # Main CLI entry point
├── dialogue/           # Dialogue generation logic
│   └── engine.js       # Mock dialogue generation
├── script/             # Script formatting
│   └── formatter.js    # Markdown formatting with timestamps
├── audio/              # Audio synthesis
│   └── synthesizer.js  # Mock MP3 generation
└── utils/              # Shared utilities
    ├── progress.js     # Progress indicators
    └── errors.js       # Error handling
```

### Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Add your API keys (for future real API integration):
   ```env
   OPENAI_API_KEY=your_openai_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_key_here
   ```

### Available Scripts

```bash
npm run dev        # Run in development mode
npm run build      # Build the project (placeholder)
npm run start      # Run the application
npm test           # Run tests (placeholder)
npm run lint       # Run linting (placeholder)
```

## 🧪 Testing Locally

### Manual Testing

1. **Basic functionality test**:
   ```bash
   node src/cli.js "Should AI replace human creativity?"
   ```

2. **Duration options test**:
   ```bash
   node src/cli.js "The future of work" --duration 10
   ```

3. **Custom output directory test**:
   ```bash
   node src/cli.js "Space exploration ethics" --output ./test-output
   ```

4. **Error handling tests**:
   ```bash
   # Too short topic
   node src/cli.js "AI"
   
   # Invalid duration
   node src/cli.js "Philosophy of mind" --duration 7
   ```

### Expected Behavior

- ✅ Successful generation should show progress steps (1/4 → 4/4)
- ✅ Files should be created in the specified output directory
- ✅ Script files should contain properly formatted dialogue
- ✅ Audio files should be valid MP3 placeholders
- ✅ Error messages should be helpful and descriptive

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

- Real API integration (OpenAI/Anthropic for dialogue, ElevenLabs for audio)
- Additional agent personalities and voices
- Background music and sound effects
- Web interface
- Multi-language support
- Custom voice cloning
- Batch processing capabilities

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
- Inspired by dialectical philosophy and debate structures
- Designed for educational and creative content generation

## 📞 Support

If you encounter any issues or have questions:

1. Check the [troubleshooting section](#-testing-locally)
2. Review existing issues in the repository
3. Create a new issue with detailed information about the problem
4. Include your Node.js version and operating system

---

**Note**: This is currently a mock implementation. Real API integration for dialogue generation and audio synthesis is planned for future releases.
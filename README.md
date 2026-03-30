# Lexentia

**AI-powered IDE**

Transform your development workflow with AI assistance that understands your codebase, explains complex logic, fixes bugs instantly, and helps you write better code faster.

## Why Lexentia?

- **Privacy-First**: Your code never leaves your machine. Connect to local models or your own endpoints.
- **Instant Help**: Alt+E to explain any line, Alt+F to fix errors immediately.
- **Context Aware**: Understands your entire project, not just isolated code snippets.
- **Smart Optimization**: Automatically adapts to different model sizes for best performance.
- **Natural Chat**: Ask questions in plain English about your codebase.

## Quick Start

1. **Connect Your AI Model**
   - Launch Lexentia
   - Go to Settings
   - Choose Ollama, OpenAI, or custom endpoint
   - Enter your model details

2. **Start Coding**
   - Open your project folder
   - Alt+E: Explain any line of code
   - Alt+F: Fix errors instantly
   - Chat naturally about your code

## Key Features

### For Developers
- **Intelligent Code Analysis**: Understand complex functions and algorithms
- **Bug Detection & Fixes**: Catch and resolve issues before they escalate
- **Code Generation**: Generate boilerplate, tests, and documentation
- **Refactoring Assistance**: Get suggestions for code improvements

### For Teams
- **Shared Context**: AI understands your entire codebase
- **Consistent Code Style**: Maintain standards across your team
- **Knowledge Transfer**: New team members get instant codebase understanding
- **Documentation**: Auto-generate and maintain project docs

---

## For Developers

### Tech Stack

- **Frontend**: React 18 + TypeScript
- **Desktop App**: Electron
- **AI Integration**: Modular adapter system (Ollama, OpenAI, custom)
- **Build**: Vite + TypeScript
- **Styling**: CSS Modules

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-repo/lexentia.git
cd lexentia

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run Electron app
npm run electron
```

### Project Structure

```
src/
├── components/          # React components
│   ├── ide/            # Main IDE components
│   └── ...
├── services/           # Business logic
│   ├── modelService.ts # AI model integration
│   ├── contextOptimizer.ts # Smart prompt optimization
│   └── ...
├── models/             # AI model adapters
└── renderer/           # Electron renderer process
```

### Architecture

Lexentia uses a modular architecture:

- **Model Adapters**: Pluggable system for different AI providers
- **Context Optimizer**: Automatically adapts prompts for model capabilities
- **Streaming Output**: Progressive code display for better UX
- **Privacy Layer**: Ensures data stays where it belongs

### Contributing

We welcome contributions! This is an MVP, so there's plenty of room for improvement.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request


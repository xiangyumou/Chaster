# Contributing to Chaster

Thank you for considering contributing to Chaster! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git
- Basic understanding of Next.js and TypeScript

### Development Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/yourusername/chaster.git
   cd chaster
   npm install
   ```

2. **Initialize Database**
   ```bash
   npm run db:init
   # Save the generated API token for testing
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   # Visit http://localhost:3000
   ```

## 🔧 Development Workflow

### Making Changes

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make Your Changes**
   - Write clean, readable code
   - Follow existing code style and conventions
   - Add comments for complex logic

3. **Test Your Changes**
   ```bash
   # Run unit tests
   npm test
   
   # Run with coverage
   npm run test:coverage
   
   # Run integration tests (requires running server)
   npm run test:integration
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```
   
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` new features
   - `fix:` bug fixes
   - `docs:` documentation changes
   - `test:` adding or updating tests
   - `chore:` maintenance tasks
   - `refactor:` code refactoring

## 🧪 Testing Guidelines

### Required Tests
- **Unit Tests**: For all utility functions and core logic
- **Integration Tests**: For API endpoints
- **Coverage**: Aim for >80% code coverage

### Running Tests
```bash
# Quick test run
npm test

# Watch mode during development
npm run test:watch

# Full test suite with integration tests
npm run test:integration
```

## 📝 Code Style

- **TypeScript**: Use strict typing, avoid `any`
- **Formatting**: Follow existing prettier/eslint configuration
- **Naming**: 
  - camelCase for variables and functions
  - PascalCase for components and classes
  - UPPER_SNAKE_CASE for constants

## 🔍 Pull Request Process

1. **Update Documentation**
   - Update README.md if adding features
   - Add entries to CHANGELOG.md
   - Update API documentation if changing endpoints

2. **Ensure Tests Pass**
   ```bash
   npm test
   npm run lint
   ```

3. **Create Pull Request**
   - Provide clear description of changes
   - Reference related issues
   - Include screenshots for UI changes

4. **Code Review**
   - Address reviewer feedback
   - Keep commits clean and focused

## 🐛 Reporting Bugs

### Before Submitting
- Check existing issues
- Verify the bug on latest version
- Collect relevant information (logs, environment)

### Bug Report Template
```markdown
**Description**: Brief description of the bug

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**: What should happen

**Actual Behavior**: What actually happens

**Environment**:
- OS: [e.g., macOS 14.0]
- Node Version: [e.g., 18.17.0]
- Chaster Version: [e.g., 1.0.0]

**Logs**: Paste relevant error logs
```

## 💡 Feature Requests

We welcome feature suggestions! Please provide:
- **Use Case**: Why is this feature needed?
- **Proposed Solution**: How would it work?
- **Alternatives**: Other approaches considered

## 📚 Documentation

Good documentation is crucial:
- Keep it concise and clear
- Include code examples
- Update when code changes
- Use proper markdown formatting

## ⚖️ Code of Conduct

### Our Standards
- Be respectful and inclusive
- Accept constructive criticism
- Focus on what's best for the community

### Enforcement
Violations may result in temporary or permanent bans.

## 🔒 Security

**Do not** open public issues for security vulnerabilities.
Instead, please email security concerns to: [your-email@example.com]

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Questions?** Feel free to open an issue for discussion!

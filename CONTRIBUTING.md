# Contributing to CircuiTry3D

Thank you for your interest in contributing to CircuiTry3D! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue on GitHub with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs. actual behavior
- Screenshots if applicable
- Your environment (OS, Node version, browser)

### Suggesting Features

We love feature suggestions! Please create an issue with:
- A clear description of the feature
- Why this feature would be useful
- Any implementation ideas you have

### Pull Requests

1. **Fork the repository** and create your branch from the main branch
2. **Install dependencies**: `npm install`
3. **Make your changes**:
   - Write clean, maintainable code
   - Follow the existing code style
   - Add comments for complex logic
4. **Test your changes**:
   - Run `npm run build` to ensure the build succeeds
   - Test the application locally with `npm run dev`
5. **Commit your changes**:
   - Use clear, descriptive commit messages
   - Reference any related issues
6. **Push to your fork** and submit a pull request

## Development Guidelines

### Code Style

- Use TypeScript for all new files
- Follow React functional component patterns with hooks
- Use consistent naming conventions:
  - PascalCase for components (e.g., `CircuitBuilder`)
  - camelCase for functions and variables
  - UPPER_CASE for constants
- Keep components small and focused on a single responsibility

### React Patterns

- Use functional components with React hooks
- Prefer `const` for component declarations
- Use React.StrictMode for development
- Implement proper TypeScript types for props and state
- Use meaningful component and prop names

### File Organization

- Place React components in appropriate directories under `src/`
- Keep static HTML files in the `public/` directory
- Use the existing routing structure in `src/routes/App.tsx`
- New pages should be added to `src/pages/`

### Testing Changes

Before submitting a pull request:
1. Ensure the code builds: `npm run build`
2. Test locally: `npm run dev`
3. Verify all routes work correctly
4. Check for console errors

### iframe Architecture

The current implementation uses iframes to embed legacy HTML pages. When working with this architecture:
- Maintain sandbox attributes for security
- Be mindful of iframe communication patterns
- Consider the isolation between React and legacy code

## Pull Request Process

1. Update the README.md or documentation if needed
2. Ensure your PR description clearly describes the changes
3. Link any related issues
4. Wait for review from maintainers
5. Address any feedback or requested changes
6. Once approved, a maintainer will merge your PR

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other contributors

## Questions?

Feel free to open an issue for any questions about contributing!

## License

By contributing, you agree that your contributions will be licensed under the same ISC License that covers the project.

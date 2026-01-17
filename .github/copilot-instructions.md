# CircuiTry3D - GitHub Copilot Instructions

## Project Overview
CircuiTry3D is a 3D, interactive, electric circuit builder that utilizes Ohm's law and visualizes current flow and behavior in an electric circuit down to the atomic level. The project creates a new way to understand abstract electrical concepts by "illuminating electricity."

## Technology Stack
- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Routing**: React Router DOM
- **Deployment**: Vercel
- **Node Version**: >= 18

## Project Structure
```
/
├── src/
│   ├── main.tsx           # Application entry point
│   ├── routes/
│   │   └── App.tsx        # Main routing configuration
│   └── pages/
│       ├── Home.tsx       # Landing page wrapper
│       ├── Builder.tsx    # Circuit builder wrapper
│       └── ...
├── public/
│   ├── landing.html       # Landing page HTML
│   ├── legacy.html        # Main circuit builder application
│   └── arena.html         # Component testing arena
├── index.html             # Root HTML template
├── vite.config.ts         # Vite configuration
└── package.json           # Dependencies and scripts
```

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

### Building and Testing
- **Install dependencies**: `npm install`
- **Development server**: `npm run dev`
- **Production build**: `npm run build`
- **Preview build**: `npm run preview`

### File Organization
- Place React components in appropriate directories under `src/`
- Keep static HTML files in the `public/` directory
- Use the existing routing structure in `src/routes/App.tsx`
- New pages should be added to `src/pages/`

### Key Considerations
1. **iframe Integration**: The current implementation uses iframes to embed legacy HTML pages (landing.html, legacy.html, arena.html). Be mindful of this architecture when making changes.
2. **Sandbox Attributes**: iframes use specific sandbox attributes (`allow-scripts allow-same-origin allow-popups`) for security. Maintain these when working with iframe components.
3. **Routing**: The app uses React Router with the following routes:
   - `/` - Home/Landing page
   - `/app` - Circuit builder application
   - `/arena` - Component testing arena
4. **Build Output**: Vite builds to the `dist/` directory, which should not be committed to version control.

### When Making Changes
- Always test builds with `npm run build` before committing
- Ensure TypeScript types are properly defined
- Maintain consistent code style with existing files
- Consider the iframe architecture when adding new features
- Update this document if you make significant architectural changes

### Deployment
- The project is deployed on Vercel
- Configuration is in `vercel.json`
- Build command: `npm run build`
- Publish directory: `dist`

## Common Tasks

### Adding a New Page
1. Create a new component in `src/pages/`
2. Add the route in `src/routes/App.tsx`
3. If needed, create corresponding HTML in `public/`

### Modifying the Circuit Builder
- The main circuit builder logic is in `public/legacy.html`
- React wrapper is in `src/pages/Builder.tsx`
- Consider iframe communication patterns for React-to-legacy integration

### Styling
- Current styling is inline or within HTML files
- When adding new styling, consider consistency with existing UI
- Dark theme is used (`#0f172a` background, `#fff` text)

## Best Practices
- Write clean, maintainable code
- Use descriptive commit messages
- Test all changes in development mode before building
- Maintain backward compatibility with existing iframe-based architecture
- Document complex logic with comments
- Keep dependencies up to date but test thoroughly after updates

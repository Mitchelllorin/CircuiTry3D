# CircuiTry3D

3D, Interactive, Electric Circuit Builder that utilizes Ohm's law and visualizes current flow and behavior in an electric circuit down to the atomic level - creating a new way to understand abstract concepts by "Illuminating Electricity"

## Overview

CircuiTry3D is an innovative educational tool that brings electrical circuits to life through 3D visualization and interactive simulation. Experience electricity at the atomic level and gain a deeper understanding of circuit behavior.

## Features

- 🔌 **Interactive 3D Circuit Building**: Design and build circuits in an immersive 3D environment
- ⚡ **Real-time Physics Simulation**: Watch current flow visualized at the atomic level
- 📐 **Ohm's Law Integration**: See electrical principles in action
- 🎓 **Educational Focus**: Make abstract electrical concepts tangible and understandable

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Routing**: React Router DOM
- **Deployment**: Netlify
- **Node Version**: ≥ 18

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Mitchelllorin/CircuiTry3D.git
cd CircuiTry3D
```

2. Install dependencies:
```bash
npm install
```

### Development

Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

Create a production build:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

## Project Structure

```
/
├── src/
│   ├── main.tsx           # Application entry point
│   ├── routes/
│   │   └── App.tsx        # Main routing configuration
│   └── pages/
│       ├── Home.tsx       # Landing page wrapper
│       └── Builder.tsx    # Circuit builder wrapper
├── public/
│   ├── landing.html       # Landing page HTML
│   ├── legacy.html        # Main circuit builder application
│   └── arena.html         # Component testing arena
├── index.html             # Root HTML template
├── vite.config.ts         # Vite configuration
└── package.json           # Dependencies and scripts
```

## Routes

- `/` - Home/Landing page
- `/app` - Circuit builder application
- `/arena` - Component testing arena

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

ISC

## Contact

For issues and questions, please use the [GitHub Issues](https://github.com/Mitchelllorin/CircuiTry3D/issues) page.

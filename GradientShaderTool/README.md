# Gradient Shader Tool

A GLSL gradient shader generator built with Preact and Three.js. This tool allows you to create and customize beautiful gradient shaders with noise-based normal mapping and various visual effects.

## Features

- Interactive 3D gradient shader with real-time parameter adjustments
- Normal map noise for creating dynamic surface effects
- Multiple gradient modes (B-spline, Linear, Step, Smooth step, Direct mapping)
- Customizable colors, lighting, and animation settings
- Preset configurations for quick starting points
- Export functionality for saving images and shader code

## Project Structure

```
GradientShaderTool/
├── src/
│   ├── components/    # Preact UI components
│   │   ├── ControlPanel/    # UI controls using Preact
│   │   └── ShaderCanvas/    # Three.js canvas wrapper
│   ├── lib/           # Core functionality
│   │   ├── modules/        # Core modules
│   │   │   ├── SceneManager.ts
│   │   │   ├── PresetManager.ts
│   │   │   ├── ShaderLoader.ts
│   │   │   ├── ExportManager.ts
│   │   │   └── Utils.ts
│   │   ├── shaders/        # GLSL shader files
│   │   └── ShaderApp.ts    # Main app class
│   ├── types/         # TypeScript type definitions
│   ├── styles/        # CSS styles
│   ├── app.tsx        # Main Preact app container
│   └── main.tsx       # Entry point
├── public/            # Static files
├── index.html         # Main HTML
└── package.json       # Dependencies and scripts
```

## Technology Stack

- **Preact**: Lightweight alternative to React for building the UI
- **Three.js**: 3D rendering library for WebGL
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and development server

## Development

### Prerequisites

- Node.js (v14+)
- Bun or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/gradient-shader-tool.git
cd gradient-shader-tool

# Install dependencies
bun install
# or
npm install
```

### Running the Development Server

```bash
# Start the development server
bun dev
# or
npm run dev
```

### Building for Production

```bash
# Build for production
bun build
# or
npm run build
```

## Usage

1. Open the application in your browser
2. Use the control panel on the right to adjust parameters
3. Try different presets to see various effects
4. Export your creation as an image or code

## License

MIT

## Acknowledgments

This project is a Preact rewrite of the original vanilla JS implementation, maintaining the same functionality while improving the codebase structure and maintainability.

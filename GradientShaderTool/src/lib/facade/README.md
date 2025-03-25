# ShaderAppFacade

The `ShaderAppFacade` is a comprehensive adapter layer that provides a clean, type-safe interface between UI components and the core `ShaderApp` implementation. This facade simplifies interactions with the shader engine, standardizes event handling, and improves testability.

## Core Features

- **Type-safe API**: All methods and events use TypeScript interfaces for improved development experience
- **Robust event system**: Subscribe to specific events with properly typed payloads
- **Parameter validation**: Validate parameter changes before applying them
- **Comprehensive configuration**: Fine-tune facade behavior with detailed configuration options
- **Improved testability**: Mock implementation for testing components in isolation
- **React/Preact integration**: Context provider and hooks for easy consumption in components

## Installation

The facade is integrated into the Gradient Shader Tool codebase and can be accessed through imports from the `lib/facade` directory.

## Basic Usage

### Initializing the Facade

```tsx
import { FacadeProvider } from "./lib/facade/FacadeContext";

function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="app">
      <div ref={containerRef} className="shader-container" />

      <FacadeProvider
        containerRef={containerRef}
        config={{
          performance: { throttleEvents: true },
          debug: { enableLogging: true },
        }}
      >
        {/* Your UI components here */}
      </FacadeProvider>
    </div>
  );
}
```

### Using the Facade in Components

```tsx
import { useFacade } from "./lib/facade/FacadeContext";
import { useParameter } from "./lib/hooks/useParameter";

function ColorControl() {
  const facade = useFacade();
  const { value, setValue } = useParameter("color1");

  const handleColorChange = (e) => {
    setValue(e.target.value);
  };

  return (
    <div>
      <input type="color" value={value} onChange={handleColorChange} />
      <button onClick={() => facade.render()}>Refresh Render</button>
    </div>
  );
}
```

### Working with Multiple Parameters

```tsx
import { useParameterGroup } from "./lib/hooks/useParameter";

function GradientControls() {
  const { values, setValue } = useParameterGroup([
    "color1",
    "color2",
    "numStops",
  ]);

  return (
    <div>
      <input
        type="color"
        value={values.color1}
        onChange={(e) => setValue("color1", e.target.value)}
      />
      <input
        type="color"
        value={values.color2}
        onChange={(e) => setValue("color2", e.target.value)}
      />
      <input
        type="range"
        min="2"
        max="10"
        value={values.numStops}
        onChange={(e) => setValue("numStops", parseInt(e.target.value))}
      />
    </div>
  );
}
```

### Subscribing to Events

```tsx
import { useEffect } from "preact/hooks";
import { useFacade } from "./lib/facade/FacadeContext";

function RenderMonitor() {
  const facade = useFacade();
  const [lastRenderTime, setLastRenderTime] = useState(0);

  useEffect(() => {
    // Subscribe to render events
    const handleRender = (data) => {
      setLastRenderTime(Date.now());
    };

    facade.on("render:complete", handleRender);

    // Clean up
    return () => {
      facade.off("render:complete", handleRender);
    };
  }, [facade]);

  return (
    <div>
      <p>
        Last render:{" "}
        {lastRenderTime
          ? new Date(lastRenderTime).toLocaleTimeString()
          : "Never"}
      </p>
    </div>
  );
}
```

## Advanced Features

### Working with Presets

```tsx
function PresetManager() {
  const facade = useFacade();
  const [presets, setPresets] = useState([]);

  useEffect(() => {
    // Get initial presets
    setPresets(facade.getPresets());

    // Listen for changes
    const handlePresetAdded = (data) => {
      setPresets(facade.getPresets());
    };

    facade.on("preset:added", handlePresetAdded);
    facade.on("preset:removed", handlePresetAdded);

    return () => {
      facade.off("preset:added", handlePresetAdded);
      facade.off("preset:removed", handlePresetAdded);
    };
  }, [facade]);

  const handleAddPreset = () => {
    const name = prompt("Enter preset name:");
    if (name) {
      facade.addPreset(name);
    }
  };

  return (
    <div>
      <button onClick={handleAddPreset}>Add Current as Preset</button>
      <ul>
        {presets.map((preset) => (
          <li key={preset.name}>
            <button onClick={() => facade.applyPreset(preset.name)}>
              {preset.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Exporting and Saving

```tsx
function ExportControls() {
  const facade = useFacade();

  const handleSaveImage = () => {
    facade.saveAsImage();
  };

  const handleExportCode = () => {
    facade.exportCode();
  };

  return (
    <div>
      <button onClick={handleSaveImage}>Save as Image</button>
      <button onClick={handleExportCode}>Export Shader Code</button>
    </div>
  );
}
```

## Testing

The facade includes comprehensive testing utilities to make component testing easier:

```tsx
import { render, screen, fireEvent } from "@testing-library/preact";
import {
  TestFacadeProvider,
  createTestFacade,
  waitForEvent,
} from "./lib/facade/testing";
import { ColorControl } from "./components/ColorControl";

describe("ColorControl", () => {
  it("should update color when changed", async () => {
    // Create test facade with event recording
    const { facade, recorders, cleanup } = createTestFacade({
      initialParams: { color1: "#ff0000" },
      recordEvents: ["parameter:update"],
    });

    // Render component with test provider
    render(
      <TestFacadeProvider initialParams={{ color1: "#ff0000" }}>
        <ColorControl />
      </TestFacadeProvider>
    );

    // Find the color input
    const colorInput = screen.getByRole("input");

    // Change the color
    fireEvent.change(colorInput, { target: { value: "#0000ff" } });

    // Wait for parameter update event
    await waitForEvent(recorders["parameter:update"], (event) => {
      return event.parameter === "color1" && event.value === "#0000ff";
    });

    // Check that the parameter was updated
    expect(facade.getParameter("color1")).toBe("#0000ff");

    // Clean up
    cleanup();
  });
});
```

### Testing with Event Debugging

For more complex testing scenarios, you can use the event debugging components:

```tsx
import { render, screen } from "@testing-library/preact";
import {
  TestFacadeProvider,
  ParameterDebugPanel,
  EventDebugPanel,
} from "./lib/facade/testing";

// Render with debug panels
render(
  <TestFacadeProvider initialParams={{ color1: "#ff0000" }}>
    <div style={{ display: "flex" }}>
      <div style={{ flex: 1 }}>
        <YourComponent />
      </div>
      <div style={{ flex: 1 }}>
        <ParameterDebugPanel />
        <EventDebugPanel />
      </div>
    </div>
  </TestFacadeProvider>
);
```

## API Reference

### Core Methods

| Method                      | Description                              | Parameters                   | Return Value  |
| --------------------------- | ---------------------------------------- | ---------------------------- | ------------- |
| `initialize()`              | Initialize the facade with the ShaderApp | None                         | Promise<void> |
| `dispose()`                 | Clean up resources                       | None                         | void          |
| `getParameter(name)`        | Get a parameter value                    | name: string                 | any           |
| `setParameter(name, value)` | Set a parameter value                    | name: string, value: any     | boolean       |
| `updateParameters(updates)` | Batch update multiple parameters         | updates: Record<string, any> | boolean       |
| `resetParameters()`         | Reset all parameters to defaults         | None                         | void          |
| `render()`                  | Force a render update                    | None                         | void          |

### Camera Control

| Method                | Description                      | Parameters               | Return Value   |
| --------------------- | -------------------------------- | ------------------------ | -------------- |
| `resetCamera()`       | Reset camera to default position | None                     | void           |
| `setCamera(position)` | Set camera position              | position: CameraPosition | void           |
| `getCameraPosition()` | Get current camera position      | None                     | CameraPosition |

### Presets

| Method               | Description                      | Parameters   | Return Value |
| -------------------- | -------------------------------- | ------------ | ------------ |
| `getPresets()`       | Get all available presets        | None         | Preset[]     |
| `applyPreset(name)`  | Apply a preset                   | name: string | boolean      |
| `addPreset(name)`    | Add current settings as a preset | name: string | boolean      |
| `removePreset(name)` | Remove a preset                  | name: string | boolean      |

### Export and Save

| Method                  | Description                | Parameters                  | Return Value    |
| ----------------------- | -------------------------- | --------------------------- | --------------- |
| `saveAsImage(options?)` | Save current view as image | options?: SaveImageOptions  | Promise<string> |
| `exportCode(options?)`  | Export shader code         | options?: ExportCodeOptions | Promise<string> |

### Event System

| Method                  | Description                | Parameters                           | Return Value |
| ----------------------- | -------------------------- | ------------------------------------ | ------------ |
| `on(event, callback)`   | Subscribe to an event      | event: EventType, callback: Function | void         |
| `off(event, callback)`  | Unsubscribe from an event  | event: EventType, callback: Function | void         |
| `once(event, callback)` | Subscribe to an event once | event: EventType, callback: Function | void         |
| `emit(event, data)`     | Emit an event              | event: EventType, data: any          | void         |

## Events

The facade emits various events that components can subscribe to:

### Parameter Events

| Event                     | Description                      | Payload                                               |
| ------------------------- | -------------------------------- | ----------------------------------------------------- |
| `parameter:update`        | Parameter value changed          | { parameter: string, value: any, previousValue: any } |
| `parameters:reset`        | All parameters reset to defaults | None                                                  |
| `parameters:batch:update` | Multiple parameters updated      | { updates: Record<string, any> }                      |

### Render Events

| Event             | Description              | Payload              |
| ----------------- | ------------------------ | -------------------- |
| `render:start`    | Render process started   | None                 |
| `render:complete` | Render process completed | { duration: number } |
| `render:error`    | Error during rendering   | { error: Error }     |

### Geometry Events

| Event                      | Description                  | Payload              |
| -------------------------- | ---------------------------- | -------------------- |
| `geometry:update:start`    | Geometry update started      | None                 |
| `geometry:update:complete` | Geometry update completed    | { duration: number } |
| `geometry:update:error`    | Error during geometry update | { error: Error }     |

### Camera Events

| Event           | Description             | Payload                      |
| --------------- | ----------------------- | ---------------------------- |
| `camera:update` | Camera position changed | { position: CameraPosition } |
| `camera:reset`  | Camera reset to default | None                         |

### Export Events

| Event             | Description              | Payload         |
| ----------------- | ------------------------ | --------------- | ------------------------ |
| `export:start`    | Export process started   | { type: 'image' | 'code' }                 |
| `export:complete` | Export process completed | { type: 'image' | 'code', result: string } |
| `export:error`    | Error during export      | { type: 'image' | 'code', error: Error }   |

### Preset Events

| Event            | Description      | Payload          |
| ---------------- | ---------------- | ---------------- |
| `preset:applied` | Preset applied   | { name: string } |
| `preset:added`   | New preset added | { name: string } |
| `preset:removed` | Preset removed   | { name: string } |

## Configuration Options

The facade accepts a configuration object with the following options:

```typescript
interface FacadeConfig {
  performance?: {
    enableAdaptiveResolution?: boolean; // Enable automatic resolution reduction
    throttleEvents?: boolean; // Throttle event emission
    throttleDelay?: number; // Delay for throttled events (ms)
    batchParameterUpdates?: boolean; // Batch parameter updates
    batchDelay?: number; // Delay for batched updates (ms)
  };
  debug?: {
    enableLogging?: boolean; // Enable detailed logging
    logLevel?: "error" | "warn" | "info" | "debug"; // Logging level
    logEvents?: boolean; // Log all events
    validateParameters?: boolean; // Validate parameters before updates
  };
  export?: {
    defaultImageType?: "png" | "jpg"; // Default image export format
    defaultImageQuality?: number; // Default image quality (0-1)
    includeSettings?: boolean; // Include settings in exports
    defaultTransparentBackground?: boolean; // Use transparent background by default
  };
  rendering?: {
    autoRender?: boolean; // Automatically render after parameter changes
    updateCameraWithParams?: boolean; // Update camera when parameters change
  };
}
```

Example configuration:

```typescript
const config: FacadeConfig = {
  performance: {
    enableAdaptiveResolution: false,
    throttleEvents: true,
    throttleDelay: 100,
    batchParameterUpdates: true,
    batchDelay: 50,
  },
  debug: {
    enableLogging: true,
    logLevel: "info",
    logEvents: true,
    validateParameters: true,
  },
  export: {
    defaultImageType: "png",
    defaultImageQuality: 0.9,
    includeSettings: true,
    defaultTransparentBackground: false,
  },
  rendering: {
    autoRender: true,
    updateCameraWithParams: false,
  },
};
```

## Using the facadeSignal

For components that need access to the facade but don't want to re-render when it changes, you can use the facadeSignal directly:

```tsx
import { useComputed } from "@preact/signals";
import { facadeSignal } from "./lib/facade/FacadeContext";

function StaticComponent() {
  // Get the facade from the signal
  const facade = useComputed(() => facadeSignal.value);

  // Use facade methods without causing re-renders...
  // ...
}
```

## Error Handling

The facade includes comprehensive error handling for all operations:

```tsx
function ErrorHandlingExample() {
  const facade = useFacade();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleError = (data) => {
      setErrorMessage(`Error: ${data.error.message}`);
    };

    facade.on("error", handleError);
    facade.on("render:error", handleError);
    facade.on("geometry:update:error", handleError);
    facade.on("export:error", handleError);

    return () => {
      facade.off("error", handleError);
      facade.off("render:error", handleError);
      facade.off("geometry:update:error", handleError);
      facade.off("export:error", handleError);
    };
  }, [facade]);

  return (
    <div>
      {errorMessage && <div className="error-message">{errorMessage}</div>}
      {/* Component content */}
    </div>
  );
}
```

## Future Development

The facade is designed to be extended with new functionality as needed. Some planned features include:

- Support for animation control with frame-by-frame rendering
- Better handling of async operations with loading states
- Improved performance monitoring and optimization
- Enhanced type safety for parameter validations

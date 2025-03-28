# ScrubInput Component Documentation

## Overview

The ScrubInput component is a custom numeric input control that provides a Scrub-like scrubbing/dragging interaction for adjusting values. It offers both direct text input and an intuitive drag interface for value adjustment, with visual feedback through a progress bar.

## Key Features

- **Intuitive drag interaction** for numeric value adjustment
- **Pointer lock functionality** enabling continuous dragging beyond screen boundaries with cursor wrapping
- **Edge detection** that wraps the cursor when it reaches screen edges
- **Visual feedback** with a progress bar showing the current value position
- **Keyboard input support** for precise value entry
- **Shift key modifier** for fine-tuning adjustments
- **Customizable styling** and configuration options

## Architecture

The ScrubInput is built with a modular architecture using custom hooks and context for state management:

1. **Core Component (`ScrubInput.tsx`)**: The main UI component that combines all functionality
2. **Drag Logic (`useScrubDrag.ts`)**: Custom hook for handling all dragging interactions
3. **Input Handling (`useInputHandler.ts`)**: Custom hook for managing text input interactions
4. **Pointer Lock Utilities (`pointerLockUtils.ts`)**: Utilities for pointer lock API and cursor visualization
5. **Context Provider (`ScrubInputContext.tsx`)**: Shared context for state management across components
6. **Styling (`ScrubInput.module.css`)**: Modular CSS for component styling

## useState + refs vs. useReducer

The ScrubInput component was originally implemented using `useReducer` for state management, but was refactored to use `useState` hooks with refs for better performance and reliability. Here's why this approach was chosen:

### Problems with useReducer Implementation

1. **Stale Value Issue**: The previous `useReducer` implementation suffered from "stale closure" problems where drag event handlers captured outdated state values, causing values to unexpectedly snap during drag operations.

2. **Complexity**: The reducer pattern added unnecessary complexity for this use case, making the code harder to maintain and debug.

3. **Performance**: Every state update triggered a re-render of the entire component, potentially causing performance bottlenecks during rapid drag operations.

### Benefits of useState + refs Implementation

1. **Direct Access to Current Values**: Using refs to store current values (`currentValueRef`, `startValueRef`) ensures handlers always access the latest values, eliminating snapping issues.

2. **Clearer State Management**: Individual `useState` hooks make the state management more explicit and easier to understand.

3. **Better Performance**: By storing frequently accessed values in refs, we minimize unnecessary re-renders while maintaining reactivity where needed.

4. **Improved Edge Handling**: The refactored implementation properly handles screen edge detection with cursor wrapping, creating a seamless infinite slider experience.

## Usage Example

```jsx
import { ScrubInput } from "./components/ScrubInput";

function MyComponent() {
  const [value, setValue] = useState(50);

  return (
    <ScrubInput
      label="Opacity"
      value={value}
      min={0}
      max={100}
      step={1}
      decimals={0}
      onChange={setValue}
    />
  );
}
```

## Props

| Prop             | Type                  | Default      | Description                                  |
| ---------------- | --------------------- | ------------ | -------------------------------------------- |
| `label`          | string \| JSX.Element | undefined    | Label text or element to display             |
| `value`          | number                | required     | Current numeric value                        |
| `min`            | number                | required     | Minimum allowed value                        |
| `max`            | number                | required     | Maximum allowed value                        |
| `step`           | number                | required     | Step increment for value changes             |
| `decimals`       | number                | 1            | Number of decimal places to show             |
| `onChange`       | function              | required     | Callback when value changes                  |
| `disabled`       | boolean               | false        | Disables the input when true                 |
| `className`      | string                | ''           | Additional CSS class                         |
| `usePointerLock` | boolean               | true         | Enables pointer lock for continuous dragging |
| `dragIcon`       | string \| JSX.Element | default icon | Custom drag handle icon                      |

## Context Provider

For optimal functionality, wrap your application with the `ScrubInputProvider`:

```jsx
import { ScrubInputProvider } from "./components/ScrubInput";

function App() {
  return <ScrubInputProvider>{/* Your app components */}</ScrubInputProvider>;
}
```

## Implementation Details

### Drag Handling

The drag functionality uses the Pointer Lock API (when supported) to capture mouse movements beyond the browser window boundaries. Key features include:

- **Stable Value Calculation**: Implements a pixel-to-value mapping that prevents jumps during drag operations
- **Shift Key Modifier**: Holding shift while dragging enables fine-tuning with smaller increments
- **Edge Detection**: When the cursor reaches the edge of the screen, it wraps to the opposite side
- **Virtual Cursor**: A custom cursor visualization provides feedback during pointer lock

### Input Handling

The component supports direct text input with validation:

- **Validation**: Ensures values stay within min/max boundaries
- **Step Conformance**: Rounds values to the nearest step
- **Keyboard Navigation**: Supports Enter to confirm and Escape to cancel changes

### Styling

The component uses CSS modules for encapsulated styling with customization options through CSS variables, allowing seamless integration with different design systems.

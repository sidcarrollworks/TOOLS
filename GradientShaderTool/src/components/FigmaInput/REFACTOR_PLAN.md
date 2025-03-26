# FigmaInput Component Refactoring Plan

## Current Architecture Analysis

The FigmaInput component implements a Figma-style numeric input with drag functionality. The current implementation consists of:

1. **FigmaInput.tsx**: Main component file handling rendering and UI state
2. **useFigmaDrag.ts**: Complex hook implementing dragging functionality
3. **useInputHandler.ts**: Hook managing text input functionality
4. **pointerLockUtils.ts**: Utilities for pointer lock API and cursor management
5. **instanceManager.ts**: Global instance tracking for active drag operations
6. **FigmaInput.module.css**: Styles for the component

The component relies heavily on the browser's Pointer Lock API for drag operations, with a custom virtual cursor implementation to provide visual feedback during dragging.

## Issues and Optimization Opportunities

### 1. State Management Complexity

**Issues:**

- The component relies on complex state management spread across multiple hooks
- Global variables (`isPresetBeingApplied`) for shared state
- Multiple `useState` calls for related state in `useFigmaDrag`
- Unclear ownership of state between files

**Recommendations:**

- Consolidate related state using `useReducer` for complex state transitions
- Replace global variables with React Context
- Create clearer state boundaries between UI and drag behavior

### 2. Pointer Lock Implementation Complexity

**Issues:**

- Overly complex pointer lock implementation with many helper functions
- Excessive DOM manipulations for cursor styling
- Scattered event listeners and cleanup logic
- Multiple layers of abstraction (overlays, virtual cursor, etc.)

**Recommendations:**

- Create a single, reusable `usePointerLock` hook
- Reduce DOM manipulations for cursor styling
- Use CSS variables for cursor styling
- Simplify the virtual cursor implementation

### 3. Memory Leaks & Cleanup

**Issues:**

- Complex cleanup function in `useFigmaDrag`
- Risk of missed cleanups with multiple overlapping event listeners
- Timeout and RAF callbacks that may not be properly canceled

**Recommendations:**

- Use AbortController for managing event listeners
- Ensure consistent cleanup in all useEffect hooks
- Simplify the event listener architecture

### 4. Performance Bottlenecks

**Issues:**

- Frequent DOM manipulation and style changes during drag
- Re-renders potentially occurring during drag operation
- Complex calculations for value mapping during drag

**Recommendations:**

- Use CSS transforms instead of direct style manipulation
- Implement consistent use of requestAnimationFrame
- Memoize component and callbacks
- Reduce render triggers during drag operation

### 5. Code Organization

**Issues:**

- Logic spread across many files with complex interdependencies
- Unclear responsibility boundaries between hooks
- Repeated utility functions and helper methods

**Recommendations:**

- Refactor into a more cohesive component structure
- Consider a simpler file structure
- Clearly separate view logic from behavior logic

## Specific Implementation Improvements

### 1. Replace Multiple State Variables with useReducer

```typescript
// Current approach in useFigmaDrag
const [isDragging, setIsDragging] = useState<boolean>(false);
const [startX, setStartX] = useState<number>(0);
const [startValue, setStartValue] = useState<number>(value);
const [currentValue, setCurrentValue] = useState<number>(value);
const [dragDirection, setDragDirection] = useState<"none" | "left" | "right">(
  "none"
);
const [virtualCursorPos, setVirtualCursorPos] = useState<{
  x: number;
  y: number;
} | null>(null);

// Recommended approach
type DragState = {
  isDragging: boolean;
  startX: number;
  startValue: number;
  currentValue: number;
  dragDirection: "none" | "left" | "right";
  virtualCursorPos: { x: number; y: number } | null;
};

type DragAction =
  | { type: "START_DRAG"; x: number; value: number }
  | { type: "MOVE"; movementX: number; movementY: number; shiftKey: boolean }
  | { type: "END_DRAG" }
  | { type: "UPDATE_CURSOR"; x: number; y: number };

const dragReducer = (state: DragState, action: DragAction): DragState => {
  switch (action.type) {
    case "START_DRAG":
      return {
        ...state,
        isDragging: true,
        startX: action.x,
        startValue: action.value,
        currentValue: action.value,
        dragDirection: "none",
      };
    // Other cases...
  }
};

const [dragState, dispatch] = useReducer(dragReducer, initialDragState);
```

### 2. Replace Global Variables with React Context

```typescript
// Create a FigmaInputContext.tsx file
import { createContext, useContext, useState, FC } from "preact/compat";

interface FigmaInputContextType {
  isPresetBeingApplied: boolean;
  setPresetApplying: (applying: boolean) => void;
  activeInstance: symbol | null;
  setActiveInstance: (instance: symbol | null) => void;
}

const FigmaInputContext = createContext<FigmaInputContextType>({
  isPresetBeingApplied: false,
  setPresetApplying: () => {},
  activeInstance: null,
  setActiveInstance: () => {},
});

export const FigmaInputProvider: FC = ({ children }) => {
  const [isPresetBeingApplied, setPresetApplying] = useState(false);
  const [activeInstance, setActiveInstance] = useState<symbol | null>(null);

  return (
    <FigmaInputContext.Provider
      value={{
        isPresetBeingApplied,
        setPresetApplying,
        activeInstance,
        setActiveInstance,
      }}
    >
      {children}
    </FigmaInputContext.Provider>
  );
};

export const useFigmaInputContext = () => useContext(FigmaInputContext);
```

### 3. Create a Unified usePointerLock Hook

```typescript
// Create a usePointerLock.ts hook
import { useEffect, useRef, useState } from "preact/hooks";

interface UsePointerLockOptions {
  enabled: boolean;
  onMove?: (movementX: number, movementY: number, e: MouseEvent) => void;
  onExit?: () => void;
}

export function usePointerLock(
  element: React.RefObject<HTMLElement>,
  options: UsePointerLockOptions
) {
  const { enabled, onMove, onExit } = options;
  const [isLocked, setIsLocked] = useState(false);

  // Implementation with proper cleanup using AbortController

  return {
    isLocked,
    requestLock: () => {
      /* ... */
    },
    exitLock: () => {
      /* ... */
    },
  };
}
```

### 4. Optimize Style Handling in FigmaInput Component

```tsx
// Move transition styling to CSS instead of inline styles
// FigmaInput.module.css
.progressBar {
  /* existing styles */
}

.withTransition {
  transition: width 0.2s ease, transform 0.2s ease;
}

// FigmaInput.tsx
<div
  ref={progressBarRef}
  className={`${styles.progressBar} ${isDragging ? styles.dragging : ""} ${hasTransition ? styles.withTransition : ""}`}
  style={{
    width: progressWidth,
    transform: progressTransform,
  }}
/>
```

### 5. Memoize the Component and Callbacks

```tsx
import { memo, useCallback } from "preact/compat";

export const FigmaInput = memo<FigmaInputProps>(
  ({
    label,
    value,
    min,
    max,
    step,
    decimals = 1,
    onChange,
    disabled = false,
    className = "",
    usePointerLock = true,
    dragIcon,
  }) => {
    // Memoize callbacks
    const handleChange = useCallback(
      (newValue: number) => {
        onChange(newValue);
      },
      [onChange]
    );

    // Component implementation
  }
);
```

## Implementation Plan

### Phase 1: State Management Refactoring

1. Create FigmaInputContext to replace global variables
2. Refactor useFigmaDrag to use useReducer for state management
3. Update FigmaInput component to use the new context

### Phase 2: Pointer Lock Simplification

1. Create unified usePointerLock hook
2. Simplify virtual cursor implementation
3. Consolidate event listeners and use AbortController

### Phase 3: Performance Optimization

1. Move inline styles to CSS classes
2. Implement memoization for component and callbacks
3. Optimize renders during drag operations

### Phase 4: Code Organization

1. Simplify file structure
2. Remove duplicate utility functions
3. Document the new architecture

## Expected Benefits

1. **Improved Performance:**

   - Fewer DOM manipulations
   - Reduced renders during drag operations
   - More efficient event handling

2. **Better Maintainability:**

   - Clearer state management
   - Simplified pointer lock handling
   - Better separation of concerns

3. **Reduced Bundle Size:**

   - Elimination of duplicate code
   - More efficient implementations
   - Potential for code splitting

4. **Enhanced Reliability:**
   - Proper cleanup of resources
   - Fewer potential memory leaks
   - More predictable behavior

## Testing Strategy

1. Create unit tests for each refactored component
2. Test edge cases for drag behavior:
   - Fast movements
   - Keyboard modifiers (shift key)
   - Boundary conditions (min/max values)
3. Ensure compatibility across browsers:
   - Chrome, Firefox, Safari
   - Test on mobile devices with touch events
4. Performance testing:
   - Monitor render counts during drag
   - Measure frame rate during continuous drag operations

## References

- [React useReducer Documentation](https://react.dev/reference/react/useReducer)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [AbortController Documentation](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Pointer Lock API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API)

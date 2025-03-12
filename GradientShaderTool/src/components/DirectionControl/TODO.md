# TODO: Implement App-wide Tooltip Animation System

## Overview

Create a system for displaying animated previews in tooltips throughout the application, showing the effect of parameter changes in real-time.

## Features to Implement

1. **Animation Preview Component**

   - Create a reusable canvas-based animation component
   - Support for different parameter types (direction, scale, speed, etc.)
   - Efficient rendering with requestAnimationFrame

2. **Context-aware Animations**

   - Direction control: Show flowing particles in the specified direction
   - Scale control: Show expanding/contracting elements
   - Speed control: Show varying animation rates
   - Color control: Show color transitions

3. **Integration with Existing Components**

   - Add tooltip container to all control components
   - Standardize tooltip API and behavior
   - Ensure consistent positioning and styling

4. **Performance Considerations**
   - Lazy initialization of animations (only when tooltip is visible)
   - Throttle animation updates for complex previews
   - Pause animations when not visible

## Implementation Plan

1. Create a base `TooltipPreview` component
2. Implement specific preview types (DirectionPreview, ScalePreview, etc.)
3. Add tooltip container to existing control components
4. Create a context provider for sharing animation state

## Example Implementation for Direction Preview

```tsx
// TooltipPreview.tsx
import { FunctionalComponent } from "preact";
import { useRef, useEffect } from "preact/hooks";

interface TooltipPreviewProps {
  type: "direction" | "scale" | "speed" | "color";
  params: Record<string, number | string>;
}

export const TooltipPreview: FunctionalComponent<TooltipPreviewProps> = ({
  type,
  params,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrame: number;
    let time = 0;

    const animate = () => {
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      switch (type) {
        case "direction":
          drawDirectionPreview(ctx, params, time, canvas.width, canvas.height);
          break;
        // Add other preview types
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationFrame);
  }, [type, params]);

  return <canvas ref={canvasRef} width={200} height={100} />;
};
```

## Design Considerations

- Match the retro-futuristic aesthetic of the application
- Keep animations simple but informative
- Ensure accessibility (animations should not be the only way to understand parameter effects)
- Consider adding text descriptions alongside animations

## Timeline

- Phase 1: Basic animation framework and direction preview
- Phase 2: Add previews for other parameter types
- Phase 3: Optimize performance and refine visuals
- Phase 4: Add advanced features (interactive previews, etc.)

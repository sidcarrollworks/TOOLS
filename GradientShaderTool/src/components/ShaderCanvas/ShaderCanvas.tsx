import { useEffect, useRef } from "preact/hooks";
import type { FunctionComponent } from "preact";
import { forwardRef } from "preact/compat";
import styles from "./ShaderCanvas.module.css";
import { OrbitControlsSync } from "./OrbitControlsSync";

interface ShaderCanvasProps {
  canvasId?: string;
}

export const ShaderCanvas = forwardRef<HTMLDivElement, ShaderCanvasProps>(
  ({ canvasId = "shader-canvas" }, forwardedRef) => {
    // Create a local ref that we'll use for the component
    const internalRef = useRef<HTMLDivElement>(null);

    // Sync the forwarded ref with our internal ref
    useEffect(() => {
      if (!forwardedRef) return;

      // Handle callback refs
      if (typeof forwardedRef === "function") {
        forwardedRef(internalRef.current);
      }
      // Handle object refs
      else {
        forwardedRef.current = internalRef.current;
      }
    }, [forwardedRef]);

    useEffect(() => {
      // The ShaderApp instance will be initialized in the parent component
      // and will use this container as its parent
      const containerElement = internalRef.current;
      if (!containerElement) return;

      // Make sure the container takes up the full available space
      const resizeObserver = new ResizeObserver(() => {
        if (containerElement) {
          // Force a reflow to ensure the container size is updated
          containerElement.style.width = "100%";
          containerElement.style.height = "100%";

          // Find any canvas elements that might have been added by Three.js
          const canvasElements = containerElement.querySelectorAll("canvas");
          canvasElements.forEach((canvas: HTMLCanvasElement) => {
            // Ensure the canvas also takes up the full space
            canvas.style.width = "100%";
            canvas.style.height = "100%";
          });
        }
      });

      resizeObserver.observe(containerElement);

      return () => {
        resizeObserver.unobserve(containerElement);

        // Remove all canvas elements to prevent duplication
        if (containerElement) {
          const canvasElements = containerElement.querySelectorAll("canvas");
          canvasElements.forEach((canvas: HTMLCanvasElement) => {
            canvas.remove();
          });
          console.log("ShaderCanvas unmounting - removed canvas elements");
        }
      };
    }, []);

    return (
      <div id={canvasId} ref={internalRef} className={styles.canvasContainer}>
        <OrbitControlsSync />
      </div>
    );
  }
);

export default ShaderCanvas;

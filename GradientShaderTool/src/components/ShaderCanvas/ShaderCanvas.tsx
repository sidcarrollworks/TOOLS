import type { FunctionComponent } from "preact";
import { useEffect, useRef } from "preact/hooks";
import styles from "./ShaderCanvas.module.css";

interface ShaderCanvasProps {
  canvasId?: string;
}

export const ShaderCanvas: FunctionComponent<ShaderCanvasProps> = ({
  canvasId = "shader-canvas",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The ShaderApp instance will be initialized in the parent component
    // and will use this container as its parent

    // Make sure the container takes up the full available space
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        // Force a reflow to ensure the container size is updated
        containerRef.current.style.width = "100%";
        containerRef.current.style.height = "100%";

        // Find any canvas elements that might have been added by Three.js
        const canvasElements = containerRef.current.querySelectorAll("canvas");
        canvasElements.forEach((canvas) => {
          // Ensure the canvas also takes up the full space
          canvas.style.width = "100%";
          canvas.style.height = "100%";
        });
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <div id={canvasId} ref={containerRef} className={styles.canvasContainer} />
  );
};

export default ShaderCanvas;

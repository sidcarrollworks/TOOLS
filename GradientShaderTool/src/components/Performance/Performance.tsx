import type { FunctionComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import styles from "./Performance.module.css";

interface PerformanceProps {
  statsInstance?: any; // Stats.js instance
}

export const Performance: FunctionComponent<PerformanceProps> = ({
  statsInstance,
}) => {
  const [fps, setFps] = useState<number | null>(null);

  useEffect(() => {
    // If no stats instance is provided, we'll just show a placeholder
    if (!statsInstance) return;

    // Extract FPS from the stats object if available
    const updateFps = () => {
      if (statsInstance && statsInstance.getFPS) {
        setFps(Math.round(statsInstance.getFPS()));
      }
    };

    const intervalId = setInterval(updateFps, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [statsInstance]);

  return (
    <div className={styles.performance}>
      {fps !== null ? `Performance: ${fps} FPS` : "Performance"}
    </div>
  );
};

export default Performance;

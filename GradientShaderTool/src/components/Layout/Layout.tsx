import type { FunctionComponent } from "preact";
import { useEffect, useState, useRef } from "preact/hooks";
import styles from "./Layout.module.css";
import { KeyboardHints, MinimalHint } from "./KeyboardHints";

interface LayoutProps {
  viewportContent?: preact.ComponentChildren;
  settingsContent?: preact.ComponentChildren;
  isPaused?: boolean;
  showSettings?: boolean;
  showStats?: boolean;
  onToggleSettings?: () => void;
  onToggleStats?: () => void;
}

export const Layout: FunctionComponent<LayoutProps> = ({
  viewportContent,
  settingsContent,
  isPaused = false,
  showSettings = true,
  showStats = true,
  onToggleSettings,
  onToggleStats,
}) => {
  // State to track if hints should be visible
  const [hintsVisible, setHintsVisible] = useState(true);
  // State to track if transitions should be disabled
  const [disableTransitions, setDisableTransitions] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);

  // Function to handle mouse movement
  const handleMouseMove = () => {
    // Show hints when mouse moves
    setHintsVisible(true);

    // Clear any existing timeout
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    // Only set timeout to hide hints if settings panel is hidden
    if (!showSettings) {
      // Set a new timeout to hide hints after 3 seconds
      timeoutRef.current = window.setTimeout(() => {
        setHintsVisible(false);
      }, 3000);
    }
  };

  // Set up mouse movement detection
  useEffect(() => {
    // Initialize hints visibility
    handleMouseMove();

    // Add mouse movement listener
    window.addEventListener("mousemove", handleMouseMove);

    // Clean up on unmount
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [showSettings]); // Re-run effect when showSettings changes

  // Ensure hints are always visible when settings panel is shown
  // and disable transitions temporarily for instant appearance
  useEffect(() => {
    if (showSettings) {
      // Disable transitions for instant appearance
      setDisableTransitions(true);

      // Make hints visible
      setHintsVisible(true);

      // Clear any existing timeout
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Clear any existing transition timeout
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }

      // Re-enable transitions after a brief delay
      transitionTimeoutRef.current = window.setTimeout(() => {
        setDisableTransitions(false);
      }, 100);
    }

    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [showSettings]);

  return (
    <>
      <div
        className={`${styles.main} ${!showSettings ? styles.fullWidth : ""}`}
      >
        <div className={styles.viewportContainer}>
          <div className={styles.viewport}>
            {viewportContent}
            {showSettings ? (
              <KeyboardHints
                visible={hintsVisible}
                disableTransitions={disableTransitions}
              />
            ) : (
              <MinimalHint
                visible={hintsVisible}
                disableTransitions={disableTransitions}
              />
            )}
          </div>
        </div>

        {showSettings && (
          <div className={styles.settingsPanel}>{settingsContent}</div>
        )}
      </div>
    </>
  );
};

export default Layout;

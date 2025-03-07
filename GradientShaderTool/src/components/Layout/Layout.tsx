import type { FunctionComponent } from "preact";
import { useEffect } from "preact/hooks";
import styles from "./Layout.module.css";

interface LayoutProps {
  viewportContent?: preact.ComponentChildren;
  settingsContent?: preact.ComponentChildren;
  isPaused?: boolean;
  showSettings?: boolean;
  onToggleSettings?: () => void;
}

export const Layout: FunctionComponent<LayoutProps> = ({
  viewportContent,
  settingsContent,
  isPaused = false,
  showSettings = true,
  onToggleSettings,
}) => {
  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 'H' to toggle settings panel
      if ((e.key === "h" || e.key === "H") && onToggleSettings) {
        onToggleSettings();
      }
    };

    // Only add the event listener if onToggleSettings is not provided by parent
    if (!onToggleSettings) {
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [onToggleSettings]);

  return (
    <>
      <div
        className={`${styles.main} ${!showSettings ? styles.fullWidth : ""}`}
      >
        <div className={styles.viewportContainer}>
          <div className={styles.viewport}>
            {viewportContent}
            {isPaused && <span className={styles.pausedBadge}>Paused</span>}
            <div className={styles.keyboardHints}>
              Press <kbd>H</kbd> to toggle settings panel | <kbd>Space</kbd> to
              toggle animation
            </div>
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

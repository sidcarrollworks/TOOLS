import type { FunctionComponent } from "preact";
import { MouseLeftClick, MouseRightClick } from "../Icons";
import styles from "./Layout.module.css";

interface KeyboardHintsProps {
  visible: boolean;
  disableTransitions: boolean;
  isFullscreen?: boolean;
}

export const KeyboardHints: FunctionComponent<KeyboardHintsProps> = ({
  visible,
  disableTransitions,
  isFullscreen = false,
}) => {
  const keyboardHintsClass = `${styles.keyboardHints} ${
    !visible ? styles.keyboardHintsHidden : ""
  } ${disableTransitions ? styles.noTransition : ""}`;

  return (
    <div className={keyboardHintsClass}>
      <span className={styles.keyboardHint}>
        <MouseLeftClick /> + drag to rotate
      </span>
      <span className={styles.keyboardHint}>
        <MouseRightClick /> + drag to pan
      </span>
      <span className={styles.keyboardHint}>
        <kbd>H</kbd> Hide UI
      </span>
      <span className={styles.keyboardHint}>
        <kbd>S</kbd> Show Stats
      </span>
      <span className={styles.keyboardHint}>
        <kbd>Space</kbd> Pause/Play
      </span>
      <span className={styles.keyboardHint}>
        <kbd>F</kbd> {isFullscreen ? "Exit" : "Enter"} Fullscreen
      </span>
      <span className={styles.keyboardHint}>
        <kbd>Ctrl</kbd>+<kbd>D</kbd> Dev Panel
      </span>
    </div>
  );
};

interface MinimalHintProps {
  visible: boolean;
  disableTransitions: boolean;
  isFullscreen?: boolean;
}

export const MinimalHint: FunctionComponent<MinimalHintProps> = ({
  visible,
  disableTransitions,
  isFullscreen = false,
}) => {
  const minimalHintClass = `${styles.minimalHint} ${
    !visible ? styles.minimalHintHidden : ""
  } ${disableTransitions ? styles.noTransition : ""}`;

  return (
    <div className={minimalHintClass}>
      <kbd>H</kbd> Show UI
      <span className={styles.minimalHintSeparator}>|</span>
      <kbd>F</kbd> {isFullscreen ? "Exit" : "Enter"} Fullscreen
    </div>
  );
};

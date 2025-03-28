import type { FunctionComponent } from "preact";
import { MouseLeftClick, MouseRightClick } from "../Icons";
import styles from "./KeyboardHints.module.css";
import { Button } from "../UI/Button";

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
        <kbd>F</kbd> {isFullscreen ? "Exit" : "Enter"} Fullscreen
      </span>
      <span className={styles.keyboardHint}>
        <kbd>Space</kbd> Pause/Play
      </span>
      <span className={styles.keyboardHint}>
        <kbd>Ctrl</kbd>+<kbd>D</kbd> Dev Panel
      </span>
      <span className={styles.divider}> </span>
      <a
        className={styles.link}
        href="https://discord.gg/Trvu6JvM6J"
        target="_blank"
      >
        <Button size="small" variant="primary" style={{ width: "100%" }}>
          Leave feedback
        </Button>
      </a>
      <a
        className={styles.link}
        href="https://donate.stripe.com/5kA3esds16hj4O4144"
        target="_blank"
      >
        <Button size="small" variant="primary" style={{ width: "100%" }}>
          Support this tool!
        </Button>
      </a>
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

import type { FunctionComponent } from "preact";
import { MouseLeftClick, MouseRightClick } from "../Icons";
import styles from "./Layout.module.css";

interface KeyboardHintsProps {
  visible: boolean;
  disableTransitions: boolean;
}

export const KeyboardHints: FunctionComponent<KeyboardHintsProps> = ({
  visible,
  disableTransitions,
}) => {
  const keyboardHintsClass = `${styles.keyboardHints} ${
    !visible ? styles.keyboardHintsHidden : ""
  } ${disableTransitions ? styles.noTransition : ""}`;

  return (
    <div className={`${keyboardHintsClass}`}>
      <span className={`dark ${styles.keyboardHint}`}>
        <MouseLeftClick /> + drag to rotate
      </span>
      <span className={`dark ${styles.keyboardHint}`}>
        <MouseRightClick /> + drag to pan
      </span>
      <span className={`dark ${styles.keyboardHint}`}>
        <kbd>H</kbd> Hide UI
      </span>
      <span className={`dark ${styles.keyboardHint}`}>
        <kbd>S</kbd> Show Stats
      </span>
      <span className={`dark ${styles.keyboardHint}`}>
        <kbd>Space</kbd> Pause/Play
      </span>
      <span className={`dark ${styles.keyboardHint}`}>
        <kbd>Ctrl</kbd>+<kbd>D</kbd> Dev Panel
      </span>
    </div>
  );
};

interface MinimalHintProps {
  visible: boolean;
  disableTransitions: boolean;
}

export const MinimalHint: FunctionComponent<MinimalHintProps> = ({
  visible,
  disableTransitions,
}) => {
  const minimalHintClass = `${styles.minimalHint} ${
    !visible ? styles.minimalHintHidden : ""
  } ${disableTransitions ? styles.noTransition : ""}`;

  return (
    <div className={`dark ${minimalHintClass}`}>
      <kbd>H</kbd> Show UI
    </div>
  );
};

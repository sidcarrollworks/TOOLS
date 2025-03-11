import type { FunctionComponent } from "preact";
import { useState } from "preact/hooks";
import styles from "./Code.module.css";
import { Copy, Check } from "../Icons";

interface CodeProps {
  title?: string;
  code: string;
  language?: string;
}

export const Code: FunctionComponent<CodeProps> = ({
  title,
  code,
  language = "javascript",
}) => {
  const [copyButton, setCopyButton] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyButton(true);
      setTimeout(() => {
        setCopyButton(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className={styles.container}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.codeBlock}>
        <pre>{code}</pre>
        <button className={styles.copyButton} onClick={handleCopy}>
          {copyButton ? (
            <>
              <Check width={14} height={14} /> Copied!
            </>
          ) : (
            <>
              <Copy width={14} height={14} /> Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
};

import type { FunctionComponent } from "preact";
import { useState } from "preact/hooks";
import styles from "./Export.module.css";

interface CodeSectionProps {
  title: string;
  code: string;
}

export const CodeSection: FunctionComponent<CodeSectionProps> = ({
  title,
  code,
}) => {
  const [copyButtonText, setCopyButtonText] = useState("Copy");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyButtonText("Copied!");
      setTimeout(() => {
        setCopyButtonText("Copy");
      }, 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className={styles.codeSection}>
      <h2 className={styles.codeSectionTitle}>{title}</h2>
      <div className={styles.codeContainer}>
        <pre className={styles.codeBlock}>{code}</pre>
        <button className={styles.copyButton} onClick={handleCopy}>
          {copyButtonText}
        </button>
      </div>
    </div>
  );
};

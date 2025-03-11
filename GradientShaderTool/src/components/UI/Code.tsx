import type { FunctionComponent } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import styles from "./Code.module.css";
import { Copy, Check } from "../Icons";

// Import Prism core and its CSS
import Prism from "prismjs";

interface CodeProps {
  code: string;
  language?: string;
}

export const Code: FunctionComponent<CodeProps> = ({
  code,
  language = "javascript",
}) => {
  const [copyButton, setCopyButton] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  // Apply syntax highlighting when component mounts or code/language changes
  useEffect(() => {
    if (codeRef.current) {
      try {
        Prism.highlightElement(codeRef.current);
      } catch (err) {
        console.error("Error highlighting code:", err);
      }
    }
  }, [code, language]);

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

  // Map language prop to Prism language class
  const getLanguageClass = () => {
    switch (language) {
      case "html":
        return "language-markup";
      case "glsl":
        return "language-glsl";
      case "css":
        return "language-css";
      case "javascript":
      default:
        return "language-javascript";
    }
  };

  return (
    <div className={styles.container}>
      <button
        className={`${styles.copyButton} ${copyButton ? styles.copied : ""}`}
        onClick={handleCopy}
      >
        {copyButton ? (
          <Check width={16} height={16} />
        ) : (
          <Copy width={16} height={16} />
        )}
      </button>
      <div className={styles.codeBlock}>
        <pre className={`${styles.pre} ${getLanguageClass()}`}>
          <code ref={codeRef} className={getLanguageClass()}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
};

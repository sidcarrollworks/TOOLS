import type { FunctionComponent } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import styles from "./Code.module.css";
import { Copy, Check } from "../Icons";

// Import Prism core and its CSS
import Prism from "prismjs";
// Import language components
import "prismjs/components/prism-markup"; // HTML
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-glsl";
import "prismjs/components/prism-css";

// Setup Prism configuration
const setupPrism = () => {
  // Ensure languages are properly configured
  Prism.languages.markup = Prism.languages.markup || Prism.languages.html;
  Prism.languages.html = Prism.languages.markup; // Register HTML as an alias for markup

  // Force Prism to reload its configuration
  Prism.hooks.run("before-highlight", {
    element: document.createElement("div"),
    language: "markup",
  });

  // console.log(
  //   "Prism setup complete. Available languages:",
  //   Object.keys(Prism.languages)
  // );
};

// Run setup once
setupPrism();

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
        // console.log(`Highlighting code with language: ${language}`);
        // console.log(`Using Prism class: ${getLanguageClass()}`);

        // Special handling for HTML
        if (language === "html") {
          // console.log("Using direct HTML highlighting");
          const highlightedCode = Prism.highlight(
            code,
            Prism.languages.html,
            "html"
          );
          if (codeRef.current) {
            codeRef.current.innerHTML = highlightedCode;
          }
        } else {
          // For other languages, use the standard approach
          Prism.highlightElement(codeRef.current);
        }

        // Also highlight all code on the page to be sure
        setTimeout(() => {
          Prism.highlightAll();
        }, 0);
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
        // HTML needs to use "language-markup" for proper syntax highlighting in Prism
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

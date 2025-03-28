import type { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Button } from "../UI/Button";
import styles from "./SplashScreen.module.css";

interface SplashScreenProps {
  onClose: () => void;
  visible: boolean;
}

export const SplashScreen: FunctionComponent<SplashScreenProps> = ({
  onClose,
  visible,
}) => {
  const [animateOut, setAnimateOut] = useState(false);

  // Handle animation when closing
  const handleClose = () => {
    setAnimateOut(true);

    // Save user preference in localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("hasSeenSplashScreen", "true");
    }

    setTimeout(() => {
      onClose();
      setAnimateOut(false);
    }, 500); // Match transition duration from CSS
  };

  // Add listener to close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (visible) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`${styles.overlay} ${animateOut ? styles.fadeOut : ""}`}
      onClick={handleClose}
    >
      <div className={styles.container}>
        <div className={styles.content} onClick={(e) => e.stopPropagation()}>
          <h1 className={styles.title}>Welcome to the Gradient Shader Tool.</h1>
          <div className={styles.description}>
            <p>
              I made this tool to help anyone create cool backgrounds for their
              projects easily. Save it as an image or export the javascript and
              shaders to your own project.
            </p>

            <p>
              Down the line I'll add more features, but for now, just mess
              around with the sliders and enjoy!
            </p>

            <p>
              If you have any feedback,{" "}
              <a href="https://discord.gg/Trvu6JvM6J" target="_blank">
                write it down
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;

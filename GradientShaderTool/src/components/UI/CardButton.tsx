import type { FunctionComponent, JSX } from "preact";
import { useState, useEffect } from "preact/hooks";
import styles from "./CardButton.module.css";

interface CardButtonProps {
  label: string;
  onClick?: JSX.MouseEventHandler<HTMLButtonElement>;
  isActive?: boolean;
  image?: string; // Add prop for the preview image
}

export const CardButton: FunctionComponent<CardButtonProps> = ({
  label,
  onClick,
  isActive = false,
  image,
}) => {
  // Add state to track if image is loaded
  const [imageLoaded, setImageLoaded] = useState(!!image);

  // Preload the image to prevent layout shifts
  useEffect(() => {
    if (!image) {
      setImageLoaded(true);
      return;
    }

    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageLoaded(true); // Still mark as loaded even if error
    img.src = image;
  }, [image]);

  // Combine classes based on props
  const buttonClasses = [styles.cardButton, isActive ? styles.active : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={buttonClasses} onClick={onClick}>
      <div
        className={`${styles.preview} ${!imageLoaded ? styles.loading : ""}`}
        style={
          image && imageLoaded
            ? {
                backgroundImage: `url(${image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      />
      <div className={styles.label}>{label}</div>
    </button>
  );
};

export default CardButton;

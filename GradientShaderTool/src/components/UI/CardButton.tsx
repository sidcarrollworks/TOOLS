import type { FunctionComponent, JSX } from "preact";
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
  // Combine classes based on props
  const buttonClasses = [styles.cardButton, isActive ? styles.active : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={buttonClasses} onClick={onClick}>
      <div
        className={styles.preview}
        style={
          image
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

import type { FunctionComponent, JSX } from "preact";
import styles from "./CardButton.module.css";

interface CardButtonProps {
  label: string;
  onClick?: JSX.MouseEventHandler<HTMLButtonElement>;
  isActive?: boolean;
  // In the future, we might add a prop for the actual preview image
}

export const CardButton: FunctionComponent<CardButtonProps> = ({
  label,
  onClick,
  isActive = false,
}) => {
  // Combine classes based on props
  const buttonClasses = [styles.cardButton, isActive ? styles.active : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={buttonClasses} onClick={onClick}>
      <div className={styles.preview} />
      <div className={styles.label}>{label}</div>
    </button>
  );
};

export default CardButton;

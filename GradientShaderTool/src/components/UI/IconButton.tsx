import type { FunctionComponent, JSX } from "preact";
import { useState } from "preact/hooks";
import { Tooltip } from "./Tooltip";
import styles from "./IconButton.module.css";

interface IconButtonProps {
  icon: JSX.Element;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
  tooltipPosition?: "top" | "right" | "bottom" | "left";
}

export const IconButton: FunctionComponent<IconButtonProps> = ({
  icon,
  label,
  onClick,
  isActive = false,
  tooltipPosition = "right",
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Tooltip content={label} position={tooltipPosition}>
      <button
        className={`${styles.iconButton} ${isActive ? styles.active : ""}`}
        onClick={onClick}
        aria-label={label}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={styles.iconContainer}>{icon}</div>
      </button>
    </Tooltip>
  );
};

export default IconButton;

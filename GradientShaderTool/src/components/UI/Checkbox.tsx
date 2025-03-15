import type { FunctionComponent } from "preact";
import type { JSX } from "preact/jsx-runtime";
import styles from "./Checkbox.module.css";

interface CheckboxProps {
  /**
   * The checked state of the checkbox
   */
  checked: boolean;
  /**
   * The label to display next to the checkbox
   */
  label?: string;
  /**
   * Whether the checkbox is disabled
   */
  disabled?: boolean;
  /**
   * The name of the checkbox
   */
  name?: string;
  /**
   * The id of the checkbox
   */
  id?: string;
  /**
   * The onChange handler
   */
  onChange: (checked: boolean) => void;
  /**
   * Additional class name for the checkbox
   */
  className?: string;
}

/**
 * A styled checkbox component
 */
export const Checkbox: FunctionComponent<CheckboxProps> = ({
  checked,
  label,
  disabled = false,
  name,
  id,
  onChange,
  className = "",
}) => {
  const handleChange = (e: JSX.TargetedEvent<HTMLInputElement>) => {
    onChange((e.target as HTMLInputElement).checked);
  };

  return (
    <div className={`${styles.checkboxContainer} ${className}`}>
      {label && (
        <label
          className={`${styles.label} ${disabled ? styles.disabled : ""}`}
          htmlFor={id}
        >
          {label}
        </label>
      )}
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={checked}
        disabled={disabled}
        name={name}
        id={id}
        onChange={handleChange}
      />
    </div>
  );
};

export default Checkbox;

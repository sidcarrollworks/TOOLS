import { useState, useCallback } from "preact/hooks";
import { type FunctionComponent, type ComponentChildren } from "preact";
import styles from "./SettingsGroup.module.css";
import { ChevronDown, ChevronUp } from "../Icons/index";

/**
 * Props for SettingsGroup component
 */
export interface SettingsGroupProps {
  /**
   * Title of the settings group
   */
  title?: string;

  /**
   * Optional description of the settings group
   */
  description?: string;

  /**
   * Whether the group is collapsible
   */
  collapsible?: boolean;

  /**
   * Whether the group is collapsed by default
   */
  defaultCollapsed?: boolean;

  /**
   * Whether to show the header
   */
  header?: boolean;

  /**
   * Children components
   */
  children: ComponentChildren;

  /**
   * CSS class name for the group
   */
  className?: string;

  /**
   * Optional status indicator to display next to the title
   * (e.g., "updating", "error")
   */
  status?: "updating" | "error" | "modified" | null;

  /**
   * Optional tooltip to display on hover
   */
  tooltip?: string;

  /**
   * Optional badge to display next to the title
   */
  badge?: string | number;

  /**
   * Optional callback for when the group is collapsed/expanded
   */
  onToggle?: (collapsed: boolean) => void;

  /**
   * Whether to display the group in a grid layout
   */
  grid?: boolean;
}

/**
 * A collapsible group of settings
 */
export const SettingsGroup: FunctionComponent<SettingsGroupProps> = ({
  title,
  description,
  collapsible = true,
  defaultCollapsed = false,
  header = true,
  children,
  className = "",
  status = null,
  tooltip,
  badge,
  onToggle,
  grid = false,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const handleToggle = useCallback(() => {
    if (!collapsible) return;

    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);

    if (onToggle) {
      onToggle(newCollapsed);
    }
  }, [collapsed, collapsible, onToggle]);

  return (
    <div
      className={`${styles.settingsGroup} ${className} ${
        grid ? styles.grid : ""
      }`}
    >
      {header && (
        <div
          className={`${styles.settingsGroupHeader} ${
            collapsible ? styles.collapsible : ""
          }`}
          onClick={handleToggle}
          title={tooltip}
        >
          <div className={styles.settingsGroupTitle}>
            <span className={styles.settingsGroupTitleText}>{title}</span>

            {badge && (
              <span className={styles.settingsGroupBadge}>{badge}</span>
            )}

            {status && (
              <span
                className={`${styles.settingsGroupStatus} ${styles[status]}`}
              >
                {status === "updating" && "Updating..."}
                {status === "error" && "Error"}
                {status === "modified" && "Modified"}
              </span>
            )}
          </div>

          {collapsible && (
            <span className={styles.settingsGroupToggle}>
              {collapsed ? <ChevronDown /> : <ChevronUp />}
            </span>
          )}
        </div>
      )}

      {description && (
        <div className={styles.settingsGroupDescription}>{description}</div>
      )}

      {/* if header is false and title is not empty, render the title as a h3 */}
      {!header && title && (
        <h3 className={styles.settingsGroupTitle}>{title}</h3>
      )}

      {/* Render children directly when header is false, otherwise wrap in the content div */}
      {!header ? (
        children
      ) : (
        <div
          className={`${styles.settingsGroupContent} ${
            collapsed ? styles.hidden : ""
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Props for the settings field component
 */
export interface SettingsFieldProps {
  /**
   * Label for the settings field
   */
  label: string;

  /**
   * Children components (typically an input)
   */
  children: ComponentChildren;

  /**
   * CSS class name for the field
   */
  className?: string;

  /**
   * Optional error message to display
   */
  error?: string;

  /**
   * Optional help text to display
   */
  helpText?: string;

  /**
   * Optional tooltip to display on hover
   */
  tooltip?: string;

  /**
   * Whether the field is required
   */
  required?: boolean;

  /**
   * Whether the field is disabled
   */
  disabled?: boolean;

  /**
   * Optional ID for the field (for accessibility)
   */
  id?: string;

  /**
   * Direction of the input group
   */
  inputDir?: "row" | "column";

  /**
   * Diretion of the field label
   */
  labelDir?: "row" | "column";
}

/**
 * A field within a settings group
 */
export const SettingsField: FunctionComponent<SettingsFieldProps> = ({
  label,
  children,
  className = "",
  error,
  helpText,
  tooltip,
  required = false,
  disabled = false,
  id,
  inputDir = "column",
  labelDir = "row",
}) => {
  return (
    <div
      className={`${styles.settingsField} ${className} ${
        error ? styles.hasError : ""
      } ${disabled ? styles.disabled : ""} ${
        labelDir === "row" ? styles.row : styles.column
      }`}
    >
      <label className={styles.settingsFieldLabel} title={tooltip} htmlFor={id}>
        {label}
        {required && <span className={styles.settingsFieldRequired}>*</span>}
      </label>

      <div
        className={`${styles.settingsFieldInput} ${
          inputDir === "row" ? styles.row : styles.column
        }`}
      >
        {children}
      </div>

      {helpText && <div className={styles.settingsFieldHelp}>{helpText}</div>}

      {error && <div className={styles.settingsFieldError}>{error}</div>}
    </div>
  );
};

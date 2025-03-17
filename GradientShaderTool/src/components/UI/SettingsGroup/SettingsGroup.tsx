import { useState, useCallback } from "preact/hooks";
import { type FunctionComponent, type ComponentChildren } from "preact";
import "./SettingsGroup.css";
import { ChevronDown, ChevronUp } from "../Icons";

/**
 * Props for SettingsGroup component
 */
export interface SettingsGroupProps {
  /**
   * Title of the settings group
   */
  title: string;

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
}

/**
 * A collapsible group of settings
 */
export const SettingsGroup: FunctionComponent<SettingsGroupProps> = ({
  title,
  description,
  collapsible = true,
  defaultCollapsed = false,
  children,
  className = "",
  status = null,
  tooltip,
  badge,
  onToggle,
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
      className={`settings-group ${className} ${collapsed ? "collapsed" : ""}`}
    >
      <div
        className={`settings-group-header ${collapsible ? "collapsible" : ""}`}
        onClick={handleToggle}
        title={tooltip}
      >
        <div className="settings-group-title">
          <span className="settings-group-title-text">{title}</span>

          {badge && <span className="settings-group-badge">{badge}</span>}

          {status && (
            <span className={`settings-group-status ${status}`}>
              {status === "updating" && "Updating..."}
              {status === "error" && "Error"}
              {status === "modified" && "Modified"}
            </span>
          )}
        </div>

        {collapsible && (
          <span className="settings-group-toggle">
            {collapsed ? <ChevronDown /> : <ChevronUp />}
          </span>
        )}
      </div>

      {description && (
        <div className="settings-group-description">{description}</div>
      )}

      <div className={`settings-group-content ${collapsed ? "hidden" : ""}`}>
        {children}
      </div>
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
}) => {
  return (
    <div
      className={`settings-field ${className} ${error ? "has-error" : ""} ${
        disabled ? "disabled" : ""
      }`}
    >
      <label className="settings-field-label" title={tooltip} htmlFor={id}>
        {label}
        {required && <span className="settings-field-required">*</span>}
      </label>

      <div className="settings-field-input">{children}</div>

      {helpText && <div className="settings-field-help">{helpText}</div>}

      {error && <div className="settings-field-error">{error}</div>}
    </div>
  );
};

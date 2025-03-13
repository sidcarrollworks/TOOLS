import type { FunctionComponent } from "preact";
import type { ShaderParams } from "../../lib/ShaderApp";
import { FigmaInput } from "../FigmaInput/FigmaInput";
import { Tooltip } from "../UI";
import styles from "./ControlPanel.module.css";

interface NumericControlProps {
  label: string;
  paramKey: keyof ShaderParams;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals?: number;
  tooltip?: string;
  onChange: (key: keyof ShaderParams, value: number) => void;
  disabled?: boolean;
}

export const NumericControl: FunctionComponent<NumericControlProps> = ({
  label,
  paramKey,
  value,
  min,
  max,
  step,
  decimals = 1,
  tooltip,
  onChange,
  disabled = false,
}) => {
  // Add an ID for debugging
  const controlId = `numeric-control-${paramKey}`;

  console.log(
    `[${controlId}] Rendering NumericControl with label: ${label}, tooltip: ${tooltip}`
  );

  const handleChange = (newValue: number) => {
    onChange(paramKey, newValue);
  };

  // If a tooltip is provided, wrap the label with the Tooltip component
  let labelElement;

  if (tooltip) {
    console.log(`[${controlId}] Creating tooltip for label: ${label}`);
    labelElement = (
      <Tooltip content={tooltip} position="top" delay={300}>
        <span>{label}</span>
      </Tooltip>
    );
    console.log(`[${controlId}] Created tooltip element`);
  } else {
    labelElement = <span>{label}</span>;
  }

  return (
    <div className={styles.controlRow}>
      <FigmaInput
        label={labelElement}
        value={value}
        min={min}
        max={max}
        step={step}
        decimals={decimals}
        onChange={handleChange}
        disabled={disabled}
        className={styles.figmaInputWrapper}
      />
    </div>
  );
};

import type { FunctionComponent } from "preact";
import type { ShaderParams } from "../../lib/ShaderApp";
import { FigmaInput } from "../FigmaInput/FigmaInput";
import styles from "./ControlPanel.module.css";

interface NumericControlProps {
  label: string;
  paramKey: keyof ShaderParams;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals?: number;
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
  onChange,
  disabled = false,
}) => {
  const handleChange = (newValue: number) => {
    onChange(paramKey, newValue);
  };

  return (
    <div className={styles.controlRow}>
      <FigmaInput
        label={label}
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

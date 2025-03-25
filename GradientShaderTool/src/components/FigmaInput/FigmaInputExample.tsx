import type { FunctionComponent } from "preact";
import { useState } from "preact/hooks";
import { FigmaInput } from "./FigmaInput";

export const FigmaInputExample: FunctionComponent = () => {
  const [value1, setValue1] = useState(50);
  const [value2, setValue2] = useState(50);
  const [value3, setValue3] = useState(50);

  return (
    <div
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <h3>FigmaInput Examples with Different Drag Icons</h3>

      {/* Default drag icon */}
      <FigmaInput
        label="Default Icon"
        value={value1}
        min={0}
        max={100}
        step={1}
        onChange={setValue1}
      />

      {/* Text character as drag icon */}
      <FigmaInput
        label="Text Character Icon"
        value={value2}
        min={0}
        max={100}
        step={1}
        onChange={setValue2}
        dragIcon="X"
      />

      {/* Custom SVG as drag icon */}
      <FigmaInput
        label="Custom SVG Icon"
        value={value3}
        min={0}
        max={100}
        step={1}
        onChange={setValue3}
        dragIcon={
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        }
      />
    </div>
  );
};

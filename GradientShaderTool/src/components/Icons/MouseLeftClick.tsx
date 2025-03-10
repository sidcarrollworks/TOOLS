import type { FunctionComponent } from "preact";

interface MouseLeftClickProps {
  width?: number;
  height?: number;
  className?: string;
}

export const MouseLeftClick: FunctionComponent<MouseLeftClickProps> = ({
  width = 18,
  height = 18,
  className = "",
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <path
        d="M8.00014 1.14307C5.47541 1.14307 3.42871 3.2921 3.42871 5.94307H8.00014V1.14307Z"
        fill="currentColor"
        fill-opacity="0.5"
      />
      <path
        d="M8.00014 1.14307C5.47541 1.14307 3.42871 3.2921 3.42871 5.94307M8.00014 1.14307C10.5249 1.14307 12.5716 3.2921 12.5716 5.94307M8.00014 1.14307V5.94307M3.42871 5.94307V10.0574C3.42871 12.7083 5.47541 14.8574 8.00014 14.8574C10.5249 14.8574 12.5716 12.7083 12.5716 10.0574V5.94307M3.42871 5.94307H8.00014M12.5716 5.94307H8.00014"
        stroke="currentColor"
        stroke-width="0.583333"
      />
      <path
        d="M6 6.6665H6.00583"
        stroke="currentColor"
        stroke-width="0.583333"
      />
    </svg>
  );
};

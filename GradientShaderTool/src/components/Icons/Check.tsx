import type { FunctionComponent } from "preact";

interface IconProps {
  width?: number;
  height?: number;
  className?: string;
}

export const Check: FunctionComponent<IconProps> = ({
  width = 18,
  height = 18,
  className = "",
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
};

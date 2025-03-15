import type { FunctionComponent } from "preact";

interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

export const CodeIcon: FunctionComponent<IconProps> = ({
  className,
  width = 16,
  height = 16,
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
      class={className}
    >
      <path d="m18 16 4-4-4-4" />
      <path d="m6 8-4 4 4 4" />
      <path d="m14.5 4-5 16" />
    </svg>
  );
};

export default CodeIcon;

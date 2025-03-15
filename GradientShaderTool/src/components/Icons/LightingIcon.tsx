import type { FunctionComponent } from "preact";

interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

export const LightingIcon: FunctionComponent<IconProps> = ({
  className,
  width = 16,
  height = 16,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={className}
    >
      <path d="M10 9.33331C10.1333 8.66665 10.4667 8.19998 11 7.66665C11.6667 7.06665 12 6.19998 12 5.33331C12 4.27245 11.5786 3.25503 10.8284 2.50489C10.0783 1.75474 9.06087 1.33331 8 1.33331C6.93913 1.33331 5.92172 1.75474 5.17157 2.50489C4.42143 3.25503 4 4.27245 4 5.33331C4 5.99998 4.13333 6.79998 5 7.66665C5.46667 8.13331 5.86667 8.66665 6 9.33331" />
      <path d="M6 12H10" />
      <path d="M6.66669 14.6667H9.33335" />
    </svg>
  );
};

export default LightingIcon;

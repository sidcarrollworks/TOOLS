import type { FunctionComponent } from "preact";

interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

export const GeometryIcon: FunctionComponent<IconProps> = ({
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
      <path d="M18.0926 15.8771L5.90737 8.12287M18.0926 15.8771L14.0234 18.4667C12.9059 19.1778 11.0941 19.1778 9.97662 18.4667L5.90737 15.8771M18.0926 15.8771L22.1619 13.2876C23.2794 12.5765 23.2794 11.4235 22.1619 10.7124L18.0926 8.12287M18.0926 8.12287L5.90737 15.8771M18.0926 8.12287L14.0234 5.53334C12.9059 4.82222 11.0941 4.82222 9.97662 5.53334L5.90737 8.12287M5.90737 8.12287L1.83811 10.7124C0.72063 11.4235 0.72063 12.5765 1.83811 13.2876L5.90737 15.8771" />
    </svg>
  );
};

export default GeometryIcon;

import type { FunctionComponent } from "preact";

interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

export const HTML: FunctionComponent<IconProps> = ({
  className,
  width = 18,
  height = 18,
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
        d="M3.52834 13.1446L2.54405 1.5H13.456L12.4717 13.1446L8 14.4782L3.52834 13.1446Z"
        stroke="#ff6918"
      />
      <path
        d="M8 8.34389V6.89593H10.8043L10.5761 11.0588L8 12V10.4796L9.33696 9.97285L9.43478 8.34389H8ZM10.9022 5.44796L11 4H8V5.44796H10.9022Z"
        fill="#ff6918"
      />
      <path
        d="M8 10.4796V12L5.3956 11.0588L5.26374 9.06787H6.58242L6.64835 9.97285L8 10.4796ZM6.38462 5.44796H8V4H5L5.23077 8.34389H8V6.89593H6.48352L6.38462 5.44796Z"
        fill="#ff6918"
      />
    </svg>
  );
};

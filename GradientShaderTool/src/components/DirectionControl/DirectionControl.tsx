import { useRef, useState, useEffect } from "preact/hooks";
import type { FunctionalComponent } from "preact";
import styles from "./DirectionControl.module.css";
import { ParticleFlow } from "./ParticleFlow";

interface DirectionControlProps {
  label?: string;
  valueX: number; // Current X value (-1 to 1)
  valueY: number; // Current Y value (-1 to 1)
  speed: number; // Current speed value
  min: number; // Min value for X/Y
  max: number; // Max value for X/Y
  minSpeed: number; // Min value for speed
  maxSpeed: number; // Max value for speed
  step: number; // Step increment for values
  onChangeX: (value: number) => void;
  onChangeY: (value: number) => void;
  onChangeSpeed: (value: number) => void;
  disabled?: boolean;
}

export const DirectionControl: FunctionalComponent<DirectionControlProps> = ({
  label = "Flow",
  valueX,
  valueY,
  speed,
  min = -1,
  max = 1,
  minSpeed = 0,
  maxSpeed = 1,
  step = 0.01,
  onChangeX,
  onChangeY,
  onChangeSpeed,
  disabled = false,
}) => {
  // Refs for DOM elements
  const controlAreaRef = useRef<HTMLDivElement>(null);
  const controlPointRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Generate a unique ID for this instance
  const uniqueId = useRef(
    `direction-control-${Math.random().toString(36).substr(2, 9)}`
  ).current;

  // State for internal tracking
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Derived values
  const magnitude = Math.sqrt(valueX * valueX + valueY * valueY);
  // Calculate the angle for rotation (in degrees)
  // We use atan2 to get the angle, and convert from radians to degrees
  // Note: We use -valueY because the Y-axis is inverted in the DOM
  // Subtract 90 degrees to make particles flow downward in the direction of the control point
  const angle = Math.atan2(valueY, -valueX) * (180 / Math.PI) - 90;

  // For debugging cardinal direction issues
  useEffect(() => {
    // No longer needed - removing debug logs
  }, [valueX, valueY, magnitude, angle]);

  // Monitor magnitude changes during dragging
  useEffect(() => {
    // No longer needed - removing debug logs
  }, [magnitude, isDragging]);

  // Update the ref when state changes
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging, magnitude]);

  // Mouse event handlers
  const handleMouseDown = (e: MouseEvent) => {
    if (disabled) return;

    // Prevent default to avoid text selection
    e.preventDefault();

    // Start dragging
    setIsDragging(true);
    isDraggingRef.current = true;

    // Update values immediately on click
    updateValuesFromPointerPosition(e);

    // Add global event listeners
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;

    // Prevent default to avoid text selection during drag
    e.preventDefault();

    // Update values based on mouse position
    updateValuesFromPointerPosition(e, e.shiftKey);
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;

    // End dragging
    setIsDragging(false);
    isDraggingRef.current = false;

    // Make sure to update values one last time to ensure we have the final position
    updateValuesFromPointerPosition(e, e.shiftKey);

    // Remove global event listeners
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  // Handle double click to reset
  const handleDoubleClick = (e: MouseEvent) => {
    e.preventDefault();
    onChangeX(0);
    onChangeY(0);
    onChangeSpeed(minSpeed);
  };

  // Calculate new values based on pointer position
  const updateValuesFromPointerPosition = (
    e: MouseEvent,
    isShiftKey = false
  ) => {
    if (!controlAreaRef.current) return;

    // Get control area dimensions and position
    const rect = controlAreaRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate raw coordinates relative to center (-1 to 1 range)
    let rawX = (e.clientX - centerX) / (rect.width / 2);
    let rawY = -(e.clientY - centerY) / (rect.height / 2); // Y is inverted in DOM

    // Calculate magnitude and angle
    let mag = Math.sqrt(rawX * rawX + rawY * rawY);
    let ang = Math.atan2(rawY, rawX);

    // Apply shift key constraint
    if (isShiftKey && mag > 0) {
      // Round angle to nearest 22.5 degrees (π/8 radians)
      ang = Math.round(ang / (Math.PI / 8)) * (Math.PI / 8);

      // Round magnitude to nearest 0.25 increment (0.25, 0.5, 0.75, 1.0)
      mag = Math.round(mag * 4) / 4;

      // Clamp magnitude to min of 0.25 if it's greater than 0
      if (mag > 0 && mag < 0.25) mag = 0.25;

      // Recalculate X and Y from constrained angle and magnitude
      rawX = mag * Math.cos(ang);
      rawY = mag * Math.sin(ang);
    }

    // Clamp magnitude to max of 1
    if (mag > 1) {
      rawX = rawX / mag;
      rawY = rawY / mag;
      mag = 1;
    }

    // Map to actual parameter ranges
    // In the shader, the shift values determine the direction of the noise flow:
    // float shiftX = uTime * uNoiseShiftX * uNoiseShiftSpeed;
    // float shiftY = uTime * uNoiseShiftY * uNoiseShiftSpeed;
    //
    // We need to FLIP the signs of the values to make the noise flow in the
    // direction of the control point. This is because in the shader, positive values
    // make the noise flow in the negative direction.
    const newX = -rawX * max; // Flip the sign for X
    const newY = -rawY * max; // Flip the sign for Y
    const newSpeed = mag * (maxSpeed - minSpeed) + minSpeed;

    // Round to step
    const roundToStep = (value: number) => Math.round(value / step) * step;

    // Update values
    onChangeX(roundToStep(newX));
    onChangeY(roundToStep(newY));
    onChangeSpeed(roundToStep(newSpeed));

    // Force re-render of the component to ensure animation continues
    setIsHovered(true);
  };

  // Get color based on magnitude for intensity visualization
  const getIntensityColor = (magnitude: number, hovered: boolean) => {
    // Use grayscale when not hovered
    if (!hovered && !isDragging) {
      if (magnitude < 0.3) return "var(--gray-8)";
      if (magnitude < 0.6) return "var(--gray-9)";
      return "var(--gray-10)";
    }

    // Create a smooth color transition from green to red based on magnitude
    // Instead of discrete steps, we'll interpolate between colors

    // Normalize magnitude to 0-1 range for interpolation
    const normalizedMagnitude = Math.min(1, Math.max(0, magnitude));

    // HSL color interpolation for smooth transition
    // Green (grass) is around hue 120, amber around 45, red around 0
    // We'll interpolate the hue based on magnitude
    const hue = 120 - normalizedMagnitude * 120; // 120 (green) to 0 (red)
    const saturation = 70 + normalizedMagnitude * 20; // Increase saturation with magnitude
    const lightness = 45 + normalizedMagnitude * 5; // Slightly increase lightness with magnitude

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Position the control point based on current values
  // Note: We use -valueX and -valueY here to flip the visual representation
  // to match the actual flow direction in the shader
  const controlPointStyle = {
    left: `${50 + (-valueX / max) * 50}%`,
    top: `${50 - (-valueY / max) * 50}%`,
    color: getIntensityColor(magnitude, isHovered || isDragging),
    // Add a dynamic box-shadow that matches the color for a glow effect
    boxShadow:
      isHovered || isDragging
        ? `0 0 2px ${getIntensityColor(
            magnitude,
            true
          )}, 0 0 8px -6px ${getIntensityColor(
            Math.min(1, magnitude * 0.7),
            true
          )}`
        : undefined,
  };

  // Calculate SVG line coordinates
  // SVG coordinates start from top-left, so we need to adjust
  // We use -valueX and -valueY to flip the visual representation
  const svgLineProps = {
    x1: 60 - 0.5, // Center X (120px / 2) with 0.5px adjustment for precise centering
    y1: 60 - 0.5, // Center Y (120px / 2) with 0.5px adjustment for precise centering
    // Add a tiny offset (0.0001) to prevent exact zero values which can cause rendering issues
    x2: 60 - 0.5 + (Math.abs(-valueX) < 0.001 ? 0.0001 : (-valueX / max) * 60),
    y2: 60 - 0.5 - (Math.abs(-valueY) < 0.001 ? 0.0001 : (-valueY / max) * 60),
    strokeWidth: 1, // Line width
    // Only hide the line when both X and Y are exactly 0 (center position)
    opacity: Math.abs(valueX) < 0.001 && Math.abs(valueY) < 0.001 ? 0 : 1,
  };

  // Calculate rotation style for the canvas container
  // We rotate in the opposite direction of the angle to make particles flow in the direction of the control point
  const canvasRotationStyle = {
    transform: magnitude > 0.01 ? `rotate(${angle}deg)` : "rotate(90deg)", // Default to downward flow when magnitude is near zero
    transition: isDragging ? "none" : "transform 0.2s ease-out", // Add smooth transition except when dragging
  };

  return (
    <div
      className={`${styles.directionControl} ${
        disabled ? styles.disabled : ""
      }`}
      onMouseEnter={() => {
        setShowTooltip(true);
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setShowTooltip(false);
        setIsHovered(false);
      }}
    >
      {label && <div className={styles.label}>{label}</div>}

      <div className={styles.controlContainer}>
        {/* Main control area */}
        <div
          ref={controlAreaRef}
          className={`${styles.controlArea} ${
            isDragging ? styles.dragging : ""
          }`}
          onMouseDown={handleMouseDown}
          onDblClick={handleDoubleClick}
        >
          {/* Particle flow visualization with rotation container */}
          <div className={styles.canvasContainer} style={canvasRotationStyle}>
            <ParticleFlow
              magnitude={magnitude}
              width={120} // Match the control area size
              height={120} // Match the control area size
              isVisible={isHovered || isDragging} // Visible when hovered or dragging
              particleCount={25} // Moderate particle count for performance
              directionX={0} // Fixed direction - always downward
              directionY={1} // Fixed direction - always downward
              particleColor="rgba(180, 180, 180, 0.7)" // Light gray color with slightly more opacity
              isDragging={isDragging} // Pass dragging state for performance optimization
            />
          </div>

          {/* Grid lines and indicators */}
          <div className={styles.gridLines}>
            <div className={styles.horizontalLine}></div>
            <div className={styles.verticalLine}></div>
            <div className={styles.circle}></div>
            <div className={styles.centerPoint}></div>
          </div>

          {/* Direction line from center to control point using SVG for precision */}
          <svg className={styles.directionSvg} width="120" height="120">
            <defs>
              {/* Gradient for hover state */}
              <linearGradient
                id={`lineGradient-${uniqueId}`}
                x1={svgLineProps.x1}
                y1={svgLineProps.y1}
                x2={svgLineProps.x2}
                y2={svgLineProps.y2}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="var(--grass-9)" />
                <stop offset="50%" stopColor="var(--grass-11)" />
                <stop offset="100%" stopColor="var(--red-11)" />
              </linearGradient>

              {/* Gradient for non-hover state (grayscale) */}
              <linearGradient
                id={`lineGradientGray-${uniqueId}`}
                x1={svgLineProps.x1}
                y1={svgLineProps.y1}
                x2={svgLineProps.x2}
                y2={svgLineProps.y2}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="var(--gray-8)" />
                <stop offset="100%" stopColor="var(--gray-10)" />
              </linearGradient>
            </defs>

            {/* Gray line (visible when not hovered) */}
            <line
              x1={svgLineProps.x1}
              y1={svgLineProps.y1}
              x2={svgLineProps.x2}
              y2={svgLineProps.y2}
              stroke={`url(#lineGradientGray-${uniqueId})`}
              strokeWidth={svgLineProps.strokeWidth}
              opacity={svgLineProps.opacity}
              className={styles.grayLine}
            />

            {/* Colored line (visible on hover) */}
            <line
              x1={svgLineProps.x1}
              y1={svgLineProps.y1}
              x2={svgLineProps.x2}
              y2={svgLineProps.y2}
              stroke={`url(#lineGradient-${uniqueId})`}
              strokeWidth={svgLineProps.strokeWidth}
              opacity={svgLineProps.opacity}
              className={styles.colorLine}
            />
          </svg>

          {/* Draggable control point */}
          <div
            ref={controlPointRef}
            className={styles.controlPoint}
            style={controlPointStyle}
            onMouseDown={handleMouseDown}
          >
            {/* We don't need the arrow inside the control point anymore */}
          </div>
        </div>

        {/* Value display */}
        <div className={styles.valueDisplay}>
          <div>X: {(-valueX).toFixed(2)}</div>
          <div>Y: {(-valueY).toFixed(2)}</div>
          <div>Mag: {magnitude.toFixed(2)}</div>
          <div>Angle: {Math.round(angle)}°</div>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipPreview}>
            {/* Mini animation canvas would go here */}
          </div>
          <div className={styles.tooltipText}>
            Controls the direction and intensity of the effect. The noise will
            flow in the direction of the line.
            <br />
            <span className={styles.tooltipHint}>
              Double-click to reset. Hold Shift for 22.5° angles and 25%
              magnitude increments.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

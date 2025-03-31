import type { FunctionComponent } from "preact";
import { useRef, useState, useEffect } from "preact/hooks";
import { MAX_COLOR_STOPS } from "../../lib/types/ColorStop";
import type { ColorStop } from "../../lib/types/ColorStop";
import { GradientMode } from "../../lib/types/ColorStop";
import { ColorInput } from "../UI";
import { X } from "../UI/Icons/X";
import {
  getCSSGradientStyle,
  renderGradientToCanvas,
} from "../../lib/modules/GradientRenderer";
import styles from "./GradientBar.module.css";

// Enhanced ColorStop that includes a unique ID for tracking
interface EnhancedColorStop extends ColorStop {
  id: string;
}

interface GradientBarProps {
  colorStops: ColorStop[];
  onChange: (newStops: ColorStop[]) => void;
  maxStops?: number;
  height?: number;
  className?: string;
  gradientMode?: GradientMode;
}

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Determine which modes need canvas rendering
const needsCanvasRendering = (mode: GradientMode): boolean => {
  return mode === GradientMode.BSpline || mode === GradientMode.SmoothStep;
};

const GradientBar: FunctionComponent<GradientBarProps> = ({
  colorStops,
  onChange,
  maxStops = MAX_COLOR_STOPS,
  height = 24,
  className = "",
  gradientMode = GradientMode.BSpline,
}) => {
  // Convert incoming ColorStops to EnhancedColorStops with IDs
  const [enhancedStops, setEnhancedStops] = useState<EnhancedColorStop[]>([]);

  // State for managing UI interactions
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStopId, setDragStopId] = useState<string | null>(null);

  // Refs for DOM elements and interaction tracking
  const barRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const justFinishedDragging = useRef(false);
  const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const mouseUpHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);

  // Refs for drag state (used to avoid React closure issues)
  const dragStopIdRef = useRef<string | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Update enhanced stops when input props change
  useEffect(() => {
    const updatedEnhanced = colorStops.map((stop) => {
      // Find existing enhanced stop with matching position and color
      const existingStop = enhancedStops.find(
        (enhanced) =>
          enhanced.position === stop.position && enhanced.color === stop.color
      );

      // If found, keep its ID; otherwise generate a new one
      return existingStop || { ...stop, id: generateId() };
    });

    setEnhancedStops(updatedEnhanced);
  }, [colorStops]);

  // Sort color stops by position for rendering
  const sortedStops = [...enhancedStops].sort(
    (a, b) => a.position - b.position
  );

  // Find currently active/selected color stop
  const activeStop = activeStopId
    ? enhancedStops.find((stop) => stop.id === activeStopId) || null
    : null;

  // Find the index of the active stop
  const activeStopIndex = activeStop
    ? enhancedStops.findIndex((stop) => stop.id === activeStop.id)
    : null;

  // Generate CSS gradient style from color stops
  const gradientStyle = needsCanvasRendering(gradientMode)
    ? "transparent" // Use transparent for canvas-rendered modes
    : getCSSGradientStyle(sortedStops, gradientMode);

  // Handle rendering the gradient in the canvas (when needed)
  useEffect(() => {
    // Only render to canvas for modes that need it
    if (
      !needsCanvasRendering(gradientMode) ||
      !canvasRef.current ||
      sortedStops.length === 0
    ) {
      return;
    }

    const canvas = canvasRef.current;

    // Set canvas dimensions to match container
    if (barRef.current) {
      const containerRect = barRef.current.getBoundingClientRect();
      // Use a higher resolution for sharper gradients
      const scale = window.devicePixelRatio || 1;
      canvas.width = containerRect.width * scale;
      canvas.height = height * scale;

      // Scale down with CSS to match container size
      canvas.style.width = `${containerRect.width}px`;
      canvas.style.height = `${height}px`;
    }

    // Render the gradient to the canvas
    renderGradientToCanvas(canvas, sortedStops, gradientMode);
  }, [sortedStops, gradientMode, height]);

  // Handle stop selection
  const handleStopClick = (stop: EnhancedColorStop, e: MouseEvent) => {
    e.stopPropagation();
    setActiveStopId(stop.id);
  };

  // Handle adding a new color stop
  const handleBarClick = (e: MouseEvent) => {
    // Skip if we just finished dragging to prevent creating unwanted stops
    if (justFinishedDragging.current) {
      justFinishedDragging.current = false;
      return;
    }

    // Don't add if we've reached max stops or are dragging
    if (enhancedStops.length >= maxStops || isDragging) return;

    const bar = barRef.current;
    if (!bar) return;

    // Calculate position based on click location
    const rect = bar.getBoundingClientRect();
    const position = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );

    // Determine closest existing stop's color for new stop
    const getClosestStopColor = (pos: number): string => {
      if (sortedStops.length === 0) return "#ffffff";

      return sortedStops.reduce((prev, curr) =>
        Math.abs(curr.position - pos) < Math.abs(prev.position - pos)
          ? curr
          : prev
      ).color;
    };

    // Create new stop with a unique ID
    const newStop: EnhancedColorStop = {
      position,
      color: getClosestStopColor(position),
      id: generateId(),
    };

    // Add stop to local state
    const newEnhancedStops = [...enhancedStops, newStop];
    setEnhancedStops(newEnhancedStops);

    // Notify parent with standard ColorStop objects
    const newStops = newEnhancedStops.map(({ position, color }) => ({
      position,
      color,
    }));
    onChange(newStops);

    // Set new stop as active
    setActiveStopId(newStop.id);
  };

  // Update stop position during dragging
  const updateStopPosition = (
    clientX: number,
    currentDragId: string | null
  ) => {
    if (!isDraggingRef.current || !currentDragId || !barRef.current) {
      return;
    }

    // Find the current index of the drag stop by ID
    const dragStopIndex = enhancedStops.findIndex(
      (stop) => stop.id === currentDragId
    );

    if (dragStopIndex === -1) return;

    // Calculate new position
    const rect = barRef.current.getBoundingClientRect();
    const position = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width)
    );

    // Create new stops array with updated position
    const newEnhancedStops = enhancedStops.map((stop) =>
      stop.id === currentDragId ? { ...stop, position } : stop
    );

    // Update local state
    setEnhancedStops(newEnhancedStops);

    // Notify parent with standard ColorStop objects
    const newStops = newEnhancedStops.map(({ position, color }) => ({
      position,
      color,
    }));
    onChange(newStops);
  };

  // Handle start dragging
  const handleMouseDown = (stop: EnhancedColorStop, e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent text selection during drag

    // Update both state and refs for drag tracking
    setIsDragging(true);
    isDraggingRef.current = true;

    setDragStopId(stop.id);
    dragStopIdRef.current = stop.id;

    setActiveStopId(stop.id);

    // Create handlers that close over the current state
    const handleMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();

      // Use the ref value for drag stop ID to avoid closure issues
      updateStopPosition(moveEvent.clientX, dragStopIdRef.current);
    };

    const handleEnd = (endEvent: MouseEvent) => {
      endEvent.preventDefault();
      endEvent.stopPropagation(); // Prevent the click event on the bar

      // Update both state and refs
      setIsDragging(false);
      isDraggingRef.current = false;

      setDragStopId(null);
      dragStopIdRef.current = null;

      // Set the flag to prevent immediate click handling
      justFinishedDragging.current = true;

      // Reset the flag after a short delay
      setTimeout(() => {
        justFinishedDragging.current = false;
      }, 100);

      // Remove all event listeners
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
    };

    // Store handlers in refs for cleanup
    mouseMoveHandlerRef.current = handleMove;
    mouseUpHandlerRef.current = handleEnd;

    // Add mouse event listeners
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
  };

  // Handle color change
  const handleColorChange = (color: string) => {
    if (activeStopIndex === null) return;

    // Update color in enhanced stops
    const newEnhancedStops = enhancedStops.map((stop) =>
      stop.id === activeStopId ? { ...stop, color } : stop
    );
    setEnhancedStops(newEnhancedStops);

    // Notify parent with standard ColorStop objects
    const newStops = newEnhancedStops.map(({ position, color }) => ({
      position,
      color,
    }));
    onChange(newStops);
  };

  // Handle removing a stop
  const handleRemoveStop = (stop: EnhancedColorStop, e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Don't allow removing if we only have one stop
    if (enhancedStops.length <= 1) return;

    // Remove stop by ID
    const newEnhancedStops = enhancedStops.filter((s) => s.id !== stop.id);
    setEnhancedStops(newEnhancedStops);

    // Notify parent with standard ColorStop objects
    const newStops = newEnhancedStops.map(({ position, color }) => ({
      position,
      color,
    }));
    onChange(newStops);

    // Clear selection if active stop was removed
    if (activeStopId === stop.id) {
      setActiveStopId(null);
    }
  };

  // Clean up event listeners
  useEffect(() => {
    return () => {
      // Use the handler refs to ensure we're removing the correct handlers
      if (mouseMoveHandlerRef.current) {
        document.removeEventListener("mousemove", mouseMoveHandlerRef.current);
      }

      if (mouseUpHandlerRef.current) {
        document.removeEventListener("mouseup", mouseUpHandlerRef.current);
      }
    };
  }, []);

  return (
    <div className={`${styles.gradientBarContainer} ${className}`}>
      {/* Gradient bar */}
      <div
        ref={barRef}
        className={`${styles.gradientBar} ${
          enhancedStops.length >= maxStops ? styles.gradientBarNoPointer : ""
        }`}
        style={{
          background: gradientStyle,
          height: `${height}px`,
        }}
        onClick={(e) => handleBarClick(e as MouseEvent)}
      >
        {/* Canvas for gradient modes that need rendering */}
        {needsCanvasRendering(gradientMode) && (
          <canvas ref={canvasRef} className={styles.gradientCanvas} />
        )}

        {/* Color stops */}
        {sortedStops.map((stop) => {
          const isActive = activeStopId === stop.id;
          const isDraggingThis = isDragging && dragStopId === stop.id;

          const stopClassNames = [
            styles.gradientStop,
            isActive ? styles.active : "",
            isDraggingThis ? styles.dragging : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div
              key={stop.id}
              className={stopClassNames}
              style={{
                left: `${stop.position * 100}%`,
                backgroundColor: stop.color,
              }}
              onClick={(e) => handleStopClick(stop, e as MouseEvent)}
              onMouseDown={(e) => handleMouseDown(stop, e as MouseEvent)}
            >
              {/* Remove button (visible on active stop) */}
              {isActive && enhancedStops.length > 1 && (
                <button
                  className={styles.removeButton}
                  onClick={(e) => handleRemoveStop(stop, e as MouseEvent)}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected stop color picker */}
      {activeStop && (
        <div className={styles.colorPickerContainer}>
          <ColorInput
            value={activeStop.color}
            onChange={handleColorChange}
            debounce={5}
          />
          <div className={styles.positionIndicator}>
            Position: {Math.round(activeStop.position * 100)}%
          </div>
        </div>
      )}
    </div>
  );
};

export { GradientBar };

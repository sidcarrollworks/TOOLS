import type { FunctionComponent } from "preact";
import { useRef, useState, useEffect, useMemo } from "preact/hooks";
import { MAX_COLOR_STOPS } from "../../lib/types/ColorStop";
import type { ColorStop } from "../../lib/types/ColorStop";
import { GradientMode } from "../../lib/types/ColorStop";
import { X } from "../UI/Icons";
import {
  getCSSGradientStyle,
  renderGradientToCanvas,
} from "../../lib/modules/GradientRenderer";
import styles from "./GradientBar.module.css";
import colorPickerService from "./ColorPickerService";

// Create a global flag to track if color picker interactions are happening
// This will be used to prevent polling during color picker interactions
let isColorPickerInteracting = false;
export const setColorPickerInteracting = (value: boolean) => {
  isColorPickerInteracting = value;
  console.log(`[Global] Color picker interaction state: ${value}`);
};
export const getColorPickerInteracting = (): boolean =>
  isColorPickerInteracting;

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

  // Ref for the entire component
  const componentRef = useRef<HTMLDivElement>(null);

  // Track last mousedown target for deselection
  const lastMouseDownTargetRef = useRef<EventTarget | null>(null);

  // Initialize enhanced stops from props
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

  // Handle document click listener for deselection
  useEffect(() => {
    // This handler will check for clicks outside the GradientBar when a color stop is active
    // but the color picker is NOT open (since ColorPickerService handles that case now)
    const handleOutsideClick = (event: MouseEvent) => {
      // Skip if no active stop (nothing to deselect)
      if (!activeStopId) return;

      // Skip during drag operations
      if (isDragging || isDraggingRef.current || justFinishedDragging.current) {
        // If we just finished dragging, reset that flag
        if (justFinishedDragging.current) {
          justFinishedDragging.current = false;
          isDraggingRef.current = false;
        }
        return;
      }

      // Skip if the color picker is open - it will handle outside clicks itself
      if (colorPickerService.isOpen()) {
        return;
      }

      // Skip if click is inside the gradient bar
      const isInGradientBar = !!(
        componentRef.current &&
        componentRef.current.contains(event.target as Node)
      );
      if (isInGradientBar) return;

      // We've confirmed this is a click outside the gradient bar and the picker is not open
      // Time to deselect the active stop
      if (process.env.NODE_ENV === "development") {
        console.log(
          "[GradientBar] Outside click detected - deselecting stop",
          activeStopId
        );
      }

      setActiveStopId(null);
    };

    // Use mousedown instead of click for better responsiveness
    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [activeStopId, isDragging]);

  // Sort color stops by position for rendering
  const sortedStops = [...enhancedStops].sort(
    (a, b) => a.position - b.position
  );

  // Find currently active/selected color stop
  const activeStop = activeStopId
    ? enhancedStops.find((stop) => stop.id === activeStopId) || null
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

  // Handle stop selection and show color picker
  const handleStopClick = (stop: EnhancedColorStop, e: MouseEvent) => {
    // Make sure clicks on the stop don't bubble up and trigger outside click handlers
    e.preventDefault();
    e.stopPropagation();

    // Set the active stop
    setActiveStopId(stop.id);

    // Get the position of the color stop in the gradient bar
    if (barRef.current) {
      const barRect = barRef.current.getBoundingClientRect();
      const stopPosX = barRect.left + stop.position * barRect.width;

      // Position the color picker to be centered above the color stop
      const pickerPos = {
        x: stopPosX - 100, // Center based on 200px width
        y: barRect.top - 245, // Estimate popover height (approx 235px) + 10px gap
      };

      // Only open color picker if not dragging
      if (!isDragging) {
        colorPickerService.openPicker({
          position: pickerPos,
          color: stop.color,
          onColorChange: handleColorPickerChange,
          onOutsideClick: () => {
            if (process.env.NODE_ENV === "development") {
              console.log(
                "[GradientBar] ColorPicker outside click - deselecting stop"
              );
            }
            setActiveStopId(null);
          },
          onDelete: () => {
            handleRemoveStop(stop, e);
            setActiveStopId(null);
          },
        });
      }
    }
  };

  // Handle adding a new color stop
  const handleBarClick = (e: MouseEvent) => {
    // Close any open color picker when clicking on the bar
    colorPickerService.closePicker(false);

    // Skip if we just finished dragging
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
    if (process.env.NODE_ENV === "development") {
      console.log("[GradientBar] Mouse down on stop", {
        stopId: stop.id,
        activeStopId,
      });
    }
    e.stopPropagation();
    e.preventDefault(); // Prevent text selection during drag

    // Close color picker when starting to drag
    colorPickerService.closePicker(false);

    // Update both state and refs for drag tracking
    setIsDragging(true);
    isDraggingRef.current = true;
    justFinishedDragging.current = false; // Reset the flag

    setDragStopId(stop.id);
    dragStopIdRef.current = stop.id;

    setActiveStopId(stop.id);

    // Create handlers that close over the current state
    const handleMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();

      // Use the ref value for drag stop ID to avoid closure issues
      updateStopPosition(moveEvent.clientX, dragStopIdRef.current);
    };

    const handleEnd = (endEvent: MouseEvent) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[GradientBar] Mouse up after drag", {
          isDraggingBefore: isDragging,
          isDraggingRefBefore: isDraggingRef.current,
        });
      }
      endEvent.preventDefault();
      endEvent.stopPropagation(); // Prevent the click event from bubbling

      // Set the flag that will prevent the outside click handler from processing this as a click
      justFinishedDragging.current = true;

      // Remove all event listeners first
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);

      // Update state for UI rendering
      setIsDragging(false);
      setDragStopId(null);

      // Update drag ref - keep this in sync
      dragStopIdRef.current = null;

      // We'll reset justFinishedDragging in the outside click handler
      // on the next legitimate click

      if (process.env.NODE_ENV === "development") {
        console.log("[GradientBar] Drag state after update", {
          isDragging: false,
          isDraggingRef: isDraggingRef.current,
          justFinishedDragging: true,
        });
      }
    };

    // Store handlers in refs for cleanup
    mouseMoveHandlerRef.current = handleMove;
    mouseUpHandlerRef.current = handleEnd;

    // Add mouse event listeners
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
  };

  // Handle color change from the color picker
  const handleColorPickerChange = (color: string) => {
    if (process.env.NODE_ENV === "development") {
      console.log("[GradientBar] Color picker changed", {
        activeStopId,
        color,
      });
    }
    if (!activeStop) return;

    // Skip if the color hasn't actually changed
    if (activeStop.color === color) return;

    // Update color in local state
    const newEnhancedStops = enhancedStops.map((stop) =>
      stop.id === activeStop.id ? { ...stop, color } : stop
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
    // Prevent any event bubbling that could trigger other handlers
    e.preventDefault();
    e.stopPropagation();

    // Don't allow removing if we only have one stop
    if (enhancedStops.length <= 1) return;

    // Close color picker
    colorPickerService.closePicker(false);

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
      // Close the color picker
      colorPickerService.closePicker(false);

      // Use the handler refs to ensure we're removing the correct handlers
      if (mouseMoveHandlerRef.current) {
        document.removeEventListener("mousemove", mouseMoveHandlerRef.current);
      }

      if (mouseUpHandlerRef.current) {
        document.removeEventListener("mouseup", mouseUpHandlerRef.current);
      }
    };
  }, []);

  // Track state changes
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[GradientBar] isDragging state changed:", isDragging);
    }
    // Sync the ref with the state
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[GradientBar] activeStopId changed:", activeStopId);
    }
  }, [activeStopId]);

  return (
    <div
      ref={componentRef}
      className={`${styles.gradientBarContainer} ${className}`}
    >
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
            />
          );
        })}
      </div>
    </div>
  );
};

export { GradientBar };

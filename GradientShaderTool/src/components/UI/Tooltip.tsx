import type { FunctionComponent } from "preact";
import { useRef, useState, useEffect } from "preact/hooks";
import { cloneElement } from "preact";
import { signal } from "@preact/signals";
import styles from "./Tooltip.module.css";
import TooltipPortal from "./TooltipPortal";

// Global tooltip tracking
const activeTooltipId = signal<string | null>(null);

// Creates a global registry for tooltip timeouts
const tooltipTimeouts: Record<string, number> = {};

// Function to clear any pending tooltip timeout
function clearTooltipTimeout(id: string) {
  if (tooltipTimeouts[id]) {
    window.clearTimeout(tooltipTimeouts[id]);
    delete tooltipTimeouts[id];
  }
}

export interface TooltipProps {
  /**
   * The content to display inside the tooltip
   */
  content: string | preact.JSX.Element;

  /**
   * Optional title for the tooltip
   */
  title?: string;

  /**
   * Optional CSS class for the tooltip container
   */
  className?: string;

  /**
   * Optional position for the tooltip
   * @default "top"
   */
  position?: "top" | "bottom" | "left" | "right";

  /**
   * Optional delay before showing the tooltip (in ms)
   * @default 300
   */
  delay?: number;

  /**
   * The children element that triggers the tooltip
   */
  children: preact.JSX.Element;
}

/**
 * A tooltip component that appears when hovering over an element
 */
export const Tooltip: FunctionComponent<TooltipProps> = ({
  content,
  title,
  className = "",
  position = "top",
  delay = 300,
  children,
}) => {
  // Add a debug ID to help track individual tooltip instances
  const tooltipId = useRef(
    `tooltip-${Math.random().toString(36).substring(2, 9)}`
  ).current;

  // State to track if tooltip is visible
  const [isVisible, setIsVisible] = useState(false);
  // Ref for the trigger element
  const triggerRef = useRef<HTMLDivElement>(null);
  // Ref for the tooltip element
  const tooltipRef = useRef<HTMLDivElement>(null);
  // Add a ref to track if we're currently positioning the tooltip
  const isPositioningRef = useRef(false);

  // Show tooltip after delay
  const handleMouseEnter = () => {
    // Clear any existing timeout for this tooltip
    clearTooltipTimeout(tooltipId);

    // Set new timeout to show the tooltip
    tooltipTimeouts[tooltipId] = window.setTimeout(() => {
      // If there's another active tooltip, hide it
      if (activeTooltipId.value && activeTooltipId.value !== tooltipId) {
        // Find the other active tooltip and hide it
        const event = new CustomEvent("tooltip-hide", {
          detail: { id: activeTooltipId.value },
        });
        window.dispatchEvent(event);
      }

      // Set this tooltip as active
      activeTooltipId.value = tooltipId;
      setIsVisible(true);
    }, delay);
  };

  // Hide tooltip
  const handleMouseLeave = () => {
    // Clear any timeout for this tooltip
    clearTooltipTimeout(tooltipId);

    // If this is the active tooltip, hide it with a short delay
    // This delay gives the positioning code time to complete
    if (activeTooltipId.value === tooltipId) {
      tooltipTimeouts[tooltipId] = window.setTimeout(() => {
        activeTooltipId.value = null;
        setIsVisible(false);
      }, 50);
    }
  };

  // Handle global hide events for this tooltip
  useEffect(() => {
    const handleHideEvent = (event: CustomEvent) => {
      if (event.detail.id === tooltipId) {
        setIsVisible(false);
      }
    };

    window.addEventListener("tooltip-hide", handleHideEvent as EventListener);

    return () => {
      window.removeEventListener(
        "tooltip-hide",
        handleHideEvent as EventListener
      );
      clearTooltipTimeout(tooltipId);

      // If this was the active tooltip, clear it
      if (activeTooltipId.value === tooltipId) {
        activeTooltipId.value = null;
      }
    };
  }, [tooltipId]);

  // Position the tooltip relative to the trigger element
  const positionTooltip = () => {
    if (!triggerRef.current || !tooltipRef.current) {
      return;
    }

    isPositioningRef.current = true;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipStyle = tooltipRef.current.style;

    // Force an immediate calculation of the tooltip dimensions
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    // Use real dimensions from getBoundingClientRect
    const width = tooltipRect.width || 200; // Fallback width if calculation is 0
    const height = tooltipRect.height || 50; // Fallback height if calculation is 0

    // Calculate position based on trigger element and tooltip dimensions
    switch (position) {
      case "top":
        tooltipStyle.top = `${triggerRect.top - height - 8}px`;
        tooltipStyle.left = `${
          triggerRect.left + triggerRect.width / 2 - width / 2
        }px`;
        break;
      case "bottom":
        tooltipStyle.top = `${triggerRect.bottom + 8}px`;
        tooltipStyle.left = `${
          triggerRect.left + triggerRect.width / 2 - width / 2
        }px`;
        break;
      case "left":
        tooltipStyle.top = `${
          triggerRect.top + triggerRect.height / 2 - height / 2
        }px`;
        tooltipStyle.left = `${triggerRect.left - width - 8}px`;
        break;
      case "right":
        tooltipStyle.top = `${
          triggerRect.top + triggerRect.height / 2 - height / 2
        }px`;
        tooltipStyle.left = `${triggerRect.right + 8}px`;
        break;
    }

    // Critical: a small delay before making the tooltip visible ensures it's properly positioned
    setTimeout(() => {
      if (tooltipRef.current && activeTooltipId.value === tooltipId) {
        // Use direct style manipulation
        tooltipRef.current.style.opacity = "1";
      }
    }, 20);

    // Add a slight delay before allowing mouse leave events again
    setTimeout(() => {
      isPositioningRef.current = false;
    }, 100);
  };

  // Simplified positioning approach
  useEffect(() => {
    if (isVisible && triggerRef.current) {
      // Position tooltip on next frame to ensure DOM is updated
      requestAnimationFrame(() => {
        positionTooltip();
      });
    }
  }, [isVisible, position]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTooltipTimeout(tooltipId);

      // If this was the active tooltip, clear it
      if (activeTooltipId.value === tooltipId) {
        activeTooltipId.value = null;
      }
    };
  }, []);

  // Clone the child element and add event handlers and styling
  const triggerElement = (() => {
    // Clone the children with additional props
    let enhancedChild = children;

    try {
      // If the child is a simple element like span, div, label, etc.
      if (typeof children.type === "string") {
        // For HTML elements
        enhancedChild = cloneElement(children, {
          className: `${children.props.className || ""} ${
            styles.tooltipTriggerContent
          }`.trim(),
        });
      } else {
        // For custom components, we need different handling
        // Check if it has string children that we can wrap
        if (children.props.children) {
          if (typeof children.props.children === "string") {
            // If child content is just text, wrap it
            enhancedChild = cloneElement(children, {
              children: (
                <span className={styles.tooltipTriggerContent}>
                  {children.props.children}
                </span>
              ),
            });
          } else if (Array.isArray(children.props.children)) {
            // For array children, leave it as is
            enhancedChild = cloneElement(children, {
              className: `${children.props.className || ""} has-tooltip`.trim(),
            });
          } else if (typeof children.props.children === "object") {
            // If it's a single child object, try to style it
            try {
              // Try to clone the child's first child with our styling
              enhancedChild = cloneElement(children, {
                children: cloneElement(children.props.children, {
                  className: `${
                    children.props.children.props?.className || ""
                  } ${styles.tooltipTriggerContent}`.trim(),
                }),
              });
            } catch (err) {
              // If that fails, just add a class to the parent
              enhancedChild = cloneElement(children, {
                className: `${
                  children.props.className || ""
                } has-tooltip`.trim(),
              });
            }
          }
        } else {
          // If it doesn't have children, just add a class to help with styling
          enhancedChild = cloneElement(children, {
            className: `${children.props.className || ""} has-tooltip`.trim(),
          });
        }
      }
    } catch (err) {
      // If we encounter any errors during enhancement, use the original children
      enhancedChild = children;
    }

    return (
      <div
        ref={triggerRef}
        className={styles.tooltipTrigger}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-tooltip-id={tooltipId}
      >
        {enhancedChild}
      </div>
    );
  })();

  return (
    <div className={`${styles.tooltipContainer} ${className}`}>
      {triggerElement}

      {isVisible && (
        <TooltipPortal>
          <div
            ref={tooltipRef}
            className={`${styles.tooltip} ${styles[position]}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              position: "fixed", // Use fixed positioning for portal
              opacity: "0", // Start invisible
              zIndex: 9999,
              transition: "opacity 0.1s ease-out",
            }}
            data-tooltip-id={tooltipId}
          >
            {title && <div className={styles.tooltipTitle}>{title}</div>}
            <div className={styles.tooltipContent}>{content}</div>
          </div>
        </TooltipPortal>
      )}
    </div>
  );
};

export default Tooltip;

import type { FunctionComponent } from "preact";
import { createPortal } from "preact/compat";
import { useEffect, useRef, useState } from "preact/hooks";
import { cloneElement } from "preact";

interface TooltipPortalProps {
  children: preact.JSX.Element;
}

/**
 * A portal component that renders tooltips at the root level of the DOM
 * to prevent them from being clipped by parent containers with overflow settings.
 */
export const TooltipPortal: FunctionComponent<TooltipPortalProps> = ({
  children,
}) => {
  // State to track if we're rendering on the client
  const [isMounted, setIsMounted] = useState(false);

  // Generate an ID for this portal instance
  const portalId = useRef(
    `portal-${Math.random().toString(36).substring(2, 9)}`
  ).current;

  // Create a ref for the container
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize portal container on mount
  useEffect(() => {
    console.log(`[${portalId}] TooltipPortal mounting`);

    // Set mounted flag
    setIsMounted(true);

    // Check if a portal container already exists
    let container = document.getElementById("tooltip-portal-container");

    // If not, create one
    if (!container) {
      console.log(`[${portalId}] Creating new tooltip portal container`);
      container = document.createElement("div");
      container.id = "tooltip-portal-container";

      // Set styles for the container to cover the entire viewport
      // but not interfere with normal pointer events
      Object.assign(container.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        pointerEvents: "none", // Important: don't capture mouse events on the container
        zIndex: "9999",
        overflow: "visible",
      });

      // Add the container to the document body
      document.body.appendChild(container);

      console.log(
        `[${portalId}] Tooltip portal container created and added to DOM`
      );
    } else {
      console.log(`[${portalId}] Using existing tooltip portal container`);
    }

    // Store the container reference
    containerRef.current = container as HTMLDivElement;

    // Clean up on unmount
    return () => {
      console.log(`[${portalId}] TooltipPortal unmounting`);

      // Check if the child has a data-tooltip-id attribute
      const tooltipId = (children as any)?.props?.["data-tooltip-id"];
      if (tooltipId) {
        // Dispatch a hide event for this tooltip to ensure it's properly cleaned up
        const event = new CustomEvent("tooltip-hide", {
          detail: { id: tooltipId },
        });
        window.dispatchEvent(event);
      }

      // We don't remove the container as other tooltips might still need it
    };
  }, []);

  // If not mounted or no container, don't render anything
  if (!isMounted || !containerRef.current) {
    console.log(`[${portalId}] Portal not ready yet (mounted: ${isMounted})`);
    return null;
  }

  // We need to carefully clone the children while preserving all styling properties
  // but ensure pointer events are properly set
  let childStyle = { ...(children.props.style || {}) };

  // Ensure pointer-events is set to auto
  childStyle.pointerEvents = "auto";

  // Create a clone with our modified style
  const enhancedChildren = cloneElement(children, {
    style: childStyle,
  });

  console.log(`[${portalId}] Rendering tooltip into portal:`, enhancedChildren);

  // Create portal with the enhanced children
  return createPortal(enhancedChildren, containerRef.current);
};

export default TooltipPortal;

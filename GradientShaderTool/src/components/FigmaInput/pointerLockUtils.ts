// Cursor and pointer lock utilities for FigmaInput component
import { getActiveInstance } from "./instanceManager";

// Custom cursor SVG as a data URL
export const cursorSvgDataUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='19' height='11' viewBox='0 0 19 11' fill='none'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M0.5 5.15837V5.16267L5.66494 10.3268L5.66581 6.8826H10.2487H13.8497V10.3276L19 5.15923L13.8497 -0.00743954L13.8506 3.45394L10.2487 3.45567H5.66494L5.66581 -0.00830078L0.5 5.15837ZM1.71523 5.16095L4.80455 2.07077L4.80369 4.29883H10.2487H14.7118V2.07249L17.7822 5.16095L14.7127 8.24855L14.7118 6.0222H10.2487L4.80455 6.02134L4.80369 8.24855L1.71523 5.16095Z' fill='white'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M7.81818 6.02177H14.7119V8.24898L17.7823 5.16052L14.7119 2.07292V4.31649H7.81818H4.80379V2.0712L1.71533 5.16052L4.80379 8.24898V6.02091L7.81818 6.02177Z' fill='black'/%3E%3C/svg%3E`;

// Create a single shared overlay element for all instances
let dragOverlay: HTMLDivElement | null = null;
let virtualCursor: HTMLDivElement | null = null;

// Create a direct style tag for ensuring consistent cursor
export const ensureCursorStyle = () => {
  const styleId = "figma-input-drag-style";
  if (document.getElementById(styleId)) return;

  const styleTag = document.createElement("style");
  styleTag.id = styleId;
  styleTag.textContent = `
    html.figma-input-dragging-active,
    html.figma-input-dragging-active *,
    body.figma-input-dragging-active,
    body.figma-input-dragging-active * {
      cursor: none !important;
      user-select: none !important;
    }
    
    .figma-input-drag-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 9999 !important;
      background-color: transparent !important;
      cursor: none !important;
      user-select: none !important;
      pointer-events: all !important;
      touch-action: none !important;
    }
    
    .figma-input-virtual-cursor {
      position: fixed !important;
      width: 19px !important;
      height: 11px !important;
      pointer-events: none !important;
      z-index: 10000 !important;
      transform: translate(-50%, -50%) !important;
      background-image: url("${cursorSvgDataUrl}");
      background-position: center !important;
      background-repeat: no-repeat !important;
      background-size: contain !important;
      filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.5)) !important;
    }
    
    /* Add cursor hiding style for entire document during pointer lock */
    html.figma-input-pointer-lock-active,
    html.figma-input-pointer-lock-active * {
      cursor: none !important;
    }
  `;

  document.head.appendChild(styleTag);
};

// Initialize the overlay element
export const initDragOverlay = () => {
  if (dragOverlay) return dragOverlay;

  // Ensure the cursor style is added
  ensureCursorStyle();

  dragOverlay = document.createElement("div");
  dragOverlay.className = "figma-input-drag-overlay";

  // Apply all styles directly to the element
  Object.assign(dragOverlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    zIndex: "9999",
    backgroundColor: "transparent",
    cursor: "none",
    userSelect: "none",
    pointerEvents: "all",
    touchAction: "none",
    display: "none",
  });

  document.body.appendChild(dragOverlay);

  // Verify the overlay was added to the DOM
  if (!document.body.contains(dragOverlay)) {
    console.error("Failed to append drag overlay to document body");
    return null;
  }

  return dragOverlay;
};

// Initialize virtual cursor element
export const initVirtualCursor = () => {
  // If the cursor already exists, remove it first to avoid duplicates
  if (virtualCursor) {
    try {
      document.body.removeChild(virtualCursor);
    } catch (e) {
      // Ignore if not in DOM
    }
    virtualCursor = null;
  }

  // Create a new cursor element
  virtualCursor = document.createElement("div");
  virtualCursor.className = "figma-input-virtual-cursor";

  // Style the virtual cursor
  Object.assign(virtualCursor.style, {
    position: "fixed",
    width: "19px",
    height: "11px",
    pointerEvents: "none",
    zIndex: "10000",
    transform: "translate(-50%, -50%)",
    backgroundImage: `url("${cursorSvgDataUrl}")`,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
    filter: "drop-shadow(0 0 1px rgba(0, 0, 0, 0.5))",
    display: "none",
  });

  document.body.appendChild(virtualCursor);
  return virtualCursor;
};

// Position the virtual cursor
export const positionVirtualCursor = (x: number, y: number) => {
  // Ensure cursor exists
  const cursor = virtualCursor || initVirtualCursor();
  if (!cursor) {
    console.warn("⚠️ Failed to initialize virtual cursor");
    return;
  }

  // Update position and ensure it's visible
  cursor.style.left = `${x}px`;
  cursor.style.top = `${y}px`;
  cursor.style.display = "block";
};

// Hide the virtual cursor
export const hideVirtualCursor = () => {
  if (virtualCursor) {
    virtualCursor.style.display = "none";
  }
};

// Check if Pointer Lock API is supported by the browser
export const isPointerLockSupported = () => {
  return (
    "pointerLockElement" in document ||
    "mozPointerLockElement" in document ||
    "webkitPointerLockElement" in document
  );
};

// Helper function to get the current pointer lock element with vendor prefixes
export const getPointerLockElement = (): Element | null => {
  return (
    document.pointerLockElement ||
    (document as any).mozPointerLockElement ||
    (document as any).webkitPointerLockElement
  );
};

// Helper function to exit pointer lock with vendor prefixes
export const exitPointerLock = () => {
  try {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    } else if ((document as any).mozExitPointerLock) {
      (document as any).mozExitPointerLock();
    } else if ((document as any).webkitExitPointerLock) {
      (document as any).webkitExitPointerLock();
    }
  } catch (err) {
    console.error("❌ Error exiting pointer lock:", err);
  }
};

// Helper function to request pointer lock with vendor prefixes
export const requestPointerLock = (element: Element) => {
  try {
    // Only request if we don't already have a pointer lock
    if (!getPointerLockElement()) {
      if (element.requestPointerLock) {
        element.requestPointerLock();
      } else if ((element as any).mozRequestPointerLock) {
        (element as any).mozRequestPointerLock();
      } else if ((element as any).webkitRequestPointerLock) {
        (element as any).webkitRequestPointerLock();
      }
    }
  } catch (err) {
    console.error("❌ Error requesting pointer lock:", err);
  }
};

// Force cursor to be visible
export const forceCursorVisible = () => {
  document.documentElement.classList.remove("figma-input-pointer-lock-active");
  document.documentElement.classList.remove("figma-input-dragging-active");
  document.body.classList.remove("figma-input-dragging-active");

  // Force cursor to be visible with a temporary style
  const styleElement = document.createElement("style");
  styleElement.textContent = "* { cursor: auto !important; }";
  document.head.appendChild(styleElement);

  // Remove the style element after a short delay
  setTimeout(() => {
    if (styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
  }, 100);
};

// Set pointer lock active state
export const setPointerLockActiveState = (active: boolean) => {
  if (active) {
    document.documentElement.classList.add("figma-input-pointer-lock-active");
  } else {
    document.documentElement.classList.remove("figma-input-pointer-lock-active");
  }
}; 
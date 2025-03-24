import type { ComponentChildren, JSX } from "preact";
import { useRef, useState, useEffect, useCallback } from "preact/hooks";
import { createPortal } from "preact/compat";
import styles from "./Select.module.css";

// Create a simple state management system
type SelectState = {
  open: boolean;
  selectedValue: string;
  selectedLabel: string;
  triggerRect: DOMRect | null;
  focusedIndex: number;
};

type SelectActions = {
  setOpen: (open: boolean) => void;
  setValue: (value: string, label: string) => void;
  setTriggerRect: (rect: DOMRect | null) => void;
  setFocusedIndex: (index: number) => void;
};

// Create a global store for each select instance
const selectStores = new Map<
  string,
  { state: SelectState; actions: SelectActions }
>();

// Helper function for safe querySelector with optional selectId
function safeQuerySelector(
  selectId: string | undefined,
  attributeName: string,
  attributeValue: string
): Element | null {
  if (!selectId) return null;
  const selector = `[${attributeName}="${attributeValue}"]`;
  return document.querySelector(selector);
}

// Root component
function Root({
  children,
  value,
  defaultValue,
  onValueChange,
}: {
  children: ComponentChildren;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  // Generate a unique ID for this select instance
  const [id] = useState(() => Math.random().toString(36).substring(2, 9));
  const rootRef = useRef<HTMLDivElement>(null);

  // Initialize the store if it doesn't exist
  if (!selectStores.has(id)) {
    selectStores.set(id, {
      state: {
        open: false,
        selectedValue: value || defaultValue || "",
        selectedLabel: "",
        triggerRect: null,
        focusedIndex: -1,
      },
      actions: {
        setOpen: (open: boolean) => {
          const store = selectStores.get(id);
          if (store) {
            // Only update if the state is actually changing
            if (store.state.open !== open) {
              store.state.open = open;
              // Reset focused index when closing
              if (!open) {
                store.state.focusedIndex = -1;
              }
              // Force re-render by updating a data attribute on the root element
              if (rootRef.current) {
                rootRef.current.setAttribute("data-open", open.toString());
              }
            }
          }
        },
        setValue: (newValue: string, label: string) => {
          const store = selectStores.get(id);
          if (store) {
            store.state.selectedValue = newValue;
            store.state.selectedLabel = label;
            store.state.open = false;
            onValueChange?.(newValue);
            // Force re-render
            if (rootRef.current) {
              rootRef.current.setAttribute("data-value", newValue);
              // Ensure the dropdown is marked as closed

              rootRef.current.setAttribute("data-open", "false");

              // Also update any content elements to ensure they close
              const contentElement = safeQuerySelector(
                id,
                "data-select-content-id",
                id
              );
              if (contentElement) {
                contentElement.setAttribute("data-open", "false");
              }
            }
          }
        },
        setTriggerRect: (rect: DOMRect | null) => {
          const store = selectStores.get(id);
          if (store) {
            store.state.triggerRect = rect;
          }
        },
        setFocusedIndex: (index: number) => {
          const store = selectStores.get(id);
          if (store) {
            store.state.focusedIndex = index;
            // Force re-render
            if (rootRef.current) {
              rootRef.current.setAttribute(
                "data-focused-index",
                index.toString()
              );
            }
          }
        },
      },
    });
  }

  // Update the store when the value prop changes
  useEffect(() => {
    if (value !== undefined) {
      const store = selectStores.get(id);
      if (store && store.state.selectedValue !== value) {
        store.state.selectedValue = value;
      }
    }
  }, [id, value]);

  // Clean up the store when the component unmounts
  useEffect(() => {
    return () => {
      selectStores.delete(id);
    };
  }, [id]);

  // Clone children with the select ID
  const childrenWithId = Array.isArray(children)
    ? children.map((child) => {
        if (typeof child === "object" && child !== null && "type" in child) {
          return {
            ...child,
            props: {
              ...child.props,
              selectId: id,
            },
          };
        }
        return child;
      })
    : typeof children === "object" && children !== null && "type" in children
    ? {
        ...children,
        props: {
          ...children.props,
          selectId: id,
        },
      }
    : children;

  return (
    <div ref={rootRef} class={styles.root} data-select-id={id}>
      {childrenWithId}
    </div>
  );
}

// Trigger component
function Trigger({
  children,
  className,
  selectId = "", // Provide a default empty string to fix type issues
  ...props
}: {
  children?: ComponentChildren;
  className?: string;
  selectId?: string;
} & JSX.HTMLAttributes<HTMLButtonElement>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Add a ref to track if a click is being processed
  const isProcessingClickRef = useRef(false);
  // Add a counter to track click events
  const clickCountRef = useRef(0);

  // Create a mousedown handler to set a flag before any other events
  const handleMouseDown = (
    event: JSX.TargetedMouseEvent<HTMLButtonElement>
  ) => {
    // Set the flag to indicate we're about to process a click on the trigger
    isProcessingClickRef.current = true;

    // Stop propagation to prevent any parent handlers from interfering
    event.stopPropagation();
  };

  const handleClick = (event: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    const clickId = ++clickCountRef.current;

    if (!selectId) {
      return;
    }

    const store = selectStores.get(selectId);
    if (!store) {
      return;
    }

    // Get the current state directly from the store
    const isCurrentlyOpen = store.state.open;

    // Update the trigger position
    if (triggerRef.current) {
      store.actions.setTriggerRect(triggerRef.current.getBoundingClientRect());
    }

    // Set the opposite state (close if open, open if closed)
    const newState = !isCurrentlyOpen;
    store.actions.setOpen(newState);

    // Force update the content element with the new state
    const contentElement = safeQuerySelector(
      selectId,
      "data-select-content-id",
      selectId
    );

    if (contentElement) {
      contentElement.setAttribute("data-open", newState.toString());
    }

    // Stop propagation to prevent any parent handlers from interfering
    event.stopPropagation();

    // Clear the processing flag after a short delay to allow other handlers to check it
    setTimeout(() => {
      isProcessingClickRef.current = false;
    }, 0);
  };

  // Add keyboard event handler for the trigger
  const handleKeyDown = (
    event: JSX.TargetedEvent<HTMLButtonElement, KeyboardEvent>
  ) => {
    if (!selectId) return;

    const store = selectStores.get(selectId);
    if (!store) return;

    switch (event.key) {
      case "Enter":
      case "ArrowDown":
      case " ": // Space key
        event.preventDefault();

        // Open the dropdown if it's closed
        if (!store.state.open) {
          if (triggerRef.current) {
            store.actions.setTriggerRect(
              triggerRef.current.getBoundingClientRect()
            );
          }
          store.actions.setOpen(true);

          // Force a re-render of the Content component
          const contentElement = safeQuerySelector(
            selectId,
            "data-select-content-id",
            selectId || ""
          );
          if (contentElement) {
            contentElement.setAttribute("data-open", "true");
          }
        } else if (event.key === "Enter" || event.key === " ") {
          // If dropdown is already open, pressing Enter or Space should close it
          store.actions.setOpen(false);

          // Force a re-render of the Content component
          const contentElement = safeQuerySelector(
            selectId,
            "data-select-content-id",
            selectId || ""
          );
          if (contentElement) {
            contentElement.setAttribute("data-open", "false");
          }
        }
        break;

      case "ArrowUp":
        event.preventDefault();
        // Open the dropdown and focus the last item
        if (!store.state.open) {
          if (triggerRef.current) {
            store.actions.setTriggerRect(
              triggerRef.current.getBoundingClientRect()
            );
          }
          store.actions.setOpen(true);

          // Force a re-render of the Content component
          const contentElement = safeQuerySelector(
            selectId,
            "data-select-content-id",
            selectId || ""
          );
          if (contentElement) {
            contentElement.setAttribute("data-open", "true");

            // Focus the last item after opening
            setTimeout(() => {
              const items = document.querySelectorAll(
                `[data-select-content-id="${selectId}"] [role="option"]`
              );
              if (items.length > 0) {
                const lastIndex = items.length - 1;
                store.actions.setFocusedIndex(lastIndex);
                (items[lastIndex] as HTMLElement).focus();
              }
            }, 100);
          }
        }
        break;

      case "Escape":
        if (store.state.open) {
          event.preventDefault();
          store.actions.setOpen(false);
          // Return focus to trigger
          triggerRef.current?.focus();
        }
        break;

      default:
        break;
    }
  };

  // Get the selected label from the store
  const selectedLabel = selectId
    ? selectStores.get(selectId)?.state.selectedLabel
    : "";
  const isOpen = selectId ? selectStores.get(selectId)?.state.open : false;

  return (
    <button
      ref={triggerRef}
      type="button"
      class={`${styles.trigger} ${className || ""}`}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children || selectedLabel || "Select an option"}
      <span class={styles.icon}>
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}

// Content component
function Content({
  children,
  className,
  selectId = "", // Provide a default empty string to fix type issues
  ...props
}: {
  children: ComponentChildren;
  className?: string;
  selectId?: string;
} & JSX.HTMLAttributes<HTMLDivElement>) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const initialFocusAppliedRef = useRef(false);
  const positionUpdateRef = useRef<number | null>(null);
  // Add refs to track both next and previous focusable elements
  const nextFocusableElementRef = useRef<HTMLElement | null>(null);
  const prevFocusableElementRef = useRef<HTMLElement | null>(null);

  // Store the parent scrollable container reference
  const scrollContainerRef = useRef<Element | null>(null);

  // Get the store for this select instance
  const store = selectId ? selectStores.get(selectId) : null;

  // Reset initial focus flag when dropdown closes
  useEffect(() => {
    if (!isVisible) {
      initialFocusAppliedRef.current = false;
    }
  }, [isVisible, selectId]);

  // Find the next and previous focusable elements in the tab order
  useEffect(() => {
    if (!selectId) return;

    // Find the trigger element
    const triggerElement = document.querySelector(
      `[data-select-id="${selectId}"] button`
    ) as HTMLElement;

    if (!triggerElement) {
      return;
    }

    // Get all focusable elements in the document
    const focusableElements = Array.from(
      document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];

    // Filter out hidden elements and those with display: none
    const visibleFocusableElements = focusableElements.filter((el) => {
      const style = window.getComputedStyle(el);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        el.offsetParent !== null
      );
    });

    // Find the index of the trigger
    const triggerIndex = visibleFocusableElements.indexOf(triggerElement);

    // If found, store the next and previous elements
    if (triggerIndex !== -1) {
      // Store next element (for Tab)
      if (triggerIndex < visibleFocusableElements.length - 1) {
        nextFocusableElementRef.current =
          visibleFocusableElements[triggerIndex + 1];
      } else {
        nextFocusableElementRef.current = null;
      }

      // Store previous element (for Shift+Tab)
      if (triggerIndex > 0) {
        prevFocusableElementRef.current =
          visibleFocusableElements[triggerIndex - 1];
      } else {
        prevFocusableElementRef.current = null;
      }
    } else {
      nextFocusableElementRef.current = null;
      prevFocusableElementRef.current = null;
    }
  }, [selectId, isVisible]); // Also recompute when visibility changes

  // Force a re-render when the open state changes
  useEffect(() => {
    if (!selectId) return;

    const checkOpenState = () => {
      const store = selectStores.get(selectId);
      if (store) {
        const newIsVisible = store.state.open;

        if (newIsVisible !== isVisible) {
          setIsVisible(newIsVisible);
        }
      }
    };

    // Check immediately
    checkOpenState();

    // Set up a mutation observer to detect changes to the data-open attribute
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-open"
        ) {
          checkOpenState();
        }
      });
    });

    // Observe the root element
    const rootElement = document.querySelector(
      `[data-select-id="${selectId}"]`
    );
    if (rootElement) {
      observer.observe(rootElement, { attributes: true });
    }

    // Also observe the content element if it exists
    const contentElement = safeQuerySelector(
      selectId,
      "data-select-content-id",
      selectId
    );
    if (contentElement) {
      observer.observe(contentElement, { attributes: true });
    }

    return () => {
      observer.disconnect();
    };
  }, [selectId, isVisible]);

  // Find parent scrollable container when dropdown opens
  const findScrollableParent = useCallback(
    (element: Element | null): Element | null => {
      if (!element) return null;
      if (element === document.body) return document.body;

      const { overflow, overflowY } = window.getComputedStyle(element);
      const isScrollable = /(auto|scroll)/.test(overflow + overflowY);

      return isScrollable
        ? element
        : findScrollableParent(element.parentElement);
    },
    []
  );

  // Update dropdown position based on trigger position
  const updatePosition = useCallback(() => {
    if (
      !isVisible ||
      !contentRef.current ||
      !selectId ||
      !store?.state.triggerRect
    )
      return;

    // Get the current trigger element to get its latest position
    const triggerElement = document.querySelector(
      `[data-select-id="${selectId}"] button`
    ) as HTMLElement;

    if (!triggerElement) return;

    // Get current position of the trigger
    const currentTriggerRect = triggerElement.getBoundingClientRect();

    // Update dropdown position
    contentRef.current.style.width = `${currentTriggerRect.width}px`;
    contentRef.current.style.left = `${currentTriggerRect.left}px`;
    contentRef.current.style.top = `${currentTriggerRect.bottom + 4}px`;

    // Handle the case where dropdown would go below viewport
    const dropdownHeight = contentRef.current.offsetHeight;
    const viewportHeight = window.innerHeight;

    if (currentTriggerRect.bottom + 4 + dropdownHeight > viewportHeight) {
      // Position above the trigger if it would go below viewport
      contentRef.current.style.top = `${
        currentTriggerRect.top - dropdownHeight - 4
      }px`;
    }
  }, [isVisible, selectId, store?.state.triggerRect]);

  // Position the dropdown based on the trigger's position (initial positioning)
  useEffect(() => {
    if (isVisible && contentRef.current && store?.state.triggerRect) {
      updatePosition();
    }
  }, [isVisible, store?.state.triggerRect, updatePosition]);

  // Handle scroll and resize events to reposition dropdown
  useEffect(() => {
    if (!isVisible || !contentRef.current || !selectId) return;

    // Find the scrollable parent container
    const triggerElement = document.querySelector(
      `[data-select-id="${selectId}"] button`
    ) as HTMLElement;

    if (triggerElement) {
      scrollContainerRef.current = findScrollableParent(triggerElement);
    }

    // Throttle updates with requestAnimationFrame for performance
    const handlePositionUpdate = () => {
      if (positionUpdateRef.current !== null) {
        cancelAnimationFrame(positionUpdateRef.current);
      }

      positionUpdateRef.current = requestAnimationFrame(() => {
        updatePosition();
        positionUpdateRef.current = null;
      });
    };

    // Add event listeners
    window.addEventListener("resize", handlePositionUpdate);
    document.addEventListener("scroll", handlePositionUpdate, true); // Use capture phase

    if (scrollContainerRef.current) {
      scrollContainerRef.current.addEventListener(
        "scroll",
        handlePositionUpdate
      );
    }

    // Create a ResizeObserver to handle parent container resizing
    const resizeObserver = new ResizeObserver(handlePositionUpdate);

    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }

    return () => {
      // Clean up all event listeners
      window.removeEventListener("resize", handlePositionUpdate);
      document.removeEventListener("scroll", handlePositionUpdate, true);

      if (scrollContainerRef.current) {
        scrollContainerRef.current.removeEventListener(
          "scroll",
          handlePositionUpdate
        );
      }

      resizeObserver.disconnect();

      // Cancel any pending animation frame
      if (positionUpdateRef.current !== null) {
        cancelAnimationFrame(positionUpdateRef.current);
        positionUpdateRef.current = null;
      }
    };
  }, [isVisible, selectId, findScrollableParent, updatePosition]);

  // Apply initial focus when dropdown becomes visible
  useEffect(() => {
    if (
      isVisible &&
      contentRef.current &&
      selectId &&
      !initialFocusAppliedRef.current
    ) {
      const store = selectStores.get(selectId);
      if (!store) return;

      // Use a longer timeout to ensure DOM is fully rendered
      const timeoutId = setTimeout(() => {
        if (!contentRef.current) return;

        const items = Array.from(
          contentRef.current.querySelectorAll('[role="option"]')
        ) as HTMLElement[];

        if (items.length > 0) {
          // Find the index of the selected item if any
          let selectedIndex = -1;
          items.forEach((item, index) => {
            if (item.getAttribute("aria-selected") === "true") {
              selectedIndex = index;
            }
          });

          // Focus either the selected item or the first item
          const indexToFocus = selectedIndex >= 0 ? selectedIndex : 0;
          store.actions.setFocusedIndex(indexToFocus);

          // Focus the item
          items[indexToFocus].focus();

          // Mark initial focus as applied
          initialFocusAppliedRef.current = true;
        }
      }, 100); // Increased timeout for more reliability

      return () => clearTimeout(timeoutId);
    }
  }, [isVisible, selectId]);

  // Handle keyboard navigation within the dropdown
  useEffect(() => {
    if (!isVisible || !selectId || !contentRef.current) return;

    const handleKeyDown = (event: Event) => {
      const keyEvent = event as KeyboardEvent;
      const store = selectStores.get(selectId);
      if (!store) return;

      const items = Array.from(
        contentRef.current?.querySelectorAll('[role="option"]') || []
      ) as HTMLElement[];

      if (items.length === 0) return;

      const currentIndex = store.state.focusedIndex;
      let newIndex = currentIndex;

      switch (keyEvent.key) {
        case "ArrowDown":
          event.preventDefault();
          newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          break;

        case "ArrowUp":
          event.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          break;

        case "Home":
          event.preventDefault();
          newIndex = 0;
          break;

        case "End":
          event.preventDefault();
          newIndex = items.length - 1;
          break;

        case "Enter":
        case " ": // Space key
          event.preventDefault();
          if (currentIndex >= 0 && currentIndex < items.length) {
            // Get the value from the item
            const value = items[currentIndex].getAttribute("data-value") || "";
            const itemText = items[currentIndex].textContent || "";

            // Call setValue directly to ensure the dropdown closes
            store.actions.setValue(value, itemText);

            // Return focus to the trigger
            setTimeout(() => {
              const triggerElement = document.querySelector(
                `[data-select-id="${selectId}"] button`
              ) as HTMLElement;
              if (triggerElement) {
                triggerElement.focus();
              }
            }, 10);
          }
          break;

        case "Escape":
          event.preventDefault();
          store.actions.setOpen(false);
          setIsVisible(false);

          // Return focus to the trigger
          const triggerElement = document.querySelector(
            `[data-select-id="${selectId}"] button`
          ) as HTMLElement;
          if (triggerElement) {
            triggerElement.focus();
          }
          break;

        case "Tab":
          // Prevent default to handle our own tab navigation
          event.preventDefault();

          // Close the dropdown
          store.actions.setOpen(false);
          setIsVisible(false);

          // Handle Shift+Tab - focus the previous element
          if (keyEvent.shiftKey) {
            if (prevFocusableElementRef.current) {
              setTimeout(() => {
                prevFocusableElementRef.current?.focus();
              }, 0);
            }
          }
          // Handle regular Tab - focus the next element
          else {
            if (nextFocusableElementRef.current) {
              setTimeout(() => {
                nextFocusableElementRef.current?.focus();
              }, 0);
            }
          }
          break;

        default:
          // Handle type-ahead search
          if (/^[a-z0-9]$/i.test(keyEvent.key)) {
            const char = keyEvent.key.toLowerCase();
            // Find the next item that starts with the pressed character
            const startIndex = (currentIndex + 1) % items.length;
            for (let i = 0; i < items.length; i++) {
              const idx = (startIndex + i) % items.length;
              const text = items[idx].textContent?.toLowerCase() || "";
              if (text.startsWith(char)) {
                newIndex = idx;
                break;
              }
            }
          }
          break;
      }

      // Update focused index if it changed
      if (newIndex !== currentIndex) {
        store.actions.setFocusedIndex(newIndex);
        items[newIndex].focus();
      }
    };

    // Add event listener to the content element
    contentRef.current.addEventListener("keydown", handleKeyDown);

    return () => {
      contentRef.current?.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, selectId]);

  // Close on click outside
  useEffect(() => {
    if (!isVisible || !selectId) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node)
      ) {
        // Get the trigger element
        const triggerElement = document.querySelector(
          `[data-select-id="${selectId}"] button`
        ) as HTMLElement;

        // Check if the click is on the trigger (which has its own handler)
        const isClickOnTrigger =
          triggerElement && triggerElement.contains(event.target as Node);

        // Check if a click on the trigger is being processed
        const triggerRef = (triggerElement as any)?.__preactRef?.current;
        const isProcessingTriggerClick =
          triggerRef?.isProcessingClickRef?.current;

        // Only close if the click is not on the trigger and no trigger click is being processed
        if (!isClickOnTrigger && !isProcessingTriggerClick) {
          const store = selectStores.get(selectId);
          if (store) {
            store.actions.setOpen(false);
            setIsVisible(false);

            // Return focus to the trigger when clicking outside
            if (triggerElement) {
              triggerElement.focus();
            }
          }
        }
      }
    }

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);

    // Add ESC key handler
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const store = selectStores.get(selectId);
        if (store) {
          store.actions.setOpen(false);
          setIsVisible(false);

          // Return focus to the trigger
          const triggerElement = document.querySelector(
            `[data-select-id="${selectId}"] button`
          ) as HTMLElement;
          if (triggerElement) {
            triggerElement.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", handleEscKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isVisible, selectId]);

  if (!isVisible) return null;

  // Clone children with the select ID
  const childrenWithId = Array.isArray(children)
    ? children.map((child) => {
        if (typeof child === "object" && child !== null && "type" in child) {
          return {
            ...child,
            props: {
              ...child.props,
              selectId,
            },
          };
        }
        return child;
      })
    : typeof children === "object" && children !== null && "type" in children
    ? {
        ...children,
        props: {
          ...children.props,
          selectId,
        },
      }
    : children;

  // Use createPortal to render the dropdown at the document body level
  return createPortal(
    <div
      ref={contentRef}
      class={`${styles.content} ${className || ""}`}
      data-select-content-id={selectId}
      role="listbox"
      tabIndex={-1}
      {...props}
    >
      {childrenWithId}
    </div>,
    document.body
  );
}

// Item component
function Item({
  children,
  value,
  className,
  disabled,
  selectId = "", // Provide a default empty string to fix type issues
  ...props
}: {
  children: ComponentChildren;
  value: string;
  className?: string;
  disabled?: boolean;
  selectId?: string;
} & JSX.HTMLAttributes<HTMLDivElement>) {
  // Get the store for this select instance
  const store = selectId ? selectStores.get(selectId) : null;
  const itemRef = useRef<HTMLDivElement>(null);

  const isSelected = store ? store.state.selectedValue === value : false;
  const itemText = typeof children === "string" ? children : "";

  // Update the focused state when the component mounts or updates
  useEffect(() => {
    if (!selectId || !store || !itemRef.current) return;

    // Add focus and blur event listeners instead of using an interval
    const handleFocus = () => {
      itemRef.current?.classList.add(styles.focused);
    };

    const handleBlur = () => {
      itemRef.current?.classList.remove(styles.focused);
    };

    // Add event listeners
    itemRef.current.addEventListener("focus", handleFocus);
    itemRef.current.addEventListener("blur", handleBlur);

    // Clean up
    return () => {
      itemRef.current?.removeEventListener("focus", handleFocus);
      itemRef.current?.removeEventListener("blur", handleBlur);
    };
  }, [selectId, store]);

  const handleClick = () => {
    if (disabled || !store) return;

    // Update the selected value and close the dropdown
    store.actions.setValue(value, itemText);

    // Return focus to the trigger
    setTimeout(() => {
      const triggerElement = document.querySelector(
        `[data-select-id="${selectId}"] button`
      ) as HTMLElement;
      if (triggerElement) {
        triggerElement.focus();
      }
    }, 10);
  };

  return (
    <div
      ref={itemRef}
      class={`${styles.item} ${isSelected ? styles.selected : ""} ${
        disabled ? styles.disabled : ""
      } ${className || ""}`}
      role="option"
      aria-selected={isSelected}
      onClick={handleClick}
      data-value={value}
      tabIndex={-1}
      {...props}
    >
      {children}
      {isSelected && (
        <span class={styles.checkIcon}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 8L7 12L13 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      )}
    </div>
  );
}

// Group component
function Group({
  children,
  className,
  selectId = "", // Provide a default empty string to fix type issues
  ...props
}: {
  children: ComponentChildren;
  className?: string;
  selectId?: string;
} & JSX.HTMLAttributes<HTMLDivElement>) {
  // Clone children with the select ID
  const childrenWithId = Array.isArray(children)
    ? children.map((child) => {
        if (typeof child === "object" && child !== null && "type" in child) {
          return {
            ...child,
            props: {
              ...child.props,
              selectId,
            },
          };
        }
        return child;
      })
    : typeof children === "object" && children !== null && "type" in children
    ? {
        ...children,
        props: {
          ...children.props,
          selectId,
        },
      }
    : children;

  return (
    <div class={`${styles.group} ${className || ""}`} role="group" {...props}>
      {childrenWithId}
    </div>
  );
}

// Label component
function Label({
  children,
  className,
  ...props
}: JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div class={`${styles.label} ${className || ""}`} {...props}>
      {children}
    </div>
  );
}

// Separator component
function Separator(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return <div class={styles.separator} role="separator" {...props} />;
}

// Compose component parts
const Select = {
  Root,
  Trigger,
  Content,
  Item,
  Group,
  Label,
  Separator,
};

export default Select;
